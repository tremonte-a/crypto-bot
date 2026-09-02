import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import { db, schema } from '../db';
import { eq, sql } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import path from 'path';
import { computeIndicators } from '../utils/indicators';
import jwt from 'jsonwebtoken'; // <-- NEW

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: '*' },
});

app.use(cors());
app.use(express.json());

export const latestPrices = new Map<string, number>();
export { io };

// ─── JWT Secret ──────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// ─── Socket.io ──────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('[Socket] Client connected');
  socket.on('subscribe', (botId: string) => {
    socket.join(`bot:${botId}`);
    const price = latestPrices.get(botId);
    if (price) {
      socket.emit('price', { botId, price });
    }
    console.log(`[Socket] Client subscribed to bot ${botId}`);
  });
  socket.on('disconnect', () => {
    console.log('[Socket] Client disconnected');
  });
});

// ─── Helper for raw SQL queries ────────────────────────────────────
async function queryOne(table: string, column: string, value: string) {
  const result = await db.execute(
    sql`SELECT * FROM ${sql.identifier(table)} WHERE ${sql.identifier(column)} = ${value}`
  );
  return result.rows[0] || null;
}

// ─── REST API ──────────────────────────────────────────────────────

// ─── AUTH ──────────────────────────────────────────────────────────────
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return res.status(500).json({ error: 'Admin password not set in environment' });
  }
  if (password === adminPassword) {
    const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({ token });
  }
  res.status(401).json({ error: 'Invalid password' });
});

// ─── Token verification middleware ──────────────────────────────────
function verifyToken(req: Request, res: Response, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ─── CREATE bot (protected) ──────────────────────────────────────────
app.post('/api/bots', verifyToken, async (req: Request, res: Response) => {
  try {
    const { pair, recipe, buyThresholdPct, sellThresholdPct, buyAmount, sellAmount, isActive } = req.body;
    const newBot = await db.insert(schema.bots).values({
      id: uuid(),
      pair,
      recipe,
      buyThresholdPct,
      sellThresholdPct,
      buyAmount,
      sellAmount,
      isActive: isActive ?? false,
    }).returning();
    res.json(newBot[0]);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// ─── LIST all bots (public) ──────────────────────────────────────────
app.get('/api/bots', async (req: Request, res: Response) => {
  const bots = await db.execute(sql`SELECT * FROM bots`);
  res.json(bots.rows);
});

// ─── GET a single bot (public) ──────────────────────────────────────
app.get('/api/bots/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const bot = await queryOne('bots', 'id', id);
    res.json(bot);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// ─── DELETE a bot (protected) ────────────────────────────────────────
app.delete('/api/bots/:id', verifyToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.execute(sql`DELETE FROM bots WHERE id = ${id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// ─── PATCH (update) a bot (protected) ──────────────────────────────
app.patch('/api/bots/:id', verifyToken, async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  console.log('[PATCH] Received body:', JSON.stringify(updates, null, 2));

  try {
    // Use the request body directly – keys match schema properties (camelCase)
    const dbUpdates = { ...updates };
    // Remove any keys that aren't in the schema
    const allowedKeys = [
      'pair', 'recipe', 'buyThresholdPct', 'sellThresholdPct',
      'buyAmount', 'sellAmount', 'maxPosition', 'minQuoteReserve',
      'isActive', 'referencePrice', 'momentumSensitivity', 'maxDynamicShiftPct'
    ];
    for (const key of Object.keys(dbUpdates)) {
      if (!allowedKeys.includes(key)) {
        delete dbUpdates[key];
      }
    }

    if (Object.keys(dbUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Use Drizzle's update builder
    const result = await db.update(schema.bots)
      .set(dbUpdates)
      .where(eq(schema.bots.id, id))
      .returning();

    res.json(result[0] || null);
  } catch (err) {
    console.error('[PATCH] Error:', err);
    res.status(400).json({ error: String(err) });
  }
});

// ─── Trades (public) ──────────────────────────────────────────────────
app.get('/api/trades/:botId', async (req: Request, res: Response) => {
  const { botId } = req.params;
  try {
    const result = await db.execute(
      sql`SELECT * FROM trades WHERE bot_id = ${botId} ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// ─── Balance Snapshots (public) ──────────────────────────────────────
app.get('/api/balance-snapshots/:botId', async (req: Request, res: Response) => {
  const { botId } = req.params;
  try {
    const result = await db.execute(
      sql`SELECT * FROM balance_snapshots WHERE bot_id = ${botId} ORDER BY timestamp DESC LIMIT 20`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// ─── Price Snapshots (public) ──────────────────────────────────────
app.get('/api/price-snapshots/:botId', async (req: Request, res: Response) => {
  const { botId } = req.params;
  const limit = parseInt(req.query.limit as string) || 100;
  try {
    const result = await db.execute(
      sql`SELECT * FROM price_snapshots WHERE bot_id = ${botId} ORDER BY timestamp DESC LIMIT ${limit}`
    );
    res.json(result.rows.reverse());
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// ─── Strategy Advisor (public) ──────────────────────────────────────
app.get('/api/advisor/:botId', async (req, res) => {
  const { botId } = req.params;
  try {
    const result = await db.execute(
      sql`SELECT price, timestamp FROM price_snapshots WHERE bot_id = ${botId} ORDER BY timestamp ASC LIMIT 1000`
    );
    const prices = result.rows.map((row: any) => ({
      price: parseFloat(row.price),
      timestamp: new Date(row.timestamp).getTime(),
    }));
    if (prices.length < 20) {
      return res.status(400).json({ error: 'Not enough price data for analysis (need at least 20 snapshots).' });
    }
    const advisor = computeIndicators(prices);
    res.json(advisor);
  } catch (err) {
    console.error('[Advisor] Error:', err);
    res.status(400).json({ error: String(err) });
  }
});

// ─── NEW: Bot Status (momentum data) ──────────────────────────────────
app.get('/api/bots/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const result = await db
      .select()
      .from(schema.botStatus)
      .where(eq(schema.botStatus.botId, id));
    res.json(result[0] || null);
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// ─── NEW: Bot Stats (win rate, PnL, etc.) ────────────────────────────
app.get('/api/bots/:id/stats', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const allTrades = await db
      .select()
      .from(schema.trades)
      .where(eq(schema.trades.botId, id));

    const buys = allTrades.filter(t => t.side === 'buy');
    const sells = allTrades.filter(t => t.side === 'sell');
    const totalTrades = allTrades.length;
    const winningSells = sells.filter(t => (t.pnl || 0) > 0).length;
    const winRate = sells.length > 0 ? (winningSells / sells.length) * 100 : 0;
    const totalPnl = sells.reduce((acc, t) => acc + (t.pnl || 0), 0);
    const totalVolume = allTrades.reduce((acc, t) => acc + (t.quoteVolume || 0), 0);

    res.json({
      totalTrades,
      buys: buys.length,
      sells: sells.length,
      winningSells,
      winRate,
      totalPnl,
      totalVolume,
    });
  } catch (err) {
    res.status(400).json({ error: String(err) });
  }
});

// ─── Start server (only if this file is run directly) ────────────
const PORT = process.env.PORT || 4000;
if (require.main === module) {
  server.listen(PORT, () => console.log(`[API] Running on port ${PORT} with Socket.io`));
}
import 'dotenv/config';
const KrakenClient = require('kraken-api');

export interface OrderResponse {
  orderId: string;
  txid?: string[];
}

export class KrakenService {
  private client: any;
  public paperMode: boolean;

  constructor() {
    this.paperMode = process.env.PAPER_MODE === 'true';
    if (!this.paperMode) {
      const apiKey = process.env.KRAKEN_API_KEY;
      const apiSecret = process.env.KRAKEN_API_SECRET;
      if (!apiKey || !apiSecret) {
        throw new Error('Kraken API keys missing in .env');
      }
      this.client = new KrakenClient(apiKey, apiSecret);
      console.log('[KrakenService] Live mode – using real Kraken API.');
    } else {
      console.log('[KrakenService] 🧪 PAPER MODE – no real orders.');
    }
  }

  async placeOrder(side: 'buy' | 'sell', pair: string, volume: number, price: number): Promise<OrderResponse> {
    if (this.paperMode) {
      const fakeId = `paper-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      console.log(`[PAPER] ${side.toUpperCase()} ${volume} ${pair} @ ${price} (ID: ${fakeId})`);
      return { orderId: fakeId };
    }
    try {
      const result = await this.client.addOrder(pair, side, 'limit', { price, volume });
      const orderId = result.txid[0];
      return { orderId, txid: result.txid };
    } catch (error) {
      console.error('[KrakenService] Order placement failed:', error);
      throw error;
    }
  }

  async getOrderStatus(orderId: string): Promise<{ status: string; filled: number; price: number; vol: number }> {
    if (this.paperMode) {
      return { status: 'closed', filled: 0, price: 0, vol: 0 };
    }
    try {
      const result = await this.client.queryOrders({ txid: orderId });
      const order = result[orderId];
      if (!order) throw new Error(`Order ${orderId} not found`);
      return {
        status: order.status,
        filled: parseFloat(order.vol_exec),
        price: parseFloat(order.price),
        vol: parseFloat(order.vol),
      };
    } catch (error) {
      console.error(`[KrakenService] Failed to fetch order ${orderId}:`, error);
      throw error;
    }
  }

  async cancelOrder(orderId: string): Promise<void> {
    if (this.paperMode) {
      console.log(`[PAPER] Cancelled order ${orderId}`);
      return;
    }
    try {
      await this.client.cancelOrder(orderId);
    } catch (error) {
      console.error(`[KrakenService] Failed to cancel order ${orderId}:`, error);
      throw error;
    }
  }

  async getBalances(): Promise<Record<string, number>> {
    if (this.paperMode) {
      return { XXBT: 0.01, ZUSD: 1000 };
    }
    try {
      // ✅ CORRECT: use .api('Balance') – not .balance()
      const result = await this.client.api('Balance');
      const balances: Record<string, number> = {};
      for (const [key, val] of Object.entries(result.result)) {
        balances[key] = parseFloat(val as string);
      }
      console.log('[KrakenService] Balances fetched successfully:', Object.keys(balances));
      return balances;
    } catch (error) {
      console.error('[KrakenService] Failed to fetch balances:', error);
      return {};
    }
  }
}
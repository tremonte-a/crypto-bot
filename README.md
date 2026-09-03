# 🤖 Crypto Trading Bot

A fully automated cryptocurrency trading bot with a real‑time dashboard, momentum‑based strategy, and admin controls. Built for Kraken exchange, deployed on Coolify.

🔗 **Live Demo:** [https://cryptobot.tremonte.info/](https://cryptobot.tremonte.info/)

---

## 📦 Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js, Express, TypeScript, Drizzle ORM, PostgreSQL, Socket.io, JWT authentication |
| **Frontend** | React, Tailwind CSS, Chart.js, Axios, React Router |
| **Exchange API** | Kraken REST API (with paper‑trading mode) |
| **Deployment** | Coolify (Docker‑based) |
| **Real‑time** | WebSockets (Socket.io) for live price updates |

---

## ✨ Features

- **Bot Management** – Create, start, stop, and delete bots via the dashboard.
- **Momentum‑Based Strategy** – Dynamic buy/sell thresholds shift with price momentum.
- **Real‑Time Chart** – Live price feed with reference price, buy/sell trigger lines.
- **Admin Authentication** – Password‑protected controls; visitors see read‑only stats.
- **Live Momentum Display** – Shows current momentum, shifts, effective thresholds, and trigger prices.
- **Performance Stats** – Win rate, total PnL, number of trades, volume.
- **Trade History** – Full trade log with buy/sell details.
- **Balance Tracking** – Real‑time balances for the trading pair.
- **Discord Notifications** – Order placement, fills, cancellations, and errors.
- **Paper Trading Mode** – Test without real funds (`PAPER_MODE=true`).

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL (v14+)
- Kraken API keys (for live trading)
- (Optional) Discord webhook URL for notifications

### 1. Clone the repository

```bash
git clone https://github.com/tremonte-a/crypto-bot.git
cd crypto-bot
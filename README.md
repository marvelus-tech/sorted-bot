# SORTED Bot 🤖

**AI-powered pet food management via Telegram**

Never run out of kibble again. SORTED tracks your pet's food, predicts when it runs low, finds the best prices across vendors, and generates affiliate links for one-tap ordering.

## 🚀 Quick Start

```bash
# Clone & install
git clone https://github.com/marvelus-tech/sorted-bot.git
cd sorted-bot
npm install

# Setup database
createdb sorted
cp .env.example .env
# Edit .env with your TELEGRAM_BOT_TOKEN

# Run migrations & start
npx prisma migrate dev --name init
npm run dev
```

Get your bot token from [@BotFather](https://t.me/botfather).

## ✨ Features

- 🐾 **Smart Onboarding** — Set up pet profile in 2 minutes
- 📦 **Inventory Tracking** — Know exactly how much food remains
- 🔮 **AI Predictions** — Predicts depletion before it happens
- 💰 **Price Comparison** — Amazon, Chewy, Petco, Walmart
- 🔗 **Affiliate Links** — One-tap ordering with revenue tracking
- 📱 **Telegram Native** — No app download needed

## 📁 Architecture

```
src/
├── index.ts          # Express server + Telegram bot
├── bot.ts            # Command & message handlers
├── db.ts             # Prisma client
├── types.ts          # TypeScript interfaces
├── utils.ts          # Helpers
└── services/
    ├── onboarding.ts # User setup flow
    ├── inventory.ts  # Food tracking
    ├── prediction.ts # Consumption algorithm
    ├── pricing.ts    # Price comparison (mock MVP)
    ├── affiliate.ts  # Link generation
    └── orders.ts     # Order approval flow
```

## 🛠 Tech Stack

- **Runtime**: Node.js + TypeScript
- **Bot**: node-telegram-bot-api
- **Database**: PostgreSQL + Prisma ORM
- **Server**: Express.js

## 📚 Commands

| Command | Description |
|---------|-------------|
| `/start` | Begin onboarding |
| `/status` | Check food inventory |
| `/order` | Reorder food |
| `/history` | Order history |
| `/addfood` | Add food to inventory |
| `/help` | Show help |

## 🗺 Roadmap

### v1.0 (MVP) ✅
- [x] Telegram bot with onboarding
- [x] Inventory tracking
- [x] Consumption prediction
- [x] Mock price comparison
- [x] Affiliate link generation
- [x] Order approval flow

### v2.0 (Scale)
- [ ] Real price scraping
- [ ] Stripe integration
- [ ] Smart bundling
- [ ] Delivery tracking
- [ ] Family sharing

### v3.0 (Platform)
- [ ] Direct ordering
- [ ] White-label fulfillment
- [ ] Smart feeder integration
- [ ] Vet recommendations

## 📄 License

MIT — Marvelus Tech

---

Built with ❤️ for pet parents everywhere.

# SORTED Bot 🤖

AI-powered pet food management via Telegram. Never run out of kibble again.

## Features

- 🐾 **Pet Onboarding** — Set up your pet's profile (breed, age, weight, activity)
- 📦 **Inventory Tracking** — Track food levels and consumption
- 🔮 **Smart Predictions** — AI predicts when food runs low
- 💰 **Price Comparison** — Finds best deals across Amazon, Chewy, Petco, Walmart
- 🔗 **Affiliate Links** — One-tap ordering with tracked affiliate links
- 📱 **Telegram Native** — No app download needed

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/marvelus-tech/sorted-bot.git
cd sorted-bot
npm install
```

### 2. Setup Database

```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database
createdb sorted

# Setup environment
cp .env.example .env
# Edit .env with your values
```

### 3. Configure Environment

```env
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
DATABASE_URL=postgresql://localhost:5432/sorted
NODE_ENV=development
PORT=3000
```

Get your Telegram bot token from [@BotFather](https://t.me/botfather).

### 4. Run Migrations & Start

```bash
npx prisma migrate dev --name init
npm run dev
```

### 5. Test the Bot

1. Open Telegram, search for your bot
2. Send `/start`
3. Follow the onboarding flow
4. Add food with `/addfood`
5. Check status with `/status`

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Begin onboarding |
| `/status` | Check food inventory |
| `/order` | Reorder food |
| `/history` | Order history |
| `/addfood` | Add food to inventory |
| `/help` | Show help |

## Architecture

```
src/
├── index.ts          # Entry point (Express + Telegram)
├── bot.ts            # Telegram handlers
├── db.ts             # Prisma client
├── types.ts          # TypeScript interfaces
├── utils.ts          # Helpers
└── services/
    ├── onboarding.ts # User setup flow
    ├── inventory.ts  # Food tracking
    ├── prediction.ts # Consumption algorithm
    ├── pricing.ts    # Price comparison (mock MVP)
    ├── affiliate.ts  # Link generation
    └── orders.ts     # Order flow
```

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Bot**: node-telegram-bot-api
- **Database**: PostgreSQL + Prisma ORM
- **Server**: Express.js
- **Hosting**: Railway / Render (see DEPLOY.md)

## Roadmap

### v1.0 (MVP) ✅
- [x] Telegram bot with onboarding
- [x] Inventory tracking
- [x] Consumption prediction
- [x] Mock price comparison
- [x] Affiliate link generation
- [x] Order approval flow

### v2.0 (Scale)
- [ ] Real price scraping (Amazon PA-API, Chewy API)
- [ ] Stripe integration for Autopilot plan
- [ ] Smart bundling
- [ ] Delivery tracking
- [ ] Family sharing

### v3.0 (Platform)
- [ ] Direct ordering via vendor APIs
- [ ] White-label fulfillment
- [ ] Smart feeder integration
- [ ] Vet recommendations
- [ ] Insurance partnerships

## License

MIT — Marvelus Tech

## Support

- Telegram: [@sortedbot](https://t.me/sortedbot)
- Email: support@sorted.pet

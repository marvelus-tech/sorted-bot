# SORTED Bot — Deployment Guide

## Quick Deploy (Railway)

### 1. Setup Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway init
```

### 2. Add Database

```bash
# Add PostgreSQL
railway add --database postgresql

# Get database URL
railway variables
```

### 3. Configure Environment

```bash
railway variables set TELEGRAM_BOT_TOKEN=your_token
railway variables set NODE_ENV=production
railway variables set PORT=3000
```

### 4. Deploy

```bash
railway up
```

### 5. Set Webhook (Production)

```bash
# Get deployment URL
railway domain

# Set webhook
curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
  -d "url=https://your-domain.railway.app/webhook"
```

---

## Deploy to Render

### 1. Create Web Service

1. Go to [render.com](https://render.com)
2. New → Web Service
3. Connect your GitHub repo

### 2. Configure

```yaml
# render.yaml
services:
  - type: web
    name: sorted-bot
    env: node
    buildCommand: npm install && npx prisma generate && npm run build
    startCommand: npx prisma migrate deploy && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: TELEGRAM_BOT_TOKEN
        sync: false
      - key: DATABASE_URL
        fromDatabase:
          name: sorted-db
          property: connectionString

databases:
  - name: sorted-db
    plan: free
```

### 3. Add Environment Variables

In Render dashboard:
- `TELEGRAM_BOT_TOKEN`
- `DATABASE_URL` (auto-filled from PostgreSQL)

### 4. Deploy

Push to GitHub → Auto-deploys on Render

---

## Deploy to Fly.io

```bash
# Install flyctl
brew install flyctl

# Launch
fly launch

# Add PostgreSQL
fly postgres create --name sorted-db

# Set secrets
fly secrets set TELEGRAM_BOT_TOKEN=xxx

# Deploy
fly deploy
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | ✅ | From @BotFather |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NODE_ENV` | ✅ | `development` or `production` |
| `PORT` | ✅ | Server port (3000) |
| `WEBHOOK_URL` | ❌ | For production webhook mode |
| `STRIPE_SECRET_KEY` | ❌ | For v2 payments |

---

## Database Setup

```bash
# Local development
brew install postgresql
brew services start postgresql
createdb sorted

# Production (Railway/Render)
# Database is auto-provisioned

# Run migrations
npx prisma migrate deploy
```

---

## Monitoring

### Health Check
```bash
curl https://your-domain.com/health
```

### Logs
```bash
# Railway
railway logs

# Render
# View in dashboard

# Fly.io
fly logs
```

---

## Scaling

### Railway
- Upgrade to Pro plan
- Add Redis for caching
- Enable auto-scaling

### Render
- Upgrade to Standard plan
- Add Redis instance
- Enable auto-deploy

---

## Troubleshooting

### Bot not responding
1. Check `TELEGRAM_BOT_TOKEN` is correct
2. Verify webhook URL is set (production)
3. Check logs: `railway logs`

### Database errors
1. Verify `DATABASE_URL` format
2. Run migrations: `npx prisma migrate deploy`
3. Check connection: `npx prisma db pull`

### Webhook issues
1. Ensure HTTPS URL
2. Check webhook is set: `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
3. Verify port is correct

---

*Deploy early, deploy often. 🚀*

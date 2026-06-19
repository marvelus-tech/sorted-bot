# SORTED Bot — Multi-User Isolation Architecture

## How It Already Works (Current Implementation)

### User Isolation by Design

```
Telegram Message
    │
    ├── msg.from.id → telegramId (unique per user)
    ├── msg.chat.id → chatId (1:1 with user for DMs)
    └── msg.from.username → display name
```

**Every database query is scoped to the user's `telegramId`:**

```typescript
// bot.ts — findOrCreateUser()
const telegramId = msg.from?.id.toString();  // "47930691"

// All queries use this ID
prisma.user.findUnique({ where: { telegramId } })
prisma.pet.findMany({ where: { userId: user.id } })
prisma.order.findMany({ where: { userId: user.id } })
```

### Data Model Isolation

```prisma
model User {
  id          String   @id @default(uuid())
  telegramId  String   @unique  // ← ISOLATION KEY
  name        String
  pets        Pet[]             // ← Only THIS user's pets
  orders      Order[]           // ← Only THIS user's orders
  plan        String
}

model Pet {
  id      String @id @default(uuid())
  userId  String        // ← Foreign key to User
  user    User @relation(fields: [userId], references: [id])
  inventory InventoryItem[]
  orders  Order[]
}
```

**Result**: User A can NEVER see User B's pets, orders, or inventory.

---

## Current State Management (In-Memory)

### Problem: Not Scalable

```typescript
// onboarding.ts — CURRENT (single server)
const onboardingSessions = new Map<number, OnboardingState>();
// Key: chatId (e.g., 47930691)
// Value: { step: 'breed', data: {...} }
```

**Issues:**
1. **Server restart = lost state** — User mid-onboarding loses progress
2. **Multiple servers = broken state** — Horizontal scaling impossible
3. **No persistence** — Can't resume after timeout

---

## Production Solution: Redis + Database State

### Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Telegram   │────→│   SORTED    │────→│   Redis     │
│   User A    │     │   Bot API   │     │   (State)   │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  PostgreSQL │
                    │  (Data)     │
                    └─────────────┘
```

### Implementation

```typescript
// services/state.ts — NEW
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export async function getState<T>(telegramId: string): Promise<T | null> {
  const key = `sorted:state:${telegramId}`;
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
}

export async function setState<T>(telegramId: string, state: T, ttl: number = 3600): Promise<void> {
  const key = `sorted:state:${telegramId}`;
  await redis.setex(key, ttl, JSON.stringify(state));
}

export async function clearState(telegramId: string): Promise<void> {
  await redis.del(`sorted:state:${telegramId}`);
}
```

### Updated Onboarding

```typescript
// services/onboarding.ts — REFACTORED
export async function handleStart(bot: TelegramBot, msg: Message): Promise<void> {
  const telegramId = msg.from!.id.toString();
  
  // Check if user exists in DB
  const existingUser = await prisma.user.findUnique({
    where: { telegramId },
    include: { pets: true }
  });

  if (existingUser?.pets.length > 0) {
    await bot.sendMessage(msg.chat.id, `Welcome back, ${existingUser.name}!`);
    return;
  }

  // Store state in Redis (not memory)
  await setState(telegramId, {
    step: 'name',
    data: {}
  });

  await bot.sendMessage(msg.chat.id, "Welcome! What's your name?");
}

export async function handleOnboardingResponse(
  bot: TelegramBot, 
  msg: Message
): Promise<boolean> {
  const telegramId = msg.from!.id.toString();
  const state = await getState<OnboardingState>(telegramId);
  
  if (!state) return false;

  // ... process response ...
  
  // Update state in Redis
  await setState(telegramId, newState);
  
  return true;
}
```

---

## Conversation Context Isolation

### Per-User Message History

```typescript
// services/conversation.ts — NEW
interface ConversationContext {
  messages: Array<{
    role: 'user' | 'bot';
    text: string;
    timestamp: Date;
  }>;
  lastIntent?: string;
  pendingAction?: string;
}

export async function getContext(telegramId: string): Promise<ConversationContext> {
  const key = `sorted:context:${telegramId}`;
  const data = await redis.get(key);
  
  if (data) {
    return JSON.parse(data);
  }
  
  // Load from database history
  const recentOrders = await prisma.order.findMany({
    where: { userId: telegramId },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  return { messages: [] };
}

export async function addToContext(
  telegramId: string, 
  role: 'user' | 'bot', 
  text: string
): Promise<void> {
  const context = await getContext(telegramId);
  context.messages.push({ role, text, timestamp: new Date() });
  
  // Keep only last 20 messages
  if (context.messages.length > 20) {
    context.messages = context.messages.slice(-20);
  }
  
  await redis.setex(
    `sorted:context:${telegramId}`,
    86400, // 24 hours
    JSON.stringify(context)
  );
}
```

---

## Rate Limiting & Abuse Prevention

### Per-User Rate Limits

```typescript
// middleware/rateLimit.ts — NEW
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

interface RateLimitConfig {
  commands: number;    // Commands per minute
  messages: number;    // Messages per minute
  orders: number;      // Orders per hour
}

const LIMITS: Record<string, RateLimitConfig> = {
  starter: { commands: 30, messages: 60, orders: 5 },
  autopilot: { commands: 60, messages: 120, orders: 20 },
  'multi-pet': { commands: 100, messages: 200, orders: 50 }
};

export async function checkRateLimit(
  telegramId: string,
  action: 'command' | 'message' | 'order'
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const user = await prisma.user.findUnique({ where: { telegramId } });
  const plan = user?.plan || 'starter';
  const limit = LIMITS[plan][`${action}s`];
  
  const key = `sorted:ratelimit:${telegramId}:${action}`;
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, action === 'order' ? 3600 : 60);
  }
  
  const allowed = current <= limit;
  const ttl = await redis.ttl(key);
  
  return {
    allowed,
    remaining: Math.max(0, limit - current),
    resetAt: new Date(Date.now() + ttl * 1000)
  };
}
```

---

## Multi-Server Deployment

### Load Balancer Setup

```yaml
# docker-compose.yml — Production
tversion: '3.8'

services:
  bot-api-1:
    build: .
    environment:
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
      - PORT=3000
    depends_on:
      - postgres
      - redis

  bot-api-2:
    build: .
    environment:
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379
      - PORT=3000
    depends_on:
      - postgres
      - redis

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=sorted
      - POSTGRES_USER=sorted
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - bot-api-1
      - bot-api-2

volumes:
  redis-data:
  postgres-data:
```

### Nginx Config

```nginx
# nginx.conf
upstream bot_api {
    least_conn;
    server bot-api-1:3000;
    server bot-api-2:3000;
}

server {
    listen 80;
    
    location /webhook {
        proxy_pass http://bot_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /health {
        proxy_pass http://bot_api;
    }
}
```

---

## Webhook vs Polling (Production)

### Webhook Mode (Recommended)

```typescript
// index.ts — Webhook mode
const bot = setupBot(token);

// Production: Use webhook
if (process.env.NODE_ENV === 'production') {
  const webhookUrl = process.env.WEBHOOK_URL!;
  
  // Set webhook with Telegram
  await bot.setWebHook(`${webhookUrl}/webhook`, {
    allowed_updates: ['message', 'callback_query']
  });
  
  // Express handles webhook
  app.post('/webhook', (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
  });
} else {
  // Development: Use polling
  bot.startPolling();
}
```

**Benefits of Webhooks:**
- ✅ Instant message delivery
- ✅ No open connections (serverless-friendly)
- ✅ Works with load balancers
- ✅ Scales horizontally

---

## Summary: Isolation Levels

| Layer | Mechanism | Isolation |
|-------|-----------|-----------|
| **Telegram** | `msg.from.id` | Unique per user |
| **Database** | Foreign keys | User-scoped queries |
| **State** | Redis keys | `sorted:state:${telegramId}` |
| **Context** | Redis keys | `sorted:context:${telegramId}` |
| **Rate Limit** | Redis counters | Per-user, per-action |
| **Server** | Stateless | Any server can handle any user |

---

## Action Items

### Immediate (MVP)
- [x] Database isolation via `telegramId` ✅
- [x] Per-user queries ✅

### Before Scaling
- [ ] Add Redis for state management
- [ ] Add Redis for conversation context
- [ ] Implement rate limiting
- [ ] Switch to webhook mode
- [ ] Add health checks

### Production
- [ ] Multi-server deployment
- [ ] Load balancer
- [ ] Database read replicas
- [ ] Redis cluster

---

*Current code is safe for multiple users. Redis upgrade needed before horizontal scaling.*

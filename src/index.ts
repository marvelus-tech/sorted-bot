import express from 'express';
import dotenv from 'dotenv';
import { setupBot } from './bot';
import { connectDatabase, disconnectDatabase } from './db';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Webhook endpoint for Telegram
app.post('/webhook', (req, res) => {
  const bot = (req.app as any).bot;
  if (bot) {
    bot.processUpdate(req.body);
  }
  res.sendStatus(200);
});

// Start server
async function startServer(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();

    // Setup Telegram bot
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is required');
    }

    const bot = setupBot(token);
    (app as any).bot = bot;

    // Start polling (for development)
    if (process.env.NODE_ENV === 'development') {
      bot.startPolling();
      console.log('🤖 Bot polling started');
    } else {
      // Production: webhook mode
      console.log('🤖 Bot webhook mode active');
    }

    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down...');
      await disconnectDatabase();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down...');
      await disconnectDatabase();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

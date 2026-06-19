import express from 'express';
import dotenv from 'dotenv';
import { setupBot } from './bot';
import { connectDatabase, disconnectDatabase, isDatabaseConnected } from './db';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  const dbConnected = await isDatabaseConnected();
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: dbConnected ? 'connected' : 'disconnected'
  });
});

// Webhook endpoint for Telegram - process immediately, respond quickly
app.post('/webhook', async (req, res) => {
  // Always respond 200 OK to Telegram immediately
  res.sendStatus(200);
  
  const bot = (req.app as any).bot;
  if (bot) {
    try {
      // Process update asynchronously after responding
      bot.processUpdate(req.body);
    } catch (error) {
      console.error('Error processing webhook:', error);
    }
  }
});

// Start server
async function startServer(): Promise<void> {
  try {
    // Connect to database (don't fail if DB is not available)
    const dbConnected = await connectDatabase();
    if (!dbConnected) {
      console.warn('⚠️ Running without database - some features may not work');
    }

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

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });

    // Setup webhook in production
    if (process.env.NODE_ENV !== 'development') {
      const webhookUrl = process.env.WEBHOOK_URL || `https://${process.env.RENDER_EXTERNAL_HOSTNAME}/webhook`;
      if (webhookUrl) {
        try {
          await bot.setWebHook(webhookUrl);
          console.log(`🔗 Webhook set to: ${webhookUrl}`);
        } catch (error) {
          console.error('Failed to set webhook:', error);
        }
      }
    }

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

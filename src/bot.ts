import TelegramBot from 'node-telegram-bot-api';
import {
  handleStart,
  handleOnboardingResponse,
  handleOnboardingCallback,
  getOnboardingState
} from './services/onboarding';
import { getInventoryStatus, addFood } from './services/inventory';
import { createOrder, handleOrderCallback, confirmOrder, getOrderHistory } from './services/orders';
import prisma from './db';

export function setupBot(token: string): TelegramBot {
  const bot = new TelegramBot(token, { webHook: false });

  // Command handlers
  bot.onText(/\/start/, async (msg) => {
    await handleStart(bot, msg);
  });

  bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await findOrCreateUser(msg);
    if (user) {
      await getInventoryStatus(bot, chatId, user.id);
    }
  });

  bot.onText(/\/order/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await findOrCreateUser(msg);
    if (!user) {
      await bot.sendMessage(chatId, 'Please use /start to set up your account first.');
      return;
    }

    const pet = await prisma.pet.findFirst({ where: { userId: user.id } });
    if (!pet) {
      await bot.sendMessage(chatId, 'No pets found. Use /start to add a pet.');
      return;
    }

    await createOrder(bot, chatId, user.id, pet.id);
  });

  bot.onText(/\/history/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await findOrCreateUser(msg);
    if (user) {
      await getOrderHistory(bot, chatId, user.id);
    }
  });

  bot.onText(/\/addfood/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId,
      'To add food, send me a message like:\n' +
      '"I bought a 15kg bag of Blue Buffalo Adult Chicken"\n\n' +
      'Or use the format: /addfood [brand] [product] [weight]'
    );
  });

  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    await bot.sendMessage(chatId,
      '🐾 *SORTED Bot Commands*\n\n' +
      '/start - Set up your pet\n' +
      '/status - Check food levels\n' +
      '/order - Reorder food\n' +
      '/history - Order history\n' +
      '/addfood - Add food to inventory\n' +
      '/settings - Preferences (coming soon)\n' +
      '/help - Show this help\n\n' +
      'Just chat with me naturally too! I understand things like:\n' +
      '"Max is almost out of food"\n' +
      '"I bought a new bag of kibble"',
      { parse_mode: 'Markdown' }
    );
  });

  // Handle text messages (onboarding + natural language)
  bot.on('message', async (msg) => {
    if (!msg.text || msg.text.startsWith('/')) return;

    const chatId = msg.chat.id;

    // Check if in onboarding
    const onboardingState = getOnboardingState(chatId);
    if (onboardingState) {
      const handled = await handleOnboardingResponse(bot, msg);
      if (handled) return;
    }

    // Natural language processing (simplified for MVP)
    const text = msg.text.toLowerCase();
    const user = await findOrCreateUser(msg);

    if (!user) {
      await bot.sendMessage(chatId, 'Please use /start to set up your account first.');
      return;
    }

    // Simple keyword matching
    if (text.includes('out of food') || text.includes('running low') || text.includes('almost empty')) {
      const pet = await prisma.pet.findFirst({ where: { userId: user.id } });
      if (pet) {
        await createOrder(bot, chatId, user.id, pet.id);
      }
    } else if (text.includes('bought') || text.includes('new bag') || text.includes('purchased')) {
      // Extract food info from message (simplified)
      await bot.sendMessage(chatId,
        'Great! I\'ll track that. Use /status to see updated inventory.'
      );
    } else {
      await bot.sendMessage(chatId,
        'I\'m not sure what you mean. Try:\n' +
        '/status - Check food levels\n' +
        '/order - Reorder food\n' +
        '/help - See all commands'
      );
    }
  });

  // Handle callback queries (inline buttons)
  bot.on('callback_query', async (query) => {
    const data = query.data || '';

    if (data.startsWith('pet_type:') || data.startsWith('breed:') || 
        data.startsWith('activity:') || data.startsWith('brand:') || 
        data === 'brands:done') {
      await handleOnboardingCallback(bot, query);
    } else if (data.startsWith('approve:') || data.startsWith('modify:') || 
               data.startsWith('snooze:') || data.startsWith('cancel:') ||
               data.startsWith('switch_vendor:')) {
      await handleOrderCallback(bot, query);
    }
  });

  return bot;
}

async function findOrCreateUser(msg: TelegramBot.Message) {
  const telegramId = msg.from?.id.toString();
  if (!telegramId) return null;

  let user = await prisma.user.findUnique({
    where: { telegramId },
    include: { pets: true }
  });

  if (!user) {
    // Auto-create user if not exists (for existing users migrating)
    const username = msg.from?.username || msg.from?.first_name || 'User';
    user = await prisma.user.create({
      data: {
        telegramId,
        name: username,
        plan: 'starter'
      },
      include: { pets: true }
    });
  }

  return user;
}

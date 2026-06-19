import TelegramBot from 'node-telegram-bot-api';
import prisma from '../db';
import { OnboardingState } from '../types';
import { COMMON_BRANDS, DOG_BREEDS, CAT_BREEDS } from '../utils';

const onboardingSessions = new Map<number, OnboardingState>();

export function getOnboardingState(chatId: number): OnboardingState | undefined {
  return onboardingSessions.get(chatId);
}

export function clearOnboardingState(chatId: number): void {
  onboardingSessions.delete(chatId);
}

export async function handleStart(bot: TelegramBot, msg: TelegramBot.Message): Promise<void> {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString() || chatId.toString();

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { telegramId },
    include: { pets: true }
  });

  if (existingUser && existingUser.pets.length > 0) {
    await bot.sendMessage(chatId, 
      `👋 Welcome back, ${existingUser.name}!\n\n` +
      `Use /status to check your pet's food levels or /order to reorder.`
    );
    return;
  }

  // Start onboarding
  onboardingSessions.set(chatId, {
    step: 'name',
    data: {}
  });

  await bot.sendMessage(chatId,
    `🐾 Welcome to SORTED!\n\n` +
    `I'm your AI pet food assistant. I'll track your pet's food, ` +
    `predict when it runs low, and find the best deals.\n\n` +
    `Let's get started! What's your name?`
  );
}

export async function handleOnboardingResponse(
  bot: TelegramBot, 
  msg: TelegramBot.Message
): Promise<boolean> {
  const chatId = msg.chat.id;
  const state = onboardingSessions.get(chatId);
  
  if (!state) return false;

  const text = msg.text?.trim() || '';
  const telegramId = msg.from?.id.toString() || chatId.toString();

  switch (state.step) {
    case 'name':
      state.data.name = text;
      state.step = 'pet_name';
      await bot.sendMessage(chatId, `Nice to meet you, ${text}! What's your pet's name?`);
      return true;

    case 'pet_name':
      state.data.petName = text;
      state.step = 'pet_type';
      await bot.sendMessage(chatId, 
        `What type of pet is ${text}?`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🐕 Dog', callback_data: 'pet_type:dog' }],
              [{ text: '🐈 Cat', callback_data: 'pet_type:cat' }]
            ]
          }
        }
      );
      return true;

    case 'breed':
      state.data.breed = text;
      state.step = 'age';
      await bot.sendMessage(chatId, 
        `How old is ${state.data.petName}? (in months, e.g., "18" for 1.5 years)`
      );
      return true;

    case 'age':
      const age = parseInt(text);
      if (isNaN(age) || age < 0 || age > 360) {
        await bot.sendMessage(chatId, 'Please enter a valid age in months (0-360):');
        return true;
      }
      state.data.age = age;
      state.step = 'weight';
      await bot.sendMessage(chatId, 
        `What is ${state.data.petName}'s weight? (in kg, e.g., "25")`
      );
      return true;

    case 'weight':
      const weight = parseFloat(text);
      if (isNaN(weight) || weight < 0.5 || weight > 150) {
        await bot.sendMessage(chatId, 'Please enter a valid weight in kg (0.5-150):');
        return true;
      }
      state.data.weight = weight;
      state.step = 'activity';
      await bot.sendMessage(chatId, 
        `How active is ${state.data.petName}?`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🛋️ Low (couch potato)', callback_data: 'activity:low' }],
              [{ text: '🚶 Moderate (daily walks)', callback_data: 'activity:moderate' }],
              [{ text: '🏃 High (very active)', callback_data: 'activity:high' }]
            ]
          }
        }
      );
      return true;

    case 'brands':
      const brands = text.split(',').map(b => b.trim()).filter(b => b.length > 0);
      state.data.preferredBrands = brands;
      state.step = 'complete';
      
      // Save user and pet to database
      await completeOnboarding(bot, chatId, telegramId, state);
      return true;

    default:
      return false;
  }
}

export async function handleOnboardingCallback(
  bot: TelegramBot,
  query: TelegramBot.CallbackQuery
): Promise<void> {
  const chatId = query.message?.chat.id;
  if (!chatId) return;

  const state = onboardingSessions.get(chatId);
  if (!state) return;

  const data = query.data || '';
  await bot.answerCallbackQuery(query.id);

  if (data.startsWith('pet_type:')) {
    state.data.petType = data.split(':')[1] as 'dog' | 'cat';
    state.step = 'breed';
    
    const breeds = state.data.petType === 'dog' ? DOG_BREEDS : CAT_BREEDS;
    const keyboard = breeds.map(breed => [{ text: breed, callback_data: `breed:${breed}` }]);
    
    await bot.sendMessage(chatId, 
      `What breed is ${state.data.petName}?`,
      { reply_markup: { inline_keyboard: keyboard } }
    );
  } else if (data.startsWith('breed:')) {
    state.data.breed = data.split(':')[1];
    state.step = 'age';
    await bot.sendMessage(chatId, 
      `How old is ${state.data.petName}? (in months, e.g., "18" for 1.5 years)`
    );
  } else if (data.startsWith('activity:')) {
    state.data.activityLevel = data.split(':')[1] as 'low' | 'moderate' | 'high';
    state.step = 'brands';
    
    const brandButtons = COMMON_BRANDS.slice(0, 10).map(brand => 
      [{ text: brand, callback_data: `brand:${brand}` }]
    );
    brandButtons.push([{ text: '✅ Done selecting', callback_data: 'brands:done' }]);
    
    await bot.sendMessage(chatId,
      `Select your preferred brands (tap multiple, then Done):\n\n` +
      `Or type brand names separated by commas.`,
      { reply_markup: { inline_keyboard: brandButtons } }
    );
  } else if (data.startsWith('brand:')) {
    const brand = data.split(':')[1];
    if (!state.data.preferredBrands) state.data.preferredBrands = [];
    if (!state.data.preferredBrands.includes(brand)) {
      state.data.preferredBrands.push(brand);
    }
    await bot.sendMessage(chatId, `✅ Added ${brand}. Select more or type Done.`);
  } else if (data === 'brands:done') {
    state.step = 'complete';
    const telegramId = query.from.id.toString();
    await completeOnboarding(bot, chatId, telegramId, state);
  }
}

async function completeOnboarding(
  bot: TelegramBot,
  chatId: number,
  telegramId: string,
  state: OnboardingState
): Promise<void> {
  try {
    // Create user
    const user = await prisma.user.create({
      data: {
        telegramId,
        name: state.data.name!,
        plan: 'starter'
      }
    });

    // Create pet
    const pet = await prisma.pet.create({
      data: {
        userId: user.id,
        name: state.data.petName!,
        type: state.data.petType!,
        breed: state.data.breed!,
        age: state.data.age!,
        weight: state.data.weight!,
        activityLevel: state.data.activityLevel!,
        preferredBrands: state.data.preferredBrands || []
      }
    });

    // Clear onboarding state
    onboardingSessions.delete(chatId);

    await bot.sendMessage(chatId,
      `🎉 All set up!\n\n` +
      `*${pet.name}* is now being tracked.\n` +
      `Breed: ${pet.breed}\n` +
      `Age: ${pet.age} months\n` +
      `Weight: ${pet.weight}kg\n\n` +
      `Next steps:\n` +
      `1. Add current food with /addfood\n` +
      `2. Check status with /status\n\n` +
      `I'll alert you when food is running low!`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Onboarding error:', error);
    await bot.sendMessage(chatId, 
      '❌ Something went wrong. Please try /start again.'
    );
  }
}

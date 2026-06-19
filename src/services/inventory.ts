import TelegramBot from 'node-telegram-bot-api';
import prisma from '../db';
import { calculateDailyConsumption, calculateDaysRemaining } from './prediction';

export async function addFood(
  bot: TelegramBot,
  chatId: number,
  petId: string,
  productName: string,
  brand: string,
  variant: string,
  totalWeight: number // in grams
): Promise<void> {
  try {
    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) {
      await bot.sendMessage(chatId, '❌ Pet not found. Use /start to set up.');
      return;
    }

    const dailyConsumption = calculateDailyConsumption(pet);
    const daysRemaining = calculateDaysRemaining(totalWeight, dailyConsumption);

    // Create or update inventory item
    await prisma.inventoryItem.upsert({
      where: { id: `${petId}_current` }, // simplified: one active item per pet
      create: {
        id: `${petId}_current`,
        petId,
        productName,
        brand,
        variant,
        totalWeight,
        remainingWeight: totalWeight,
        dailyConsumption,
        reorderThreshold: 7
      },
      update: {
        productName,
        brand,
        variant,
        totalWeight,
        remainingWeight: totalWeight,
        dailyConsumption,
        lastUpdated: new Date()
      }
    });

    await bot.sendMessage(chatId,
      `✅ Added to inventory!\n\n` +
      `*${productName}*\n` +
      `Brand: ${brand}\n` +
      `Size: ${variant}\n` +
      `Daily consumption: ${dailyConsumption}g\n` +
      `Estimated to last: ${daysRemaining} days`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Add food error:', error);
    await bot.sendMessage(chatId, '❌ Failed to add food. Please try again.');
  }
}

export async function getInventoryStatus(
  bot: TelegramBot,
  chatId: number,
  userId: string
): Promise<void> {
  try {
    const pets = await prisma.pet.findMany({
      where: { userId },
      include: { inventory: true }
    });

    if (pets.length === 0) {
      await bot.sendMessage(chatId, 
        'No pets found. Use /start to set up your pet.'
      );
      return;
    }

    let message = '📦 *Inventory Status*\n\n';

    for (const pet of pets) {
      const item = pet.inventory[0];
      if (!item) {
        message += `*${pet.name}*\n❌ No food tracked\n\n`;
        continue;
      }

      const daysRemaining = calculateDaysRemaining(item.remainingWeight, item.dailyConsumption);
      const status = daysRemaining <= 7 ? '⚠️' : daysRemaining <= 14 ? '⚡' : '✅';

      message += `${status} *${pet.name}*\n`;
      message += `   ${item.productName}\n`;
      message += `   Remaining: ${item.remainingWeight}g (${daysRemaining} days)\n\n`;
    }

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Status error:', error);
    await bot.sendMessage(chatId, '❌ Failed to get status. Please try again.');
  }
}

export async function updateInventoryAfterOrder(
  petId: string,
  orderAmount: number
): Promise<void> {
  const item = await prisma.inventoryItem.findFirst({
    where: { petId }
  });

  if (item) {
    await prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        remainingWeight: item.remainingWeight + orderAmount,
        lastUpdated: new Date()
      }
    });
  }
}

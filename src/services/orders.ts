import TelegramBot from 'node-telegram-bot-api';
import prisma from '../db';
import { checkPrices, findBestDeal, formatPriceComparison } from './pricing';
import { generateAffiliateLink, trackClick, getVendorDisplayName } from './affiliate';
import { calculateDaysRemaining } from './prediction';
import { updateInventoryAfterOrder } from './inventory';

// Store pending orders in memory (use Redis in production)
const pendingOrders = new Map<string, {
  petId: string;
  userId: string;
  vendor: string;
  productName: string;
  price: number;
  affiliateUrl: string;
}>();

export async function createOrder(
  bot: TelegramBot,
  chatId: number,
  userId: string,
  petId: string
): Promise<void> {
  try {
    const pet = await prisma.pet.findUnique({
      where: { id: petId },
      include: { inventory: true }
    });

    if (!pet) {
      await bot.sendMessage(chatId, '❌ Pet not found.');
      return;
    }

    const item = pet.inventory[0];
    if (!item) {
      await bot.sendMessage(chatId, 
        `❌ No food tracked for ${pet.name}. Use /addfood first.`
      );
      return;
    }

    // Check prices
    const prices = await checkPrices(item.productName);
    const bestDeal = findBestDeal(prices);

    // Generate affiliate link
    const affiliateUrl = generateAffiliateLink(bestDeal.vendor, bestDeal.url, bestDeal.productName);

    // Create pending order
    const orderId = `order_${Date.now()}_${chatId}`;
    pendingOrders.set(orderId, {
      petId,
      userId,
      vendor: bestDeal.vendor,
      productName: bestDeal.productName,
      price: bestDeal.totalPrice,
      affiliateUrl
    });

    const daysRemaining = calculateDaysRemaining(item.remainingWeight, item.dailyConsumption);

    let message = `🛒 *Reorder Alert*\n\n`;
    message += `*${pet.name}* has ~${daysRemaining} days of food left.\n\n`;
    message += `*Best Deal Found:*\n`;
    message += `${getVendorDisplayName(bestDeal.vendor)}: $${(bestDeal.totalPrice/100).toFixed(2)}\n`;
    message += `Delivery: ${bestDeal.estimatedDelivery}\n\n`;
    message += formatPriceComparison(prices, bestDeal);

    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Approve Order', callback_data: `approve:${orderId}` },
            { text: '✎ Modify', callback_data: `modify:${orderId}` }
          ],
          [
            { text: '⏰ Snooze 3 days', callback_data: `snooze:${orderId}:3` },
            { text: '❌ Cancel', callback_data: `cancel:${orderId}` }
          ]
        ]
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    await bot.sendMessage(chatId, '❌ Failed to create order. Please try again.');
  }
}

export async function handleOrderCallback(
  bot: TelegramBot,
  query: TelegramBot.CallbackQuery
): Promise<void> {
  const chatId = query.message?.chat.id;
  if (!chatId) return;

  const data = query.data || '';
  await bot.answerCallbackQuery(query.id);

  if (data.startsWith('approve:')) {
    const orderId = data.split(':')[1];
    await approveOrder(bot, chatId, orderId, query.from.id.toString());
  } else if (data.startsWith('modify:')) {
    const orderId = data.split(':')[1];
    await modifyOrder(bot, chatId, orderId);
  } else if (data.startsWith('snooze:')) {
    const parts = data.split(':');
    const orderId = parts[1];
    const days = parseInt(parts[2]);
    await snoozeOrder(bot, chatId, orderId, days);
  } else if (data.startsWith('cancel:')) {
    const orderId = data.split(':')[1];
    await cancelOrder(bot, chatId, orderId);
  }
}

async function approveOrder(
  bot: TelegramBot,
  chatId: number,
  orderId: string,
  userId: string
): Promise<void> {
  const pending = pendingOrders.get(orderId);
  if (!pending) {
    await bot.sendMessage(chatId, '❌ Order expired. Please create a new order.');
    return;
  }

  try {
    // Save order to database
    const order = await prisma.order.create({
      data: {
        userId: pending.userId,
        petId: pending.petId,
        status: 'approved',
        vendor: pending.vendor,
        totalAmount: pending.price,
        affiliateUrl: pending.affiliateUrl,
        items: [{
          productName: pending.productName,
          brand: '',
          quantity: 1,
          unitPrice: pending.price,
          totalPrice: pending.price
        }]
      }
    });

    // Track click
    trackClick(pending.userId, order.id, pending.vendor);

    // Update inventory (add estimated order amount)
    await updateInventoryAfterOrder(pending.petId, 15000); // Assume 15kg bag

    // Send affiliate link
    await bot.sendMessage(chatId,
      `✅ *Order Approved!*\n\n` +
      `Click the link below to complete your purchase on ${getVendorDisplayName(pending.vendor)}:\n\n` +
      `[🛒 Complete Order](${pending.affiliateUrl})\n\n` +
      `After ordering, reply with "done" to confirm.`,
      { parse_mode: 'Markdown' }
    );

    pendingOrders.delete(orderId);
  } catch (error) {
    console.error('Approve order error:', error);
    await bot.sendMessage(chatId, '❌ Failed to process order. Please try again.');
  }
}

async function modifyOrder(
  bot: TelegramBot,
  chatId: number,
  orderId: string
): Promise<void> {
  const pending = pendingOrders.get(orderId);
  if (!pending) {
    await bot.sendMessage(chatId, '❌ Order expired.');
    return;
  }

  // For MVP, just show other options
  const prices = await checkPrices(pending.productName);
  
  const keyboard = prices.map(price => ([{
    text: `${getVendorDisplayName(price.vendor)} - $${(price.totalPrice/100).toFixed(2)}`,
    callback_data: `switch_vendor:${orderId}:${price.vendor}`
  }]));

  await bot.sendMessage(chatId,
    `✎ *Modify Order*\n\nChoose a different vendor:`,
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    }
  );
}

async function snoozeOrder(
  bot: TelegramBot,
  chatId: number,
  orderId: string,
  days: number
): Promise<void> {
  pendingOrders.delete(orderId);
  await bot.sendMessage(chatId,
    `⏰ *Snoozed*\n\n` +
    `I'll remind you again in ${days} days.\n` +
    `Use /order anytime to reorder manually.`
  );
}

async function cancelOrder(
  bot: TelegramBot,
  chatId: number,
  orderId: string
): Promise<void> {
  pendingOrders.delete(orderId);
  await bot.sendMessage(chatId, '❌ Order cancelled.');
}

export async function confirmOrder(
  bot: TelegramBot,
  chatId: number,
  userId: string
): Promise<void> {
  // Find most recent approved order
  const order = await prisma.order.findFirst({
    where: { userId, status: 'approved' },
    orderBy: { createdAt: 'desc' }
  });

  if (!order) {
    await bot.sendMessage(chatId, 'No pending orders to confirm.');
    return;
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'placed' }
  });

  await bot.sendMessage(chatId,
    `🎉 *Order Confirmed!*\n\n` +
    `Order ID: ${order.id}\n` +
    `Vendor: ${getVendorDisplayName(order.vendor)}\n` +
    `Amount: $${(order.totalAmount/100).toFixed(2)}\n\n` +
    `I'll track delivery and remind you when it's time to reorder!`,
    { parse_mode: 'Markdown' }
  );
}

export async function getOrderHistory(
  bot: TelegramBot,
  chatId: number,
  userId: string
): Promise<void> {
  const orders = await prisma.order.findMany({
    where: { userId },
    include: { pet: true },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  if (orders.length === 0) {
    await bot.sendMessage(chatId, 'No orders yet. Use /order to place your first order!');
    return;
  }

  let message = '📋 *Order History*\n\n';

  orders.forEach((order, index) => {
    const status = order.status === 'delivered' ? '✅' : 
                   order.status === 'placed' ? '📦' : '⏳';
    message += `${status} *${order.pet.name}* - ${order.createdAt.toLocaleDateString()}\n`;
    message += `   $${(order.totalAmount/100).toFixed(2)} - ${getVendorDisplayName(order.vendor)}\n\n`;
  });

  await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

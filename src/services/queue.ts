import TelegramBot from 'node-telegram-bot-api';

interface QueuedMessage {
  chatId: number;
  text: string;
  options?: TelegramBot.SendMessageOptions;
  retries: number;
  maxRetries: number;
  retryDelay: number;
}

const messageQueue: QueuedMessage[] = [];
let isProcessingQueue = false;

export function queueMessage(
  bot: TelegramBot,
  chatId: number,
  text: string,
  options?: TelegramBot.SendMessageOptions,
  maxRetries: number = 5,
  retryDelay: number = 15000
): void {
  const message: QueuedMessage = {
    chatId,
    text,
    options,
    retries: 0,
    maxRetries,
    retryDelay
  };

  messageQueue.push(message);
  processQueue(bot);
}

async function processQueue(bot: TelegramBot): Promise<void> {
  if (isProcessingQueue || messageQueue.length === 0) return;

  isProcessingQueue = true;

  while (messageQueue.length > 0) {
    const message = messageQueue[0];

    try {
      await bot.sendMessage(message.chatId, message.text, message.options);
      messageQueue.shift(); // Remove successfully sent message
    } catch (error) {
      console.error(`Failed to send message (attempt ${message.retries + 1}/${message.maxRetries}):`, error);
      
      message.retries++;
      
      if (message.retries >= message.maxRetries) {
        console.error('Max retries reached, removing message from queue');
        messageQueue.shift();
      } else {
        // Wait before retrying (15 seconds between retries)
        await sleep(message.retryDelay);
      }
    }
  }

  isProcessingQueue = false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Also queue webhook processing
interface QueuedUpdate {
  update: TelegramBot.Update;
  retries: number;
  maxRetries: number;
  retryDelay: number;
}

const updateQueue: QueuedUpdate[] = [];
let isProcessingUpdates = false;

export function queueUpdate(
  bot: TelegramBot,
  update: TelegramBot.Update,
  maxRetries: number = 5,
  retryDelay: number = 15000
): void {
  const queuedUpdate: QueuedUpdate = {
    update,
    retries: 0,
    maxRetries,
    retryDelay
  };

  updateQueue.push(queuedUpdate);
  processUpdateQueue(bot);
}

async function processUpdateQueue(bot: TelegramBot): Promise<void> {
  if (isProcessingUpdates || updateQueue.length === 0) return;

  isProcessingUpdates = true;

  while (updateQueue.length > 0) {
    const queuedUpdate = updateQueue[0];

    try {
      bot.processUpdate(queuedUpdate.update);
      updateQueue.shift(); // Remove successfully processed update
    } catch (error) {
      console.error(`Failed to process update (attempt ${queuedUpdate.retries + 1}/${queuedUpdate.maxRetries}):`, error);
      
      queuedUpdate.retries++;
      
      if (queuedUpdate.retries >= queuedUpdate.maxRetries) {
        console.error('Max retries reached, removing update from queue');
        updateQueue.shift();
      } else {
        // Wait 15 seconds before retrying (gives server time to wake up)
        await sleep(queuedUpdate.retryDelay);
      }
    }
  }

  isProcessingUpdates = false;
}

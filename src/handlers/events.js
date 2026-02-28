import { logger } from '../utils/logger.js';
import { handleMessage } from './messageHandler.js';

export function setupEventHandlers(client) {
  client.once('ready', () => {
    logger.success(`Logged in as ${client.user.tag}`);
    logger.info(`Guilds: ${client.guilds.cache.size}`);
  });

  client.on('messageCreate', async (message) => {
    try {
      await handleMessage(client, message);
    } catch (error) {
      logger.error('Error handling message:', error);
    }
  });

  client.on('error', (error) => {
    logger.error('Client error:', error);
  });
}

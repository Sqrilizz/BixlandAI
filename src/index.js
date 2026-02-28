import { Client } from 'discord.js-selfbot-v13';
import { config } from './config.js';
import { setupEventHandlers } from './handlers/events.js';
import { logger } from './utils/logger.js';
import { voiceManager } from './voice/voiceManager.js';

const client = new Client({
  checkUpdate: false,
});

setupEventHandlers(client);

client.login(config.discord.token).catch(err => {
  logger.error('Failed to login:', err);
  process.exit(1);
});

process.on('unhandledRejection', error => {
  logger.error('Unhandled promise rejection:', error);
});

// Graceful shutdown
async function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  try {
    // Disconnect from all voice channels
    for (const [guildId] of voiceManager.connections) {
      await voiceManager.leaveChannel(guildId);
    }
    
    // Destroy client
    client.destroy();
    
    logger.success('✅ Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

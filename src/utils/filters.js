import { config } from '../config.js';

const keywords = ['бот', 'bot', 'помощь', 'help', 'привет', 'adrian'];

export function shouldRespond(client, message) {
  if (message.mentions.has(client.user.id)) {
    return true;
  }

  if (message.reference) {
    const replied = message.channel.messages.cache.get(message.reference.messageId);
    if (replied && replied.author.id === client.user.id) {
      return true;
    }
  }

  const content = message.content.toLowerCase();
  if (keywords.some(kw => content.includes(kw))) {
    return true;
  }

  return Math.random() < config.bot.randomChatChance;
}

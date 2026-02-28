import { config } from '../config.js';

class RateLimiter {
  constructor() {
    this.count = 0;
    this.resetTime = this.getNextResetTime();
    this.checkReset();
  }

  getNextResetTime() {
    const now = new Date();
    const msk = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
    const tomorrow = new Date(msk);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  checkReset() {
    setInterval(() => {
      const now = Date.now();
      if (now >= this.resetTime) {
        this.count = 0;
        this.resetTime = this.getNextResetTime();
      }
    }, 60000); // Check every minute
  }

  canSend() {
    return this.count < config.bot.maxMessagesPerDay;
  }

  increment() {
    this.count++;
  }

  getRemaining() {
    return config.bot.maxMessagesPerDay - this.count;
  }

  getCount() {
    return this.count;
  }

  get maxMessages() {
    return config.bot.maxMessagesPerDay;
  }
}

export const rateLimiter = new RateLimiter();

import { logger } from './logger.js';

class TaskQueue {
  constructor(name, concurrency = 1) {
    this.name = name;
    this.concurrency = concurrency;
    this.queue = [];
    this.running = 0;
    this.stats = {
      processed: 0,
      failed: 0,
      queued: 0,
    };
  }

  async add(task, priority = 0) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        task,
        priority,
        resolve,
        reject,
        addedAt: Date.now(),
      });

      this.stats.queued++;
      this.queue.sort((a, b) => b.priority - a.priority);
      
      this.process();
    });
  }

  async process() {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    this.running++;
    const item = this.queue.shift();
    
    if (!item) {
      this.running--;
      return;
    }

    const waitTime = Date.now() - item.addedAt;
    if (waitTime > 100) {
      logger.debug(`[${this.name}] Task waited ${waitTime}ms in queue`);
    }

    try {
      const result = await item.task();
      item.resolve(result);
      this.stats.processed++;
    } catch (error) {
      logger.error(`[${this.name}] Task failed:`, error);
      item.reject(error);
      this.stats.failed++;
    } finally {
      this.running--;
      this.stats.queued--;
      setImmediate(() => this.process());
    }
  }

  getStats() {
    return {
      ...this.stats,
      running: this.running,
      queued: this.queue.length,
    };
  }

  clear() {
    this.queue = [];
    this.stats.queued = 0;
  }
}

export const textQueue = new TaskQueue('TEXT', 2);
export const voiceQueue = new TaskQueue('VOICE', 1);
export const ttsQueue = new TaskQueue('TTS', 1);

export function getQueueStats() {
  return {
    text: textQueue.getStats(),
    voice: voiceQueue.getStats(),
    tts: ttsQueue.getStats(),
  };
}

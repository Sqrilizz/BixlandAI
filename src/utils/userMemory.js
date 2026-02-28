import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger.js';

const MEMORY_FILE = path.join(process.cwd(), 'user_memory.json');

class UserMemory {
  constructor() {
    this.memory = new Map();
    this.loaded = false;
  }

  async load() {
    try {
      const data = await fs.readFile(MEMORY_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      this.memory = new Map(Object.entries(parsed));
      logger.success(`✅ Loaded memory for ${this.memory.size} users`);
      this.loaded = true;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        logger.error('Failed to load memory:', error.message);
      }
      this.loaded = true;
    }
  }

  async save() {
    try {
      const obj = Object.fromEntries(this.memory);
      await fs.writeFile(MEMORY_FILE, JSON.stringify(obj, null, 2));
    } catch (error) {
      logger.error('Failed to save memory:', error.message);
    }
  }

  async ensureLoaded() {
    if (!this.loaded) {
      await this.load();
    }
  }

  async remember(userId, username, fact) {
    await this.ensureLoaded();
    
    if (!this.memory.has(userId)) {
      this.memory.set(userId, {
        username,
        facts: [],
        preferences: {},
        lastSeen: Date.now(),
        messageCount: 0
      });
    }

    const user = this.memory.get(userId);
    user.facts.push({
      text: fact,
      timestamp: Date.now()
    });

    if (user.facts.length > 50) {
      user.facts = user.facts.slice(-50);
    }

    user.lastSeen = Date.now();
    user.messageCount++;

    await this.save();
  }

  async setPreference(userId, key, value) {
    await this.ensureLoaded();
    
    if (!this.memory.has(userId)) {
      return;
    }

    const user = this.memory.get(userId);
    user.preferences[key] = value;
    await this.save();
  }

  async getFacts(userId) {
    await this.ensureLoaded();
    
    const user = this.memory.get(userId);
    if (!user || user.facts.length === 0) {
      return null;
    }

    return user.facts.slice(-10).map(f => f.text).join('\n');
  }

  async getPreference(userId, key) {
    await this.ensureLoaded();
    
    const user = this.memory.get(userId);
    return user?.preferences[key] || null;
  }

  async getUserInfo(userId) {
    await this.ensureLoaded();
    
    const user = this.memory.get(userId);
    if (!user) return null;

    return {
      username: user.username,
      messageCount: user.messageCount,
      lastSeen: user.lastSeen,
      factsCount: user.facts.length
    };
  }

  async extractAndRemember(userId, username, message) {
    await this.ensureLoaded();
    
    const lower = message.toLowerCase();
    
    if (lower.length < 10 || lower.split(' ').length < 3) {
      return;
    }

    try {
      const { extractMemoryFacts } = await import('./groqHelper.js');
      const facts = await extractMemoryFacts(message);
      
      if (facts && facts.length > 0) {
        for (const fact of facts) {
          await this.remember(userId, username, fact);
        }
      }
    } catch (error) {
      logger.error('Failed to extract memory:', error.message);
    }
  }
}

export const userMemory = new UserMemory();

setInterval(() => userMemory.save(), 5 * 60 * 1000);

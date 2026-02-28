import { logger } from './logger.js';

class DialogContextManager {
  constructor() {
    this.sessions = new Map();
    this.maxAge = 30 * 60 * 1000;
  }

  startSession(userId) {
    this.sessions.set(userId, {
      messages: [],
      topic: null,
      startedAt: Date.now(),
      lastActivity: Date.now()
    });
  }

  addMessage(userId, role, content) {
    if (!this.sessions.has(userId)) {
      this.startSession(userId);
    }

    const session = this.sessions.get(userId);
    session.messages.push({
      role,
      content,
      timestamp: Date.now()
    });

    if (session.messages.length > 10) {
      session.messages = session.messages.slice(-10);
    }

    session.lastActivity = Date.now();
  }

  getContext(userId) {
    const session = this.sessions.get(userId);
    if (!session) return [];

    if (Date.now() - session.lastActivity > this.maxAge) {
      this.sessions.delete(userId);
      return [];
    }

    return session.messages.map(m => `${m.role}: ${m.content}`);
  }

  setTopic(userId, topic) {
    if (this.sessions.has(userId)) {
      this.sessions.get(userId).topic = topic;
    }
  }

  getTopic(userId) {
    return this.sessions.get(userId)?.topic || null;
  }

  endSession(userId) {
    this.sessions.delete(userId);
  }

  cleanup() {
    const now = Date.now();
    for (const [userId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.maxAge) {
        this.sessions.delete(userId);
      }
    }
  }
}

export const dialogContext = new DialogContextManager();

setInterval(() => dialogContext.cleanup(), 5 * 60 * 1000);

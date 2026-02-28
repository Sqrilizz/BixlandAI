import { logger } from './logger.js';

class ResponseCoordinator {
  constructor() {
    this.activeResponses = new Map(); // guildId -> { type: 'text'|'voice', userId, startedAt }
  }

  canRespond(guildId, type, userId) {
    const active = this.activeResponses.get(guildId);
    
    // Нет активных ответов - можно
    if (!active) {
      return true;
    }

    // Уже отвечает этот же пользователь - можно (обновление)
    if (active.userId === userId) {
      return true;
    }

    // Отвечает другой тип (текст vs голос) - нельзя
    const elapsed = Date.now() - active.startedAt;
    logger.debug(`[Coordinator] Guild ${guildId}: ${active.type} response active for ${elapsed}ms, blocking ${type}`);
    return false;
  }

  startResponse(guildId, type, userId) {
    const active = this.activeResponses.get(guildId);
    
    if (active && active.userId !== userId) {
      logger.warn(`[Coordinator] Overriding active ${active.type} response with ${type}`);
    }

    this.activeResponses.set(guildId, {
      type,
      userId,
      startedAt: Date.now(),
    });

    logger.debug(`[Coordinator] Started ${type} response in guild ${guildId}`);
  }

  endResponse(guildId, type) {
    const active = this.activeResponses.get(guildId);
    
    if (active && active.type === type) {
      const duration = Date.now() - active.startedAt;
      logger.debug(`[Coordinator] Ended ${type} response in guild ${guildId} (${duration}ms)`);
      this.activeResponses.delete(guildId);
    }
  }

  getActiveResponse(guildId) {
    return this.activeResponses.get(guildId);
  }

  clearGuild(guildId) {
    this.activeResponses.delete(guildId);
  }

  getStats() {
    const stats = {
      total: this.activeResponses.size,
      byType: { text: 0, voice: 0 },
    };

    for (const [_, response] of this.activeResponses) {
      stats.byType[response.type]++;
    }

    return stats;
  }
}

export const responseCoordinator = new ResponseCoordinator();

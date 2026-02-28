class MemoryManager {
  constructor() {
    this.userMemory = new Map(); // userId -> messages[]
    this.channelMemory = new Map(); // channelId -> messages[]
    this.allMessages = []; // Store all messages for stats
    this.hourlyActivity = new Array(24).fill(0); // Activity per hour (last 24h)
    this.maxUserMessages = 10;
    this.maxChannelMessages = 20;
    this.maxAllMessages = 100; // Keep last 100 messages for stats
  }

  addMessage(message) {
    const userId = message.author.id;
    const channelId = message.channel.id;
    const text = `${message.author.username}: ${message.content}`;
    const now = Date.now();

    // Update hourly activity
    const hourIndex = new Date().getHours();
    this.hourlyActivity[hourIndex]++;

    // Store full message for stats
    this.allMessages.push({
      author: {
        id: userId,
        username: message.author.username
      },
      content: message.content,
      timestamp: now
    });
    
    // Keep only last N messages
    if (this.allMessages.length > this.maxAllMessages) {
      this.allMessages.shift();
    }

    // Add to user memory
    if (!this.userMemory.has(userId)) {
      this.userMemory.set(userId, []);
    }
    const userMsgs = this.userMemory.get(userId);
    userMsgs.push(text);
    if (userMsgs.length > this.maxUserMessages) {
      userMsgs.shift();
    }

    // Add to channel memory
    if (!this.channelMemory.has(channelId)) {
      this.channelMemory.set(channelId, []);
    }
    const channelMsgs = this.channelMemory.get(channelId);
    channelMsgs.push(text);
    if (channelMsgs.length > this.maxChannelMessages) {
      channelMsgs.shift();
    }
  }

  getUserContext(userId) {
    return this.userMemory.get(userId) || [];
  }

  getChannelContext(channelId) {
    return this.channelMemory.get(channelId) || [];
  }

  getAllMessages() {
    return this.allMessages;
  }

  getHourlyActivity() {
    // Return activity for last 24 hours
    const currentHour = new Date().getHours();
    const activity = [];
    
    for (let i = 0; i < 24; i++) {
      const hourIndex = (currentHour - 23 + i + 24) % 24;
      activity.push({
        hour: i,
        count: this.hourlyActivity[hourIndex]
      });
    }
    
    return activity;
  }

  resetDailyStats() {
    // Reset hourly activity at midnight
    this.hourlyActivity = new Array(24).fill(0);
  }
}

export const memoryManager = new MemoryManager();

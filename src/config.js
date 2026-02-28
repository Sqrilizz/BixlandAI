import dotenv from 'dotenv';
dotenv.config();

export const config = {
  discord: {
    token: process.env.DISCORD_TOKEN,
  },
  yellowfire: {
    apiKey: process.env.YELLOWFIRE_API_KEY,
    model: process.env.MODEL || 'gpt-4o-mini',
  },
  bot: {
    maxMessagesPerDay: parseInt(process.env.MAX_MESSAGES_PER_DAY) || 70,
    maxChars: parseInt(process.env.MAX_CHARS) || 350,
    randomChatChance: parseFloat(process.env.RANDOM_CHAT_CHANCE) || 0.07,
    memeEnabled: process.env.MEME_ENABLED === 'true',
    commandPrefix: process.env.COMMAND_PREFIX || '!',
    allowedChannels: process.env.ALLOWED_CHANNELS 
      ? process.env.ALLOWED_CHANNELS.split(',').map(id => id.trim())
      : [],
    blockedUsers: process.env.BLOCKED_USERS
      ? process.env.BLOCKED_USERS.split(',').map(id => id.trim())
      : [],
  },
  voice: {
    mode: process.env.VOICE_MODE || 'text_only', // text_only, voice_only, all
    enabled: process.env.VOICE_ENABLED === 'true',
    ttsVoice: process.env.TTS_VOICE || 'multilingual',
  },
  stt: {
    enabled: true, // Always enabled with local Whisper
  },
};

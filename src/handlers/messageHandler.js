import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { rateLimiter } from '../utils/rateLimiter.js';
import { memoryManager } from '../ai/memory.js';
import { generateResponse } from '../ai/yellowfire.js';
import { buildPrompt } from '../ai/promptBuilder.js';
import { shouldRespond } from '../utils/filters.js';
import { addReaction, simulateTyping } from '../utils/humanBehavior.js';
import { enhanceResponse } from '../ai/personality.js';
import { handleVoiceCommand } from './voiceCommands.js';
import { voiceManager } from '../voice/voiceManager.js';
import { textQueue } from '../utils/taskQueue.js';
import { responseCoordinator } from '../utils/responseCoordinator.js';
import { braveSearch } from '../utils/braveSearch.js';
import { getWeather, isWeatherQuery, extractCity } from '../utils/weatherAPI.js';
import { hasImage, getImageUrl, analyzeImage } from '../utils/imageAnalyzer.js';
import { isGif, getGifUrl, analyzeGif } from '../utils/gifAnalyzer.js';
import { getRandomMeme, shouldSendMeme } from '../utils/memesAPI.js';
import { analyzeMessage } from '../utils/messageAnalyzer.js';

export async function handleMessage(client, message) {
  if (message.author.id === client.user.id) return;
  if (message.author.bot) return;
  if (message.author.username.endsWith('_AI')) return;
  if (!message.guild) return;

  if (config.bot.blockedUsers.includes(message.author.id)) {
    return;
  }

  if (config.bot.allowedChannels.length > 0) {
    if (!config.bot.allowedChannels.includes(message.channel.id)) {
      logger.debug(`Ignoring message from non-allowed channel: ${message.channel.id}`);
      return;
    }
  }

  const cleanContent = message.content.replace(/<@!?\d+>/g, '').trim();
  logger.debug(`Message from ${message.author.username}: ${cleanContent}`);

  const isVoiceCommand = await handleVoiceCommand(client, message);
  if (isVoiceCommand) return;

  memoryManager.addMessage(message);
  await addReaction(message);

  if (!shouldRespond(client, message)) return;

  if (!rateLimiter.canSend()) {
    logger.warn('Rate limit exceeded');
    return;
  }

  const guildId = message.guild.id;
  if (!responseCoordinator.canRespond(guildId, 'text', message.author.id)) {
    logger.debug('Text response blocked - voice response active');
    return;
  }

  if (config.bot.memeEnabled && shouldSendMeme(message.content)) {
    const meme = await getRandomMeme();
    if (meme) {
      await message.channel.send(meme.url);
      return;
    }
  }

  textQueue.add(async () => {
    await handleTextResponse(message, client);
  }).catch(error => {
    logger.error('Text queue error:', error);
  });
}

async function handleTextResponse(message, client) {
  const guildId = message.guild.id;
  
  try {
    if (!responseCoordinator.canRespond(guildId, 'text', message.author.id)) {
      logger.debug('Text response blocked after queue - voice response active');
      return;
    }

    responseCoordinator.startResponse(guildId, 'text', message.author.id);
    await simulateTyping(message.channel);

    const userContext = memoryManager.getUserContext(message.author.id);
    const channelContext = memoryManager.getChannelContext(message.channel.id);

    let searchResults = '';
    
    let targetMessage = message;
    
    if (message.reference && message.reference.messageId) {
      try {
        const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
        if (repliedMessage) {
          logger.debug('Checking replied message for attachments');
          if (isGif(repliedMessage) || hasImage(repliedMessage)) {
            targetMessage = repliedMessage;
          }
        }
      } catch (error) {
        logger.debug('Could not fetch replied message');
      }
    }
    
    if (isGif(targetMessage)) {
      const gifUrl = getGifUrl(targetMessage);
      const question = message.content || 'Что происходит на этой гифке?';
      
      try {
        logger.debug('Analyzing GIF');
        const gifAnalysis = await analyzeGif(gifUrl, question);
        searchResults = `Анализ GIF:\n${gifAnalysis}`;
        logger.success('✅ GIF analyzed');
      } catch (error) {
        logger.error('Failed to analyze GIF:', error.message);
        await message.reply('❌ Не смог проанализировать гифку');
        return;
      }
    } else if (hasImage(message)) {
      const imageUrl = getImageUrl(message);
      const question = message.content || 'Что на этой картинке?';
      
      try {
        logger.debug('Analyzing image');
        const imageAnalysis = await analyzeImage(imageUrl, question);
        searchResults = `Анализ изображения:\n${imageAnalysis}`;
        logger.success('✅ Image analyzed');
      } catch (error) {
        logger.error('Failed to analyze image:', error.message);
        await message.reply('❌ Не смог проанализировать картинку');
        return;
      }
    } else if (isWeatherQuery(message.content)) {
      const city = await extractCity(message.content);
      if (city) {
        const weatherData = await getWeather(city);
        if (weatherData) {
          searchResults = weatherData;
          logger.debug(`Weather added: ${city}`);
        }
      }
    } else {
      const analysis = await analyzeMessage(message.content);
      
      if (analysis.needsSearch && process.env.BRAVE_API_KEY) {
        try {
          searchResults = await braveSearch(message.content, process.env.BRAVE_API_KEY);
          logger.debug('Search results added');
        } catch (error) {
          logger.warn('Search failed, continuing without it');
        }
      }
    }

    const promptResult = buildPrompt(
      message.author.username,
      message.content,
      channelContext,
      userContext,
      false,
      searchResults
    );

    if (promptResult.blocked) {
      logger.debug(`Prompt blocked: ${promptResult.reason}`);
      return;
    }

    const prompt = promptResult.prompt;

    const response = await generateResponse(prompt, [...channelContext, ...userContext]);
    const enhanced = enhanceResponse(response);
    
    rateLimiter.increment();
    const voiceMode = config.voice.mode;
    const isInVoice = voiceManager.isConnected(guildId);

    if (voiceMode === 'text_only' || !config.voice.enabled) {
      await message.channel.send(enhanced);
    } else if (voiceMode === 'voice_only' && isInVoice) {
      await voiceManager.speakInVoice(guildId, enhanced);
    } else if (voiceMode === 'all') {
      await message.channel.send(enhanced);
      if (isInVoice) {
        await voiceManager.speakInVoice(guildId, enhanced);
      }
    } else {
      await message.channel.send(enhanced);
    }
    
    logger.success(`Responded to ${message.author.username}`);
  } catch (error) {
    logger.error('Failed to generate response:', error);
  } finally {
    responseCoordinator.endResponse(guildId, 'text');
  }
}

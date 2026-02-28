import { voiceManager } from '../voice/voiceManager.js';
import { logger } from '../utils/logger.js';
import { getQueueStats } from '../utils/taskQueue.js';
import { responseCoordinator } from '../utils/responseCoordinator.js';
import { rateLimiter } from '../utils/rateLimiter.js';
import { memoryManager } from '../ai/memory.js';
import { generateStatsImage } from '../utils/statsImage.js';
import { searchSoundCloud, playMusic, stopMusic, skipSong, musicQueue, formatDuration } from '../utils/musicPlayer.js';
import { config } from '../config.js';

export async function handleVoiceCommand(client, message) {
  const prefix = config.bot.commandPrefix.toLowerCase();
  const content = message.content.toLowerCase();

  // !help - show help with GitBook link
  if (content === `${prefix}help` || content === `${prefix}помощь`) {
    const helpText = [
      '📚 **Adrian AI Bot - Помощь**',
      '',
      '**Голосовые команды:**',
      `\`${prefix}join\` - зайти в войс (AI + музыка)`,
      `\`${prefix}join-ai\` - зайти в войс (только AI)`,
      `\`${prefix}leave\` - выйти из войса`,
      `\`${prefix}speak <текст>\` - озвучить текст`,
      '',
      '**Музыка:**',
      `\`${prefix}play <url>\` - включить трек (SoundCloud)`,
      `\`${prefix}skip\` - пропустить трек`,
      `\`${prefix}stop\` - остановить музыку`,
      `\`${prefix}queue\` - показать очередь`,
      '',
      '**Статистика:**',
      `\`${prefix}status\` - статус бота`,
      `\`${prefix}stats\` - статистика с графиками`,
      `\`${prefix}help\` - эта справка`,
      '',
      '**Текстовое общение:**',
      'Упомяни "Адриан" или ответь на сообщение бота',
      '',
      '📖 **Полная документация:** https://adrian.su4ka.site/',
    ].join('\n');
    
    await message.reply(helpText);
    return true;
  }

  // !ping - check bot latency
  if (content === `${prefix}ping` || content === `${prefix}пинг`) {
    const start = Date.now();
    const msg = await message.reply('🏓 Pong!');
    const latency = Date.now() - start;
    await msg.edit(`🏓 Pong! Задержка: ${latency}ms`);
    return true;
  }

  // !join - join voice channel (full mode: AI + music)
  if (content === `${prefix}join` || content === `${prefix}войс`) {
    const voiceChannel = message.member?.voice?.channel;
    
    if (!voiceChannel) {
      await message.reply('❌ Ты не в войсе');
      return true;
    }

    try {
      await voiceManager.joinChannel(voiceChannel, 'full');
      await message.reply(`✅ Зашёл в ${voiceChannel.name} (режим: AI + музыка)`);
    } catch (error) {
      logger.error('Failed to join voice:', error);
      await message.reply('❌ Не смог зайти в войс');
    }
    return true;
  }

  // !join-ai - join voice channel (AI only mode: no music)
  if (content === `${prefix}join-ai` || content === `${prefix}войс-ии`) {
    const voiceChannel = message.member?.voice?.channel;
    
    if (!voiceChannel) {
      await message.reply('❌ Ты не в войсе');
      return true;
    }

    try {
      await voiceManager.joinChannel(voiceChannel, 'ai-only');
      await message.reply(`✅ Зашёл в ${voiceChannel.name} (режим: только AI)`);
    } catch (error) {
      logger.error('Failed to join voice:', error);
      await message.reply('❌ Не смог зайти в войс');
    }
    return true;
  }

  // !leave - leave voice channel
  if (content === `${prefix}leave` || content === `${prefix}выйди`) {
    const guildId = message.guild.id;
    
    if (!voiceManager.isConnected(guildId)) {
      await message.reply('❌ Я не в войсе');
      return;
    }

    try {
      await voiceManager.leaveChannel(guildId);
      await message.reply('👋 Вышел из войса');
    } catch (error) {
      logger.error('Failed to leave voice:', error);
      await message.reply('❌ Ошибка при выходе');
    }
    return true;
  }

  // !speak <text> - speak in voice
  if (content.startsWith(`${prefix}speak `) || content.startsWith(`${prefix}скажи `)) {
    const guildId = message.guild.id;
    
    if (!voiceManager.isConnected(guildId)) {
      await message.reply('❌ Я не в войсе');
      return;
    }

    const text = message.content.replace(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(speak|скажи)\\s+`, 'i'), '');
    
    try {
      await voiceManager.speakInVoice(guildId, text);
      await message.react('✅');
    } catch (error) {
      logger.error('Failed to speak:', error);
      await message.reply('❌ Не смог озвучить');
    }
    return true;
  }

  // !play <query> - play music from SoundCloud
  if (content.startsWith(`${prefix}play `) || content.startsWith(`${prefix}плей `)) {
    const guildId = message.guild.id;
    
    if (!voiceManager.isConnected(guildId)) {
      await message.reply('❌ Я не в войсе');
      return true;
    }

    const query = message.content.replace(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(play|плей)\\s+`, 'i'), '');
    
    try {
      logger.debug(`Searching for: "${query}"`);
      const song = await searchSoundCloud(query);
      
      if (!song) {
        await message.reply('❌ Неверная ссылка SoundCloud');
        return true;
      }

      logger.debug(`Found song: ${song.title}, URL: ${song.url}`);
      
      const connection = voiceManager.getConnection(guildId);
      
      if (musicQueue.isPlaying(guildId)) {
        musicQueue.addSong(guildId, song);
        await message.reply(`✅ Добавлено в очередь: ${song.title} by ${song.author} (${formatDuration(song.duration)})`);
      } else {
        await playMusic(guildId, connection, song);
        await message.reply(`🎵 Играет: ${song.title} by ${song.author} (${formatDuration(song.duration)})`);
      }
    } catch (error) {
      logger.error('Failed to play music:', error);
      await message.reply('❌ Ошибка при воспроизведении');
    }
    return true;
  }

  // !skip - skip current song
  if (content === `${prefix}skip` || content === `${prefix}скип`) {
    const guildId = message.guild.id;
    
    if (!voiceManager.isConnected(guildId)) {
      await message.reply('❌ Я не в войсе');
      return true;
    }

    const connection = voiceManager.getConnection(guildId);
    const skipped = skipSong(guildId, connection);
    
    if (skipped) {
      await message.reply('⏭️ Пропущено');
    } else {
      await message.reply('❌ Нечего пропускать');
    }
    return true;
  }

  // !stop - stop music
  if (content === `${prefix}stop` || content === `${prefix}стоп`) {
    const guildId = message.guild.id;
    
    if (!voiceManager.isConnected(guildId)) {
      await message.reply('❌ Я не в войсе');
      return true;
    }

    stopMusic(guildId);
    await message.reply('⏹️ Музыка остановлена');
    return true;
  }

  // !queue - show music queue
  if (content === `${prefix}queue` || content === `${prefix}очередь`) {
    const guildId = message.guild.id;
    
    const current = musicQueue.getCurrentSong(guildId);
    const songs = musicQueue.getSongs(guildId);
    
    if (!current && songs.length === 0) {
      await message.reply('❌ Очередь пуста');
      return true;
    }

    let queueText = '🎵 Музыкальная очередь:\n\n';
    
    if (current) {
      queueText += `▶️ Сейчас: ${current.title} (${formatDuration(current.duration)})\n\n`;
    }
    
    if (songs.length > 0) {
      queueText += 'Следующие:\n';
      songs.slice(0, 10).forEach((song, i) => {
        queueText += `${i + 1}. ${song.title} (${formatDuration(song.duration)})\n`;
      });
      
      if (songs.length > 10) {
        queueText += `\n...и ещё ${songs.length - 10} треков`;
      }
    }
    
    await message.reply(queueText);
    return true;
  }

  // !status - check voice status
  if (content === `${prefix}status` || content === `${prefix}статус`) {
    const guildId = message.guild.id;
    const isConnected = voiceManager.isConnected(guildId);
    
    if (!isConnected) {
      await message.reply('❌ Не в войсе');
      return true;
    }

    const stats = voiceManager.getStats();
    const queueStats = getQueueStats();
    const coordStats = responseCoordinator.getStats();
    const activeInGuild = responseCoordinator.getActiveResponse(guildId);
    
    const status = [
      '📊 Статус:',
      `✅ В войсе`,
      activeInGuild ? `🔒 Сейчас отвечает: ${activeInGuild.type}` : '🔓 Свободен',
      '',
      '🎙️ Voice:',
      `  Deepgram: ${stats.deepgramConnections}`,
      `  Стримы: ${stats.activeStreams}`,
      `  Обработка: ${stats.processing}`,
      `  Диалоги: ${stats.activeDialogs}`,
      '',
      '📋 Очереди:',
      `  Текст: ${queueStats.text.queued} в очереди, ${queueStats.text.running} работает`,
      `  Голос: ${queueStats.voice.queued} в очереди, ${queueStats.voice.running} работает`,
      `  TTS: ${queueStats.tts.queued} в очереди, ${queueStats.tts.running} работает`,
      '',
      '🔒 Координатор:',
      `  Активных: ${coordStats.total} (текст: ${coordStats.byType.text}, голос: ${coordStats.byType.voice})`,
      '',
      '📈 Всего:',
      `  Текст: ${queueStats.text.processed} ✅ ${queueStats.text.failed} ❌`,
      `  Голос: ${queueStats.voice.processed} ✅ ${queueStats.voice.failed} ❌`,
      `  TTS: ${queueStats.tts.processed} ✅ ${queueStats.tts.failed} ❌`,
    ].join('\n');
    
    await message.reply(status);
    return true;
  }

  // !stats - show bot statistics with image
  if (content === `${prefix}stats` || content === `${prefix}статистика`) {
    try {
      logger.debug('Generating stats');
      
      const queueStats = getQueueStats();
      const coordStats = responseCoordinator.getStats();
      const allMessages = memoryManager.getAllMessages();
      const userCounts = {};
      
      allMessages.forEach(msg => {
        const username = msg.author?.username || 'Unknown';
        if (username !== 'Unknown' && username !== client.user.username) {
          userCounts[username] = (userCounts[username] || 0) + 1;
        }
      });
      
      let topUsers = Object.entries(userCounts)
        .map(([username, count]) => ({ username, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      // If no users, add placeholder
      if (topUsers.length === 0) {
        topUsers = [
          { username: 'No activity yet', count: 0 }
        ];
      }
      
      const messageHistory = memoryManager.getHourlyActivity();
      const botAvatarUrl = client.user.displayAvatarURL({ format: 'png', size: 128 });
      const botUsername = client.user.username;
      
      logger.debug(`Stats: ${topUsers.length} users, ${messageHistory.length} hours, avatar: ${botAvatarUrl ? 'yes' : 'no'}`);
      
      const pngBuffer = await generateStatsImage({
        messagesUsed: rateLimiter.getCount(),
        maxMessages: rateLimiter.maxMessages,
        topUsers: topUsers,
        textQueueSize: queueStats.text.queued,
        voiceQueueSize: queueStats.voice.queued,
        ttsQueueSize: queueStats.tts.queued,
        coordinatorStats: coordStats,
        messageHistory: messageHistory,
        botAvatarUrl: botAvatarUrl,
        botUsername: botUsername
      });
      
      logger.info(`PNG generated, size: ${pngBuffer.length} bytes`);
      
      await message.channel.send({ 
        files: [{
          attachment: pngBuffer,
          name: 'stats.png'
        }]
      });
      logger.success('✅ Stats sent successfully');
    } catch (error) {
      logger.error('Failed to generate stats:', error);
      await message.reply('❌ Ошибка при генерации статистики');
    }
    return true;
  }

  return false;
}

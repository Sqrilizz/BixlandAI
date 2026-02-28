import { createAudioPlayer, createAudioResource, AudioPlayerStatus } from '@discordjs/voice';
import { logger } from './logger.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { homedir } from 'os';
import { join } from 'path';

const execAsync = promisify(exec);
const ytdlpPath = process.env.YTDLP_PATH || '/usr/local/bin/yt-dlp';

class MusicQueue {
  constructor() {
    this.queues = new Map();
  }

  getQueue(guildId) {
    if (!this.queues.has(guildId)) {
      this.queues.set(guildId, {
        songs: [],
        playing: false,
        player: null,
        currentSong: null,
        volume: 0.5
      });
    }
    return this.queues.get(guildId);
  }

  addSong(guildId, song) {
    const queue = this.getQueue(guildId);
    queue.songs.push(song);
    logger.info(`Added to queue: ${song.title}`);
  }

  getNextSong(guildId) {
    const queue = this.getQueue(guildId);
    return queue.songs.shift();
  }

  clear(guildId) {
    const queue = this.getQueue(guildId);
    queue.songs = [];
    queue.playing = false;
    queue.currentSong = null;
  }

  getCurrentSong(guildId) {
    const queue = this.getQueue(guildId);
    return queue.currentSong;
  }

  getSongs(guildId) {
    const queue = this.getQueue(guildId);
    return queue.songs;
  }

  isPlaying(guildId) {
    const queue = this.getQueue(guildId);
    return queue.playing;
  }
}

export const musicQueue = new MusicQueue();

export async function searchSoundCloud(query) {
  try {
    if (!query.includes('soundcloud.com')) {
      logger.error('Not a SoundCloud URL');
      return null;
    }
    
    logger.debug(`Getting SoundCloud info: ${query}`);
    
    const { stdout } = await execAsync(`"${ytdlpPath}" --dump-json "${query}"`);
    
    if (!stdout) {
      return null;
    }
    
    const info = JSON.parse(stdout);
    
    return {
      title: info.title,
      url: query,
      duration: info.duration || 0,
      thumbnail: info.thumbnail,
      author: info.uploader || 'Unknown'
    };
  } catch (error) {
    logger.error('SoundCloud error:', error.message);
    return null;
  }
}

export async function playMusic(guildId, connection, song) {
  try {
    const queue = musicQueue.getQueue(guildId);
    
    if (!song || !song.url) {
      logger.error('Invalid song object:', song);
      throw new Error('Invalid song data');
    }
    
    logger.info(`Playing: ${song.title}`);
    logger.debug(`URL: ${song.url}`);
    
    const { spawn } = await import('child_process');
    const ytdlp = spawn(ytdlpPath, ['-f', 'bestaudio', '-o', '-', song.url]);
    
    const resource = createAudioResource(ytdlp.stdout, {
      inlineVolume: true
    });

    if (!queue.player) {
      queue.player = createAudioPlayer();
      connection.subscribe(queue.player);
    }

    resource.volume?.setVolume(queue.volume);
    queue.player.play(resource);
    queue.playing = true;
    queue.currentSong = song;

    queue.player.once(AudioPlayerStatus.Idle, () => {
      queue.playing = false;
      queue.currentSong = null;
      
      const nextSong = musicQueue.getNextSong(guildId);
      if (nextSong) {
        playMusic(guildId, connection, nextSong);
      }
    });

    queue.player.on('error', (error) => {
      logger.error('Audio player error:', error.message);
      queue.playing = false;
      queue.currentSong = null;
    });

  } catch (error) {
    logger.error('Failed to play music:', error.message);
    throw error;
  }
}

export function stopMusic(guildId) {
  const queue = musicQueue.getQueue(guildId);
  
  if (queue.player) {
    queue.player.stop();
  }
  
  musicQueue.clear(guildId);
  logger.info('Music stopped');
}

export function skipSong(guildId, connection) {
  const queue = musicQueue.getQueue(guildId);
  
  if (queue.player) {
    queue.player.stop();
  }

  const nextSong = musicQueue.getNextSong(guildId);
  if (nextSong) {
    playMusic(guildId, connection, nextSong);
    return true;
  }
  
  return false;
}

export function setVolume(guildId, volume) {
  const queue = musicQueue.getQueue(guildId);
  queue.volume = Math.max(0, Math.min(1, volume));
  logger.info(`Volume set to ${Math.round(queue.volume * 100)}%`);
}

export function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

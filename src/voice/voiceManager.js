import { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus, EndBehaviorType } from '@discordjs/voice';
import { logger } from '../utils/logger.js';
import { generateTTS } from '../ai/yellowfire.js';
import { config } from '../config.js';
import { generateResponse } from '../ai/yellowfire.js';
import { buildPrompt } from '../ai/promptBuilder.js';
import { enhanceResponse } from '../ai/personality.js';
import { memoryManager } from '../ai/memory.js';
import fs from 'fs';
import path from 'path';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import prism from 'prism-media';
import { voiceQueue, ttsQueue } from '../utils/taskQueue.js';
import { responseCoordinator } from '../utils/responseCoordinator.js';
import { braveSearch } from '../utils/braveSearch.js';
import { analyzeMessage } from '../utils/messageAnalyzer.js';
import { getWeather, isWeatherQuery, extractCity } from '../utils/weatherAPI.js';
import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';

class VoiceManager {
  constructor() {
    this.connections = new Map();
    this.players = new Map();
    this.receivers = new Map();
    this.deepgramConnections = new Map();
    this.userTranscripts = new Map();
    this.activeStreams = new Map();
    this.processingVoice = new Set();
    this.activeDialogs = new Map();
    this.voiceModes = new Map(); // guildId -> 'full' | 'ai-only'
    
    this.deepgramKey = process.env.DEEPGRAM_API_KEY || '';
    if (this.deepgramKey) {
      try {
        this.deepgram = createClient(this.deepgramKey);
        logger.success('✅ Deepgram initialized');
        this.testDeepgramConnection();
      } catch (error) {
        logger.error('❌ Failed to initialize Deepgram:', error.message);
        this.deepgram = null;
      }
    } else {
      logger.error('❌ DEEPGRAM_API_KEY not set!');
    }
  }

  async testDeepgramConnection() {
    try {
      logger.debug('Testing Deepgram connection');
    } catch (error) {
      logger.error('Deepgram test failed:', error.message);
    }
  }

  async joinChannel(channel, mode = 'full') {
    if (!channel || channel.type !== 'GUILD_VOICE') {
      throw new Error('Invalid voice channel');
    }

    const guildId = channel.guild.id;

    if (this.connections.has(guildId)) {
      await this.leaveChannel(guildId);
    }

    try {
      logger.info(`Joining voice: ${channel.name} (mode: ${mode})`);
      
      this.voiceModes.set(guildId, mode);
      
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: guildId,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
      });

      this.connections.set(guildId, connection);

      connection.on('stateChange', (oldState, newState) => {
        logger.debug(`Voice connection state: ${oldState.status} -> ${newState.status}`);
        
        if (newState.status === 'ready' && this.deepgram) {
          this.startListening(connection, channel);
        }

        if (newState.status === 'disconnected') {
          logger.warn('Voice connection disconnected, cleaning up...');
          this.leaveChannel(guildId);
        }
      });

      connection.on('error', (error) => {
        logger.error('Voice connection error:', error);
        setTimeout(() => {
          if (!this.connections.has(guildId)) {
            logger.info('Attempting to reconnect...');
            this.joinChannel(channel).catch(err => {
              logger.error('Reconnection failed:', err);
            });
          }
        }, 5000);
      });

      logger.success(`✅ Joined voice channel: ${channel.name}`);
      return connection;
    } catch (error) {
      logger.error('Failed to join voice channel:', error);
      throw error;
    }
  }

  startListening(connection, channel) {
    try {
      const receiver = connection.receiver;
      this.receivers.set(channel.guild.id, receiver);

      receiver.speaking.removeAllListeners('start');

      receiver.speaking.on('start', (userId) => {
        const user = channel.guild.members.cache.get(userId);
        if (!user || user.user.bot) return;

        if (this.activeStreams.has(userId)) {
          return;
        }

        this.ensureDeepgramConnection(userId, user);

        const audioStream = receiver.subscribe(userId, {
          end: {
            behavior: EndBehaviorType.AfterSilence,
            duration: 1500,
          },
        });

        audioStream.on('error', (err) => {
          if (err.code === 'GenericFailure' || err.message.includes('DecryptionFailed')) {
            logger.debug(`Ignoring decryption error for ${user.user.username}`);
          } else {
            logger.error('Audio stream error:', err);
          }
          this.activeStreams.delete(userId);
        });

        const decoder = new prism.opus.Decoder({
          rate: 48000,
          channels: 2,
          frameSize: 960,
        });

        this.activeStreams.set(userId, { audioStream, decoder });

        audioStream.pipe(decoder);

        const dgConnection = this.deepgramConnections.get(userId);
        if (dgConnection) {
          const onData = (pcmChunk) => {
            if (dgConnection.getReadyState() === 1) {
              dgConnection.send(pcmChunk);
            }
          };

          const onEnd = () => {
            decoder.removeListener('data', onData);
            decoder.removeListener('end', onEnd);
            decoder.removeListener('error', onError);
            this.activeStreams.delete(userId);

            setTimeout(() => {
              const transcript = this.userTranscripts.get(userId) || '';
              if (transcript.trim().length > 0) {
                this.handleVoiceMessage(transcript.trim(), user, channel);
                this.userTranscripts.set(userId, ''); // Clear transcript
              }
            }, 1000);
          };

          const onError = (err) => {
            logger.error('Decoder error:', err);
            decoder.removeListener('data', onData);
            decoder.removeListener('end', onEnd);
            decoder.removeListener('error', onError);
            this.activeStreams.delete(userId);
          };

          decoder.on('data', onData);
          decoder.once('end', onEnd);
          decoder.once('error', onError);
        }
      });
    } catch (error) {
      logger.error('Failed to start listening:', error);
    }
  }

  ensureDeepgramConnection(userId, user) {
    const existing = this.deepgramConnections.get(userId);
    if (existing && existing.getReadyState() === 1) {
      return;
    }

    if (existing) {
      try {
        existing.finish();
      } catch (e) {
      }
      this.deepgramConnections.delete(userId);
    }

    this.createDeepgramConnection(userId, user);
  }

  createDeepgramConnection(userId, user) {
    try {
      const dgConnection = this.deepgram.listen.live({
        model: 'nova-2',
        language: 'ru',
        smart_format: true,
        interim_results: true,
        utterance_end_ms: 1500,
        encoding: 'linear16',
        sample_rate: 48000,
        channels: 2,
      });

      this.userTranscripts.set(userId, '');

      dgConnection.on(LiveTranscriptionEvents.Open, () => {
        logger.debug(`� Deepgram connection opened  for ${user.user.username}`);
      });

      dgConnection.on(LiveTranscriptionEvents.Transcript, (data) => {
        const transcript = data.channel?.alternatives?.[0]?.transcript;
        if (transcript && transcript.trim().length > 0) {
          const isFinal = data.is_final;
          if (isFinal) {
            const current = this.userTranscripts.get(userId) || '';
            this.userTranscripts.set(userId, current + ' ' + transcript);
          }
        }
      });

      dgConnection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
      });

      dgConnection.on(LiveTranscriptionEvents.Close, () => {
        logger.debug(`❌ Deepgram connection closed for ${user.user.username}`);
        this.deepgramConnections.delete(userId);
      });

      dgConnection.on(LiveTranscriptionEvents.Error, (err) => {
        const errorMsg = err.message || err;
        logger.error(`Deepgram error for ${user.user.username}:`, errorMsg);
        if (errorMsg.includes('401') || errorMsg.includes('403')) {
          logger.error('❌ Deepgram API key is invalid or expired! Check DEEPGRAM_API_KEY in .env');
        } else if (errorMsg.includes('network error') || errorMsg.includes('non-101')) {
          logger.error('❌ Deepgram connection failed. Possible causes:');
          logger.error('   1. Invalid API key');
          logger.error('   2. Network/firewall blocking WebSocket');
          logger.error('   3. Deepgram service issue');
          logger.error('   Get a new key from: https://console.deepgram.com/');
        }
        this.deepgramConnections.delete(userId);
      });

      this.deepgramConnections.set(userId, dgConnection);
    } catch (error) {
      logger.error('Failed to create Deepgram connection:', error);
    }
  }

  async handleVoiceMessage(text, user, channel) {
    if (this.processingVoice.has(user.id)) {
      return;
    }

    this.processingVoice.add(user.id);
    const guildId = channel.guild.id;

    voiceQueue.add(async () => {
      try {
        logger.info(`Voice: "${text}"`);
        
        const lowerText = text.toLowerCase();
        const activationWords = ['адриан', 'adrian', 'эдриан', 'андриан', 'адриян', 'adriyan', 'андреан', 'здрайн', 'адрян', 'эдрян', 'андрян'];
        const stopWords = ['стоп', 'stop', 'хватит', 'закончи'];
        const hasActivation = activationWords.some(word => lowerText.includes(word));
        const hasStop = stopWords.some(word => lowerText.includes(word));
        
        if (hasActivation && hasStop) {
          if (this.activeDialogs.has(user.id)) {
            this.activeDialogs.delete(user.id);
            logger.info(`Dialog ended: ${user.user.username}`);
          }
          return;
        }
        const inDialogMode = this.activeDialogs.has(user.id);
        
        if (!hasActivation && !inDialogMode) {
          logger.debug(`❌ No activation word and not in dialog mode: "${text}"`);
          return;
        }

        if (hasActivation && !inDialogMode) {
          this.activeDialogs.set(user.id, true);
          logger.info(`Dialog started: ${user.user.username}`);
        } else if (inDialogMode) {
          logger.debug(`Dialog continue: ${user.user.username}`);
        }
        
        if (!responseCoordinator.canRespond(guildId, 'voice', user.id)) {
          logger.debug('Voice response blocked - text response active');
          return;
        }

        responseCoordinator.startResponse(guildId, 'voice', user.id);

        memoryManager.addMessage({
          author: { id: user.id, username: user.user.username },
          content: text,
          channel: { id: channel.id },
        });

        const userContext = memoryManager.getUserContext(user.id);
        const channelContext = memoryManager.getChannelContext(channel.id);

        let searchResults = '';
        if (isWeatherQuery(text)) {
          const city = await extractCity(text);
          if (city) {
            const weatherData = await getWeather(city);
            if (weatherData) {
              searchResults = weatherData;
              logger.debug(`Weather added: ${city}`);
            }
          }
        } else {
          const analysis = await analyzeMessage(text);
          
          if (analysis.needsSearch && process.env.BRAVE_API_KEY) {
            try {
              searchResults = await braveSearch(text, process.env.BRAVE_API_KEY);
              logger.debug('Search results added');
            } catch (error) {
              logger.warn('Search failed, continuing without it');
            }
          }
        }

        const promptResult = buildPrompt(
          user.user.username,
          text,
          channelContext,
          userContext,
          true,
          searchResults
        );

        if (promptResult.blocked) {
          logger.debug(`Prompt blocked: ${promptResult.reason}`);
          return;
        }

        const prompt = promptResult.prompt;

        const thinkingDelay = 1000 + Math.random() * 2000;
        await new Promise(resolve => setTimeout(resolve, thinkingDelay));

        const response = await generateResponse(prompt, [...channelContext, ...userContext]);
        const enhanced = enhanceResponse(response, true);

        logger.success(`Responding to voice: "${enhanced}"`);

        if (config.voice.enabled) {
          await this.speakInVoice(guildId, enhanced);
        }
      } catch (error) {
        logger.error('Failed to handle voice message:', error);
      } finally {
        responseCoordinator.endResponse(guildId, 'voice');
      }
    }).catch(error => {
      logger.error('Voice queue error:', error);
    }).finally(() => {
      setTimeout(() => {
        this.processingVoice.delete(user.id);
      }, 2000);
    });
  }

  async leaveChannel(guildId) {
    const connection = this.connections.get(guildId);
    if (!connection) {
      return;
    }

    try {
      responseCoordinator.clearGuild(guildId);

      for (const [userId, dgConnection] of this.deepgramConnections.entries()) {
        try {
          dgConnection.finish();
        } catch (e) {
        }
      }
      this.deepgramConnections.clear();
      this.userTranscripts.clear();
      this.activeStreams.clear();
      this.processingVoice.clear();
      this.activeDialogs.clear();
      this.voiceModes.delete(guildId);

      connection.destroy();
      this.connections.delete(guildId);
      this.players.delete(guildId);
      this.receivers.delete(guildId);
      
      logger.info('Left voice channel');
    } catch (error) {
      logger.error('Error leaving voice channel:', error);
    }
  }

  async playAudio(guildId, audioBuffer, filename = 'audio.mp3') {
    const connection = this.connections.get(guildId);
    if (!connection) {
      throw new Error('Not connected to voice channel');
    }

    try {
      const tempPath = path.join('/tmp', filename);
      fs.writeFileSync(tempPath, audioBuffer);
      
      if (!fs.existsSync(tempPath)) {
        throw new Error('Failed to write audio file');
      }

      return new Promise((resolve, reject) => {
        let cleanupDone = false;
        
        const cleanup = () => {
          if (cleanupDone) return;
          cleanupDone = true;
          
          setTimeout(() => {
            try {
              if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
              }
            } catch (e) {
              logger.debug('Cleanup error:', e.message);
            }
          }, 1000);
        };

        const opusEncoder = new prism.opus.Encoder({
          rate: 48000,
          channels: 2,
          frameSize: 960,
        });

        const ffmpegProcess = ffmpeg(tempPath)
          .audioFrequency(48000)
          .audioChannels(2)
          .format('s16le')
          .on('start', (cmd) => {
            logger.debug('FFmpeg started');
          })
          .on('error', (err) => {
            logger.error('FFmpeg error:', err);
            connection.setSpeaking(false);
            cleanup();
            reject(err);
          })
          .on('end', () => {
            logger.debug('FFmpeg finished');
          });

        const ffmpegStream = ffmpegProcess.pipe();
        ffmpegStream.pipe(opusEncoder);

        connection.setSpeaking(true);

        opusEncoder.on('data', (chunk) => {
          if (connection.state.status === 'ready') {
            try {
              connection.dispatchAudio(chunk);
            } catch (err) {
              logger.error('Audio dispatch error:', err);
            }
          }
        });

        opusEncoder.on('end', () => {
          connection.setSpeaking(false);
          logger.success('✅ Audio playback finished');
          cleanup();
          resolve();
        });

        opusEncoder.on('error', (err) => {
          connection.setSpeaking(false);
          logger.error('Opus encoder error:', err);
          cleanup();
          reject(err);
        });

        setTimeout(() => {
          connection.setSpeaking(false);
          logger.warn('Audio playback timeout');
          cleanup();
          resolve();
        }, 30000);
      });
    } catch (error) {
      logger.error('Failed to play audio:', error);
      throw error;
    }
  }

  async speakInVoice(guildId, text) {
    if (!config.voice.enabled) {
      return;
    }

    return ttsQueue.add(async () => {
      try {
        logger.debug(`TTS: "${text.slice(0, 50)}${text.length > 50 ? '...' : ''}"`);
        const audioBuffer = await generateTTS(text);
        
        await this.playAudio(guildId, audioBuffer, `tts_${Date.now()}.mp3`);
      } catch (error) {
        logger.error('Failed to speak in voice:', error);
        throw error;
      }
    });
  }

  isConnected(guildId) {
    return this.connections.has(guildId);
  }

  getConnection(guildId) {
    return this.connections.get(guildId);
  }

  getStats() {
    return {
      deepgramConnections: this.deepgramConnections.size,
      activeStreams: this.activeStreams.size,
      processing: this.processingVoice.size,
      activeDialogs: this.activeDialogs.size,
    };
  }

  getVoiceMode(guildId) {
    return this.voiceModes.get(guildId) || 'full';
  }

  isMusicAllowed(guildId) {
    return this.getVoiceMode(guildId) === 'full';
  }
}

export const voiceManager = new VoiceManager();

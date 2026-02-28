import axios from 'axios';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { normalizeForTTS } from '../utils/textNormalizer.js';

const API_BASE = 'https://yellowfire.ru/api/v2';

let elevenlabsTTS, piperTTS, googleTTS, edgeTTS, checkPiperInstalled;

function getNextApiKey() {
  if (config.yellowfire.apiKeys.length === 0) {
    return config.yellowfire.apiKey;
  }
  
  if (config.yellowfire.apiKeys.length === 1) {
    return config.yellowfire.apiKeys[0];
  }
  
  const key = config.yellowfire.apiKeys[config.yellowfire.currentKeyIndex];
  config.yellowfire.currentKeyIndex = (config.yellowfire.currentKeyIndex + 1) % config.yellowfire.apiKeys.length;
  
  logger.debug(`Using API key ${config.yellowfire.currentKeyIndex + 1}/${config.yellowfire.apiKeys.length}`);
  
  return key;
}

async function loadTTSModules() {
  if (!elevenlabsTTS) {
    const modules = await Promise.all([
      import('./tts/elevenlabsTTS.js'),
      import('./tts/piperTTS.js'),
      import('./tts/googleTTS.js'),
      import('./tts/edgeTTS.js')
    ]);
    elevenlabsTTS = modules[0].generateElevenLabsTTS;
    piperTTS = modules[1].generatePiperTTS;
    checkPiperInstalled = modules[1].checkPiperInstalled;
    googleTTS = modules[2].generateGoogleTTS;
    edgeTTS = modules[3].generateEdgeTTS;
  }
}

export async function generateResponse(prompt, chatHistory = []) {
  try {
    const formattedHistory = chatHistory.map(msg => {
      if (typeof msg === 'string') {
        const match = msg.match(/^(.+?):\s*(.+)$/);
        if (match) {
          return {
            role: 'user',
            content: msg
          };
        }
        return {
          role: 'user',
          content: msg
        };
      }
      return msg;
    });

    const apiKey = getNextApiKey();
    
    const taskResponse = await axios.post(`${API_BASE}/chatgpt`, {
      model: config.yellowfire.model,
      prompt: prompt,
      chat_history: formattedHistory,
      internet_access: false,
      file_base64: '',
      mime_type: '',
    }, {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    const { request_id, wait } = taskResponse.data;
    logger.debug(`Got request_id: ${request_id}, waiting ${wait}s`);

    await new Promise(resolve => setTimeout(resolve, wait * 1000));

    for (let attempt = 0; attempt < 30; attempt++) {
      const statusResponse = await axios.get(`${API_BASE}/status/${request_id}`, {
        headers: {
          'api-key': apiKey,
        },
      });

      const { status, response } = statusResponse.data;

      if (status === 'completed' || status === 'success') {
        return response.text || response;
      }

      if (status === 'failed' || status === 'error') {
        throw new Error('Generation failed');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Generation timeout');
  } catch (error) {
    logger.error('YellowFire API error:', error.response?.data || error.message);
    throw error;
  }
}

export async function generateTTS(text) {
  const ttsProvider = process.env.TTS_PROVIDER || 'edge';
  
  await loadTTSModules();
  
  const normalizedText = normalizeForTTS(text);
  logger.debug(`TTS normalized: "${text.slice(0, 50)}..." -> "${normalizedText.slice(0, 50)}..."`);
  
  try {
    if (ttsProvider === 'edge') {
      const voiceName = process.env.EDGE_TTS_VOICE || 'ru-RU-DmitryNeural';
      logger.debug(`Using Edge TTS: ${voiceName}`);
      return await edgeTTS(normalizedText, voiceName);
    }
    
    if (ttsProvider === 'google') {
      const voiceName = process.env.GOOGLE_TTS_VOICE || 'ru-RU-Wavenet-B';
      logger.debug(`Using Google TTS: ${voiceName}`);
      return await googleTTS(normalizedText, voiceName);
    }
    
    if (ttsProvider === 'piper') {
      const voiceModel = process.env.PIPER_VOICE || 'ru_RU-ruslan-medium';
      logger.debug(`Using Piper TTS: ${voiceModel}`);
      try {
        return await piperTTS(normalizedText, voiceModel);
      } catch (error) {
        logger.error(`Piper TTS failed: ${error.message}`);
        logger.warn('Falling back to Edge TTS');
        return await edgeTTS(normalizedText);
      }
    }
    
    if (ttsProvider === 'elevenlabs') {
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        throw new Error('ELEVENLABS_API_KEY not set');
      }
      const voiceId = config.voice.ttsVoice || '21m00Tcm4TlvDq8ikWAM';
      logger.debug(`Using ElevenLabs TTS: ${voiceId}`);
      return await elevenlabsTTS(normalizedText, apiKey, voiceId);
    }
    
    if (ttsProvider === 'yellowfire') {
      logger.debug('Using YellowFire TTS');
      return await generateYellowFireTTS(normalizedText);
    }
    
    logger.debug('Using Edge TTS (default)');
    return await edgeTTS(normalizedText);
  } catch (error) {
    if (ttsProvider !== 'edge') {
      logger.warn(`${ttsProvider} TTS failed, falling back to Edge TTS`);
      try {
        return await edgeTTS(normalizedText);
      } catch (edgeError) {
        logger.error('Edge TTS also failed');
        throw edgeError;
      }
    }
    
    logger.error('TTS error:', error.message);
    throw error;
  }
}

async function generateYellowFireTTS(text) {
  try {
    const voice = config.voice.ttsVoice;
    logger.debug(`TTS using voice: ${voice}`);
    
    const apiKey = getNextApiKey();
    
    const taskResponse = await axios.post(`${API_BASE}/tts`, {
      model: 'elevenlabs',
      prompt: text,
      voice: voice,
    }, {
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    const { request_id, wait } = taskResponse.data;
    logger.debug(`TTS request_id: ${request_id}`);

    await new Promise(resolve => setTimeout(resolve, wait * 1000));

    for (let attempt = 0; attempt < 30; attempt++) {
      const statusResponse = await axios.get(`${API_BASE}/status/${request_id}`, {
        headers: {
          'api-key': apiKey,
        },
      });

      const { status, response } = statusResponse.data;
      
      logger.debug(`TTS status: ${status}, attempt: ${attempt + 1}`);

      if (status === 'completed' || status === 'success') {
        logger.debug('TTS response:', JSON.stringify(response).slice(0, 500));
        
        const dataUri = response.voice_model_v3?.[0];
        if (!dataUri) {
          logger.error('No audio data in response. Full response:', JSON.stringify(response));
          throw new Error('No audio data in response');
        }

        logger.debug('Data URI length:', dataUri.length);
        logger.debug('Data URI prefix:', dataUri.slice(0, 100));

        if (!dataUri.includes('base64,')) {
          logger.error('Invalid data URI format:', dataUri.slice(0, 100));
          throw new Error('Invalid audio data format');
        }

        const base64Data = dataUri.split(',')[1];
        logger.debug('Base64 data length:', base64Data ? base64Data.length : 0);
        
        if (!base64Data || base64Data.length === 0) {
          logger.error('Empty base64 data. Full dataUri:', dataUri);
          throw new Error('Empty audio data');
        }
        
        const audioBuffer = Buffer.from(base64Data, 'base64');
        logger.debug(`TTS audio buffer size: ${audioBuffer.length} bytes`);
        
        if (audioBuffer.length === 0) {
          throw new Error('Generated audio buffer is empty');
        }
        
        return audioBuffer;
      }

      if (status === 'failed' || status === 'error') {
        logger.error('TTS generation failed:', response);
        throw new Error('TTS generation failed');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('TTS timeout');
  } catch (error) {
    logger.error('TTS API error:', error.response?.data || error.message);
    throw error;
  }
}

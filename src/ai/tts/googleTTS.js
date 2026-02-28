import textToSpeech from '@google-cloud/text-to-speech';
import { logger } from '../../utils/logger.js';

let ttsClient = null;

/**
 * Initialize Google Cloud TTS client
 */
function initClient() {
  if (ttsClient) return ttsClient;
  
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  
  if (!apiKey) {
    throw new Error('GOOGLE_TTS_API_KEY not set in .env');
  }
  
  ttsClient = new textToSpeech.TextToSpeechClient({
    apiKey: apiKey
  });
  
  return ttsClient;
}

/**
 * Generate TTS using Google Cloud Text-to-Speech
 * Free tier: 1 million characters per month
 * 
 * @param {string} text - Text to synthesize
 * @param {string} voiceName - Voice name (e.g., 'ru-RU-Wavenet-B')
 * @returns {Promise<Buffer>} Audio buffer (MP3)
 */
export async function generateGoogleTTS(text, voiceName = 'ru-RU-Wavenet-B') {
  try {
    logger.debug(`Google TTS: ${voiceName}`);
    
    const client = initClient();
    
    // Construct the request
    const request = {
      input: { text: text },
      voice: {
        languageCode: 'ru-RU',
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,    // 0.25 to 4.0
        pitch: 0.0,           // -20.0 to 20.0
        volumeGainDb: 0.0,    // -96.0 to 16.0
        effectsProfileId: ['headphone-class-device'], // Optimize for headphones
      },
    };

    // Perform the text-to-speech request
    const [response] = await client.synthesizeSpeech(request);
    
    if (!response.audioContent) {
      throw new Error('No audio content in response');
    }
    
    logger.success(`✅ Google TTS generated ${response.audioContent.length} bytes`);
    return Buffer.from(response.audioContent);
    
  } catch (error) {
    logger.error('Google TTS error:', error.message);
    throw error;
  }
}

/**
 * List available Google TTS voices
 */
export async function listGoogleVoices() {
  try {
    const client = initClient();
    const [result] = await client.listVoices({ languageCode: 'ru-RU' });
    
    logger.info('Available Russian voices:');
    result.voices.forEach(voice => {
      logger.info(`- ${voice.name} (${voice.ssmlGender})`);
    });
    
    return result.voices;
  } catch (error) {
    logger.error('Failed to list voices:', error.message);
    return [];
  }
}

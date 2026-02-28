import { EdgeSpeechTTS } from '@lobehub/tts';
import { logger } from '../../utils/logger.js';

const tts = new EdgeSpeechTTS();

/**
 * Generate TTS using Microsoft Edge TTS
 * Completely FREE, no API key needed, excellent quality
 * 
 * @param {string} text - Text to synthesize
 * @param {string} voice - Voice name
 * @returns {Promise<Buffer>} Audio buffer (MP3)
 */
export async function generateEdgeTTS(text, voice = 'ru-RU-DmitryNeural') {
  try {
    logger.debug(`Edge TTS: ${voice}`);
    
    const response = await tts.create({
      input: text,
      options: {
        voice: voice,
      },
    });

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error('No audio data generated');
    }
    
    logger.success(`✅ Edge TTS generated ${audioBuffer.length} bytes`);
    return audioBuffer;
    
  } catch (error) {
    logger.error('Edge TTS error:', error.message);
    throw error;
  }
}

/**
 * Available Russian voices for Edge TTS
 * All are Neural (high quality) and FREE
 */
export const EDGE_RUSSIAN_VOICES = {
  // Male voices
  'ru-RU-DmitryNeural': 'Дмитрий (мужской, чёткий) - рекомендуется',
  
  // Female voices  
  'ru-RU-SvetlanaNeural': 'Светлана (женский, приятный)',
  'ru-RU-DariyaNeural': 'Дария (женский, молодой)',
};

/**
 * List available voices
 */
export function listEdgeVoices() {
  logger.info('Available Edge TTS Russian voices:');
  Object.entries(EDGE_RUSSIAN_VOICES).forEach(([voice, description]) => {
    logger.info(`- ${voice}: ${description}`);
  });
}

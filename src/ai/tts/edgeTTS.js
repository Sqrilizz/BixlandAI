import edgeTTS from 'edge-tts-node';
import { logger } from '../../utils/logger.js';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const { MsEdgeTTS, OUTPUT_FORMAT } = edgeTTS;

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
    
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    
    const tempFile = join(process.cwd(), `temp_edge_${Date.now()}.mp3`);
    
    await tts.toFile(tempFile, text);
    
    // Read the file
    const fs = await import('fs/promises');
    const audioBuffer = await fs.readFile(tempFile);
    
    // Clean up
    try {
      await fs.unlink(tempFile);
    } catch (err) {
      logger.warn('Failed to delete temp file:', err.message);
    }
    
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

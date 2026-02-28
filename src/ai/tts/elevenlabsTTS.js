import axios from 'axios';
import { logger } from '../../utils/logger.js';

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

/**
 * Generate TTS using ElevenLabs API
 * 
 * Popular voices:
 * - 21m00Tcm4TlvDq8ikWAM - Rachel (female, calm)
 * - AZnzlk1XvdvUeBnXmlld - Domi (female, strong)
 * - EXAVITQu4vr4xnSDxMaL - Bella (female, soft)
 * - ErXwobaYiN019PkySvjV - Antoni (male, well-rounded)
 * - MF3mGyEYCl7XYWbV9V6O - Elli (female, emotional)
 * - TxGEqnHWrfWFTfGW9XjX - Josh (male, deep)
 * - VR6AewLTigWG4xSOukaG - Arnold (male, crisp)
 * - pNInz6obpgDQGcFmaJgB - Adam (male, deep)
 * - yoZ06aMxZJJ28mfd3POQ - Sam (male, dynamic)
 * - onwK4e9ZLuTAKqWW03F9 - Daniel (male, deep, authoritative)
 */
export async function generateElevenLabsTTS(text, apiKey, voiceId = '21m00Tcm4TlvDq8ikWAM') {
  try {
    logger.debug(`ElevenLabs TTS: voice=${voiceId}`);

    const response = await axios.post(
      `${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`,
      {
        text: text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      },
      {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
      }
    );

    return Buffer.from(response.data);
  } catch (error) {
    logger.error('ElevenLabs TTS error:', error.response?.data?.detail || error.message);
    throw error;
  }
}

/**
 * Get available voices from ElevenLabs
 */
export async function getElevenLabsVoices(apiKey) {
  try {
    const response = await axios.get(`${ELEVENLABS_API_BASE}/voices`, {
      headers: {
        'xi-api-key': apiKey,
      },
    });

    return response.data.voices;
  } catch (error) {
    logger.error('Failed to get ElevenLabs voices:', error.message);
    throw error;
  }
}

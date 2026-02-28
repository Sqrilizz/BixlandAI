import axios from 'axios';
import { logger } from './logger.js';

const MEME_API_BASE = 'https://meme-api.com/gimme';

export async function getRandomMeme() {
  try {
    const response = await axios.get(`${MEME_API_BASE}/Pikabu`, {
      timeout: 5000
    });

    if (response.data && response.data.url && !response.data.nsfw) {
      logger.debug(`Meme: ${response.data.title}`);
      return {
        url: response.data.url,
        title: response.data.title
      };
    }

    return null;
  } catch (error) {
    logger.error('Failed to get meme:', error.message);
    return null;
  }
}

export function shouldSendMeme(text) {
  const memeKeywords = [
    'мем',
    'мемчик',
    'мемас',
    'мемесик',
    'покажи мем',
    'скинь мем',
    'дай мем',
    'мемов',
    'мемы',
    'мемасик'
  ];

  const lowerText = text.toLowerCase();
  return memeKeywords.some(keyword => lowerText.includes(keyword));
}



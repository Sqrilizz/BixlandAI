import axios from 'axios';
import { logger } from './logger.js';

const BRAVE_API_BASE = 'https://api.search.brave.com/res/v1';

export async function braveSearch(query, apiKey) {
  try {
    logger.debug(`Search: "${query}"`);

    const response = await axios.get(`${BRAVE_API_BASE}/web/search`, {
      params: {
        q: query,
        count: 5,
        text_decorations: false,
        search_lang: 'ru',
      },
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
    });

    const results = response.data.web?.results || [];
    
    if (results.length === 0) {
      return 'Ничего не найдено.';
    }

    let formatted = 'Результаты поиска:\n\n';
    results.slice(0, 3).forEach((result, index) => {
      formatted += `${index + 1}. ${result.title}\n`;
      formatted += `${result.description || result.snippet || ''}\n`;
      formatted += `Источник: ${result.url}\n\n`;
    });

    logger.success(`✅ Found ${results.length} results`);
    return formatted;
  } catch (error) {
    logger.error('Brave Search error:', error.response?.data || error.message);
    throw error;
  }
}

import axios from 'axios';
import { logger } from './logger.js';
import { normalizeCityName } from './groqHelper.js';

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

/**
 * Get weather for a city
 * @param {string} city - City name (e.g., "Новосибирск", "Moscow", "Tallinn")
 * @returns {Promise<string|null>} Formatted weather info or null
 */
export async function getWeather(city) {
  if (!OPENWEATHER_API_KEY) {
    logger.warn('⚠️ OPENWEATHER_API_KEY not configured');
    return null;
  }

  try {
    logger.debug(`Weather: ${city}`);

    let response;
    try {
      response = await axios.get(`${OPENWEATHER_BASE_URL}/weather`, {
        params: {
          q: city,
          appid: OPENWEATHER_API_KEY,
          units: 'metric',
          lang: 'ru'
        },
        timeout: 5000
      });
    } catch (error) {
      if (error.response?.status === 404 && !city.endsWith('ь')) {
        logger.debug(`Retry with soft sign: ${city}ь`);
        try {
          response = await axios.get(`${OPENWEATHER_BASE_URL}/weather`, {
            params: {
              q: city + 'ь',
              appid: OPENWEATHER_API_KEY,
              units: 'metric',
              lang: 'ru'
            },
            timeout: 5000
          });
        } catch (retryError) {
          throw error; // Throw original error
        }
      } else {
        throw error;
      }
    }

    const data = response.data;
    
    const weather = {
      city: data.name,
      country: data.sys.country,
      temp: Math.round(data.main.temp),
      feels_like: Math.round(data.main.feels_like),
      description: data.weather[0].description,
      humidity: data.main.humidity,
      wind_speed: Math.round(data.wind.speed),
      pressure: data.main.pressure
    };

    const formatted = `Погода в ${weather.city}, ${weather.country}:
Температура: ${weather.temp}°C (ощущается как ${weather.feels_like}°C)
Описание: ${weather.description}
Влажность: ${weather.humidity}%
Ветер: ${weather.wind_speed} м/с
Давление: ${weather.pressure} гПа`;

    logger.success(`✅ Weather data retrieved for ${weather.city}`);
    return formatted;

  } catch (error) {
    if (error.response?.status === 404) {
      logger.warn(`⚠️ City not found: ${city}`);
      return null;
    }
    logger.error('Failed to get weather:', error.message);
    return null;
  }
}

/**
 * Check if message is asking about weather
 */
export function isWeatherQuery(text) {
  if (!text) return false;
  
  const weatherKeywords = [
    'погода',
    'погоду',
    'погоде',
    'погоды',
    'температура',
    'температуру',
    'градус',
    'weather',
    'холодно',
    'тепло',
    'жарко',
    'мороз',
    'снег',
    'дождь',
    'какая погода',
    'как погода',
    'какая температура'
  ];

  const lowerText = text.toLowerCase();
  
  // Check if any weather keyword is present
  return weatherKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Extract city name from weather query
 */
export async function extractCity(text) {
  if (!text) return null;

  const patterns = [
    /погод[уыае]?\s+в\s+([а-яёa-z\s-]+)/i,
    /погод[уыае]?\s+([а-яёa-z\s-]+)/i,
    /температур[уыае]?\s+в\s+([а-яёa-z\s-]+)/i,
    /температур[уыае]?\s+([а-яёa-z\s-]+)/i,
    /weather in ([a-z\s-]+)/i,
    /как погода в ([а-яёa-z\s-]+)/i,
    /какая погода в ([а-яёa-z\s-]+)/i,
    /посмотри.*погод[уыае]?\s+в\s+([а-яёa-z\s-]+)/i,
    /узнай.*погод[уыае]?\s+в\s+([а-яёa-z\s-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const cityRaw = match[1].trim();
      const cleaned = cityRaw.replace(/[.,!?;:]+$/, '').trim();
      const normalized = await normalizeCityName(cleaned);
      return normalized;
    }
  }

  return null;
}

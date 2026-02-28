import axios from 'axios';
import { logger } from './logger.js';

const GROQ_API_KEYS = process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.split(',').map(k => k.trim()) : [];
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
const cache = new Map();
let currentKeyIndex = 0;

function getNextKey() {
  if (GROQ_API_KEYS.length === 0) return null;
  const key = GROQ_API_KEYS[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % GROQ_API_KEYS.length;
  return key;
}

export async function groqQuickTask(systemPrompt, userInput, options = {}) {
  const apiKey = getNextKey();
  if (!apiKey) {
    logger.warn('⚠️ GROQ_API_KEY not configured');
    return null;
  }

  const cacheKey = `${systemPrompt}:${userInput}`;
  if (cache.has(cacheKey)) {
    logger.debug('Groq cache hit');
    return cache.get(cacheKey);
  }

  const {
    model = 'llama-3.3-70b-versatile',
    temperature = 0.1,
    maxTokens = 50,
    timeout = 3000
  } = options;

  try {
    const response = await axios.post(
      GROQ_BASE_URL,
      {
        model,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userInput
          }
        ],
        temperature,
        max_tokens: maxTokens
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout
      }
    );

    const result = response.data.choices[0].message.content.trim();
    cache.set(cacheKey, result);
    
    if (cache.size > 1000) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    logger.debug(`Groq: "${result}"`);
    return result;
  } catch (error) {
    logger.error('Groq API error:', error.message);
    return null;
  }
}

/**
 * Normalize city name to English for weather APIs
 */
export async function normalizeCityName(cityRaw) {
  const systemPrompt = `Ты помощник для нормализации названий городов. 
Верни ТОЛЬКО название города в именительном падеже на английском языке для OpenWeatherMap API. 
Примеры: 
"Москве" -> "Moscow"
"Нарве" -> "Narva" 
"Ставраполе" -> "Stavropol"
"Питере" -> "Saint Petersburg"
Отвечай ТОЛЬКО названием города, без пояснений.`;

  const result = await groqQuickTask(systemPrompt, cityRaw, { maxTokens: 20 });
  
  if (!result) {
    return cityRaw.charAt(0).toUpperCase() + cityRaw.slice(1).toLowerCase();
  }
  
  return result;
}

/**
 * Extract intent from user message (for routing)
 */
export async function extractIntent(message) {
  const systemPrompt = `Определи намерение пользователя. Верни ТОЛЬКО одно слово:
- weather (погода)
- time (время/дата)
- search (поиск информации)
- chat (обычный разговор)
Отвечай ТОЛЬКО одним словом.`;

  return await groqQuickTask(systemPrompt, message, { maxTokens: 10 });
}

/**
 * Translate text quickly
 */
export async function quickTranslate(text, fromLang, toLang) {
  const systemPrompt = `Переведи текст с ${fromLang} на ${toLang}. Верни ТОЛЬКО перевод, без пояснений.`;
  return await groqQuickTask(systemPrompt, text, { maxTokens: 100 });
}

/**
 * Extract entities (names, places, dates) from text
 */
export async function extractEntities(text, entityType) {
  const systemPrompt = `Извлеки ${entityType} из текста. Верни ТОЛЬКО найденное значение, без пояснений.`;
  return await groqQuickTask(systemPrompt, text, { maxTokens: 30 });
}

/**
 * Classify sentiment (positive/negative/neutral)
 */
export async function classifySentiment(text) {
  const systemPrompt = `Определи тональность сообщения. Верни ТОЛЬКО одно слово: positive, negative или neutral.`;
  return await groqQuickTask(systemPrompt, text, { maxTokens: 10 });
}

/**
 * Fix typos and grammar
 */
export async function fixTypos(text) {
  const systemPrompt = `Исправь опечатки и грамматические ошибки. Верни ТОЛЬКО исправленный текст.`;
  return await groqQuickTask(systemPrompt, text, { maxTokens: 200 });
}

export async function extractMemoryFacts(message) {
  const systemPrompt = `Извлеки важные факты о пользователе из сообщения. Верни список фактов через запятую или "нет" если нечего запоминать.
Примеры фактов: имя, возраст, город, работа, учёба, хобби, предпочтения.
Формат: "Имя: Иван", "Возраст: 25", "Город: Москва", "Любит: программирование"`;

  const result = await groqQuickTask(systemPrompt, message, { maxTokens: 100 });
  
  if (!result || result.toLowerCase() === 'нет' || result.toLowerCase() === 'no') {
    return [];
  }
  
  return result.split(',').map(f => f.trim()).filter(f => f.length > 0);
}

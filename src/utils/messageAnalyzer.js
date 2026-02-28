import { groqQuickTask } from './groqHelper.js';

export async function analyzeMessage(text) {
  const systemPrompt = `Проанализируй сообщение и верни JSON:
{"type": "question|command|greeting|farewell|thanks|opinion|fact|statement", "sentiment": "positive|negative|neutral", "needsSearch": true|false}

type:
- question: вопросы (как, что, где, когда, почему)
- command: команды (сделай, покажи, найди)
- greeting: приветствия
- farewell: прощания
- thanks: благодарности
- opinion: запрос мнения
- fact: запрос фактов (погода, время, курс)
- statement: обычное утверждение

needsSearch: true если нужна актуальная информация из интернета (погода, новости, факты, цены, курсы)

Отвечай ТОЛЬКО JSON, без пояснений.`;

  try {
    const result = await groqQuickTask(systemPrompt, text, { maxTokens: 100, temperature: 0.1 });
    if (result) {
      const parsed = JSON.parse(result);
      return {
        type: parsed.type || 'statement',
        sentiment: parsed.sentiment || 'neutral',
        needsSearch: parsed.needsSearch || false
      };
    }
  } catch (error) {
    // Fallback to simple regex if Groq fails
  }

  return fallbackAnalyze(text);
}

function fallbackAnalyze(text) {
  const lower = text.toLowerCase();
  
  const patterns = {
    question: /\?|как|что|где|когда|почему|зачем|кто|какой|сколько/,
    command: /!|сделай|покажи|найди|посмотри|скажи|расскажи/,
    greeting: /привет|здравствуй|хай|йо|салют|добр/,
    farewell: /пока|до свидания|увидимся|бай|прощай/,
    thanks: /спасибо|благодарю|thanks|thx/,
    opinion: /думаешь|считаешь|мнение|как тебе|нравится/,
    fact: /погода|время|дата|температура|курс|цена/
  };

  const type = Object.keys(patterns).find(key => patterns[key].test(lower)) || 'statement';
  
  const positive = /хорошо|отлично|круто|супер|класс|норм|ок|👍|😊|😄/;
  const negative = /плохо|ужасно|херово|фигня|не работает|ошибка|😞|😠/;
  
  let sentiment = 'neutral';
  if (positive.test(lower)) sentiment = 'positive';
  if (negative.test(lower)) sentiment = 'negative';
  
  const needsSearch = type === 'fact' || (type === 'question' && /погода|курс|цена|новост/.test(lower));
  
  return { type, sentiment, needsSearch };
}

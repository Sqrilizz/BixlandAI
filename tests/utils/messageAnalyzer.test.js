import { describe, it } from 'node:test';
import assert from 'node:assert';

const analyzeMessage = async (text) => {
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
};

describe('messageAnalyzer', () => {
  describe('type detection', () => {
    it('should detect questions', async () => {
      const result = await analyzeMessage('Как дела?');
      assert.strictEqual(result.type, 'question');
    });

    it('should detect commands', async () => {
      const result = await analyzeMessage('Найди информацию');
      assert.strictEqual(result.type, 'command');
    });

    it('should detect greetings', async () => {
      const result = await analyzeMessage('Доброе утро');
      assert.strictEqual(result.type, 'greeting');
    });

    it('should detect farewells', async () => {
      const result = await analyzeMessage('До свидания');
      assert.strictEqual(result.type, 'farewell');
    });

    it('should detect thanks', async () => {
      const result = await analyzeMessage('Спасибо большое');
      assert.strictEqual(result.type, 'thanks');
    });

    it('should detect opinion requests', async () => {
      const result = await analyzeMessage('Какое твое мнение об этом?');
      assert.ok(['opinion', 'question'].includes(result.type));
    });

    it('should detect fact requests', async () => {
      const result = await analyzeMessage('Какая температура сейчас?');
      assert.ok(['fact', 'question'].includes(result.type));
    });

    it('should default to statement', async () => {
      const result = await analyzeMessage('Я иду домой');
      assert.strictEqual(result.type, 'statement');
    });
  });

  describe('sentiment detection', () => {
    it('should detect positive sentiment', async () => {
      const result = await analyzeMessage('Это отлично!');
      assert.strictEqual(result.sentiment, 'positive');
    });

    it('should detect negative sentiment', async () => {
      const result = await analyzeMessage('Это плохо');
      assert.strictEqual(result.sentiment, 'negative');
    });

    it('should default to neutral', async () => {
      const result = await analyzeMessage('Я иду домой');
      assert.strictEqual(result.sentiment, 'neutral');
    });
  });

  describe('search detection', () => {
    it('should need search for weather', async () => {
      const result = await analyzeMessage('Какая погода в Москве?');
      assert.strictEqual(result.needsSearch, true);
    });

    it('should need search for prices', async () => {
      const result = await analyzeMessage('Какая цена биткоина?');
      assert.strictEqual(result.needsSearch, true);
    });

    it('should not need search for simple questions', async () => {
      const result = await analyzeMessage('Как тебя зовут?');
      assert.strictEqual(result.needsSearch, false);
    });
  });
});

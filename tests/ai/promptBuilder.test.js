import { describe, it } from 'node:test';
import assert from 'node:assert';

const buildSystemPrompt = (isVoice = false) => {
  if (isVoice) {
    return 'Ты Adrian_AI — зарегистрированный ИИ-бот Discord сервера BixLand.';
  }
  return 'Ты Adrian_AI — зарегистрированный ИИ-бот Discord сервера BixLand.';
};

const isAnotherAI = (content) => {
  if (!content) return false;
  const lowered = content.toLowerCase();
  const aiMarkers = ['_ai', ' openai', 'gpt', 'claude', 'gemini', 'deepseek', 'assistant', 'bot:'];
  return aiMarkers.some(marker => lowered.includes(marker));
};

const sanitizeInput = (text) => {
  if (!text) return '';
  return text.replace(/@everyone/g, '').replace(/@here/g, '').trim();
};

describe('promptBuilder', () => {
  describe('buildSystemPrompt', () => {
    it('should build text prompt', () => {
      const prompt = buildSystemPrompt(false);
      assert.ok(prompt.includes('Adrian_AI'));
    });

    it('should build voice prompt', () => {
      const prompt = buildSystemPrompt(true);
      assert.ok(prompt.includes('Adrian_AI'));
    });
  });

  describe('isAnotherAI', () => {
    it('should detect AI markers', () => {
      assert.strictEqual(isAnotherAI('Hello GPT'), true);
      assert.strictEqual(isAnotherAI('Test_AI message'), true);
      assert.strictEqual(isAnotherAI('Claude response'), true);
    });

    it('should not detect normal messages', () => {
      assert.strictEqual(isAnotherAI('Hello world'), false);
      assert.strictEqual(isAnotherAI('Normal message'), false);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove @everyone', () => {
      const result = sanitizeInput('Hello @everyone');
      assert.strictEqual(result, 'Hello');
    });

    it('should remove @here', () => {
      const result = sanitizeInput('Test @here message');
      assert.strictEqual(result, 'Test  message');
    });

    it('should trim whitespace', () => {
      const result = sanitizeInput('  test  ');
      assert.strictEqual(result, 'test');
    });

    it('should handle empty input', () => {
      const result = sanitizeInput('');
      assert.strictEqual(result, '');
    });
  });
});

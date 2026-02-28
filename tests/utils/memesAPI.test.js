import { describe, it } from 'node:test';
import assert from 'node:assert';

const shouldSendMeme = (content) => {
  const memeKeywords = [
    'мем', 'мемчик', 'мемас', 'мемесик',
    'скинь мем', 'покажи мем', 'дай мем',
    'мемов', 'мемасик'
  ];
  
  const lower = content.toLowerCase();
  return memeKeywords.some(keyword => lower.includes(keyword));
};

describe('memesAPI', () => {
  describe('shouldSendMeme', () => {
    it('should detect meme requests', () => {
      assert.strictEqual(shouldSendMeme('Скинь мем'), true);
      assert.strictEqual(shouldSendMeme('Покажи мемчик'), true);
      assert.strictEqual(shouldSendMeme('Дай мемас'), true);
    });

    it('should detect meme word variations', () => {
      assert.strictEqual(shouldSendMeme('Хочу мем'), true);
      assert.strictEqual(shouldSendMeme('Мемасик пожалуйста'), true);
      assert.strictEqual(shouldSendMeme('Мемов хочу'), true);
    });

    it('should not detect non-meme messages', () => {
      assert.strictEqual(shouldSendMeme('Привет'), false);
      assert.strictEqual(shouldSendMeme('Как дела?'), false);
      assert.strictEqual(shouldSendMeme('Расскажи что-то'), false);
    });

    it('should be case insensitive', () => {
      assert.strictEqual(shouldSendMeme('СКИНЬ МЕМ'), true);
      assert.strictEqual(shouldSendMeme('МеМчИк'), true);
    });
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert';

const shouldRespond = (client, message) => {
  const content = message.content.toLowerCase();
  
  const activationWords = ['адриан', 'adrian', 'эдриан', 'эй'];
  const hasActivation = activationWords.some(word => content.includes(word));
  
  const isMentioned = message.mentions?.users?.has(client.user.id);
  const isReply = !!message.reference?.messageId;
  
  return hasActivation || isMentioned || isReply;
};

describe('filters', () => {
  describe('shouldRespond', () => {
    const mockClient = {
      user: {
        id: '123456',
        username: 'Adrian_AI'
      }
    };

    it('should respond to activation words', () => {
      const message = {
        content: 'Адриан, привет',
        mentions: { users: new Map() }
      };
      
      assert.strictEqual(shouldRespond(mockClient, message), true);
    });

    it('should respond to mentions', () => {
      const mentions = new Map();
      mentions.set('123456', {});
      
      const message = {
        content: 'Привет',
        mentions: { users: mentions }
      };
      
      assert.strictEqual(shouldRespond(mockClient, message), true);
    });

    it('should respond to replies', () => {
      const message = {
        content: 'Да',
        mentions: { users: new Map() },
        reference: { messageId: '789' }
      };
      
      assert.strictEqual(shouldRespond(mockClient, message), true);
    });

    it('should not respond without triggers', () => {
      const message = {
        content: 'Просто сообщение',
        mentions: { users: new Map() }
      };
      
      assert.strictEqual(shouldRespond(mockClient, message), false);
    });

    it('should handle case insensitive activation', () => {
      const message = {
        content: 'АДРИАН помоги',
        mentions: { users: new Map() }
      };
      
      assert.strictEqual(shouldRespond(mockClient, message), true);
    });

    it('should detect activation word in middle', () => {
      const message = {
        content: 'Эй, как дела?',
        mentions: { users: new Map() }
      };
      
      assert.strictEqual(shouldRespond(mockClient, message), true);
    });
  });
});

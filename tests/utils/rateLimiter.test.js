import { describe, it } from 'node:test';
import assert from 'node:assert';

class RateLimiter {
  constructor(maxMessages, windowMs) {
    this.maxMessages = maxMessages;
    this.windowMs = windowMs;
    this.count = 0;
    this.resetTime = Date.now() + windowMs;
  }

  canSend() {
    this.checkReset();
    return this.count < this.maxMessages;
  }

  increment() {
    this.checkReset();
    this.count++;
  }

  checkReset() {
    if (Date.now() >= this.resetTime) {
      this.count = 0;
      this.resetTime = Date.now() + this.windowMs;
    }
  }

  getCount() {
    this.checkReset();
    return this.count;
  }
}

describe('rateLimiter', () => {
  it('should allow messages under limit', () => {
    const limiter = new RateLimiter(5, 60000);
    
    assert.strictEqual(limiter.canSend(), true);
    limiter.increment();
    assert.strictEqual(limiter.getCount(), 1);
  });

  it('should block messages over limit', () => {
    const limiter = new RateLimiter(2, 60000);
    
    limiter.increment();
    limiter.increment();
    
    assert.strictEqual(limiter.canSend(), false);
  });

  it('should increment count', () => {
    const limiter = new RateLimiter(5, 60000);
    
    limiter.increment();
    limiter.increment();
    
    assert.strictEqual(limiter.getCount(), 2);
  });

  it('should track remaining messages', () => {
    const limiter = new RateLimiter(5, 60000);
    
    limiter.increment();
    limiter.increment();
    
    const remaining = limiter.maxMessages - limiter.getCount();
    assert.strictEqual(remaining, 3);
  });
});

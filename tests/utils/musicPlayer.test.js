import { describe, it } from 'node:test';
import assert from 'node:assert';

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

class MusicQueue {
  constructor() {
    this.queues = new Map();
  }

  getQueue(guildId) {
    if (!this.queues.has(guildId)) {
      this.queues.set(guildId, {
        songs: [],
        playing: false,
        player: null,
        currentSong: null,
        volume: 0.5
      });
    }
    return this.queues.get(guildId);
  }

  addSong(guildId, song) {
    const queue = this.getQueue(guildId);
    queue.songs.push(song);
  }

  getNextSong(guildId) {
    const queue = this.getQueue(guildId);
    return queue.songs.shift();
  }

  clear(guildId) {
    const queue = this.getQueue(guildId);
    queue.songs = [];
    queue.playing = false;
    queue.currentSong = null;
  }

  getCurrentSong(guildId) {
    const queue = this.getQueue(guildId);
    return queue.currentSong;
  }

  getSongs(guildId) {
    const queue = this.getQueue(guildId);
    return queue.songs;
  }

  isPlaying(guildId) {
    const queue = this.getQueue(guildId);
    return queue.playing;
  }
}

describe('musicPlayer', () => {
  describe('formatDuration', () => {
    it('should format seconds correctly', () => {
      assert.strictEqual(formatDuration(0), '0:00');
      assert.strictEqual(formatDuration(30), '0:30');
      assert.strictEqual(formatDuration(60), '1:00');
      assert.strictEqual(formatDuration(90), '1:30');
      assert.strictEqual(formatDuration(169), '2:49');
      assert.strictEqual(formatDuration(3661), '61:01');
    });

    it('should handle decimal seconds', () => {
      assert.strictEqual(formatDuration(169.669), '2:49');
      assert.strictEqual(formatDuration(90.5), '1:30');
    });
  });

  describe('MusicQueue', () => {
    it('should create queue for guild', () => {
      const queue = new MusicQueue();
      const guildQueue = queue.getQueue('guild1');
      
      assert.ok(guildQueue);
      assert.strictEqual(guildQueue.playing, false);
      assert.strictEqual(guildQueue.songs.length, 0);
      assert.strictEqual(guildQueue.volume, 0.5);
    });

    it('should add songs to queue', () => {
      const queue = new MusicQueue();
      const song = { title: 'Test Song', url: 'https://test.com' };
      
      queue.addSong('guild1', song);
      const songs = queue.getSongs('guild1');
      
      assert.strictEqual(songs.length, 1);
      assert.strictEqual(songs[0].title, 'Test Song');
    });

    it('should get next song', () => {
      const queue = new MusicQueue();
      const song1 = { title: 'Song 1', url: 'https://test1.com' };
      const song2 = { title: 'Song 2', url: 'https://test2.com' };
      
      queue.addSong('guild1', song1);
      queue.addSong('guild1', song2);
      
      const next = queue.getNextSong('guild1');
      assert.strictEqual(next.title, 'Song 1');
      
      const remaining = queue.getSongs('guild1');
      assert.strictEqual(remaining.length, 1);
      assert.strictEqual(remaining[0].title, 'Song 2');
    });

    it('should clear queue', () => {
      const queue = new MusicQueue();
      queue.addSong('guild1', { title: 'Test', url: 'https://test.com' });
      
      queue.clear('guild1');
      
      const songs = queue.getSongs('guild1');
      assert.strictEqual(songs.length, 0);
      assert.strictEqual(queue.isPlaying('guild1'), false);
    });

    it('should track current song', () => {
      const queue = new MusicQueue();
      const guildQueue = queue.getQueue('guild1');
      const song = { title: 'Current', url: 'https://test.com' };
      
      guildQueue.currentSong = song;
      
      const current = queue.getCurrentSong('guild1');
      assert.strictEqual(current.title, 'Current');
    });

    it('should track playing state', () => {
      const queue = new MusicQueue();
      const guildQueue = queue.getQueue('guild1');
      
      assert.strictEqual(queue.isPlaying('guild1'), false);
      
      guildQueue.playing = true;
      assert.strictEqual(queue.isPlaying('guild1'), true);
    });
  });
});

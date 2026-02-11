import { ResponseCache, responseCache } from '../response-cache.util';

describe('ResponseCache', () => {
  afterEach(() => {
    responseCache.clear();
  });

  it('should be a singleton', () => {
    const instance1 = ResponseCache.getInstance();
    const instance2 = ResponseCache.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should store and retrieve chunks', () => {
    const chunks = [Buffer.from('hello'), Buffer.from(' world')];
    responseCache.set('key1', chunks);
    expect(responseCache.get('key1')).toEqual(chunks);
  });

  it('should return empty array for unknown keys', () => {
    expect(responseCache.get('unknown')).toEqual([]);
  });

  it('should check if key exists', () => {
    responseCache.set('key1', [Buffer.from('data')]);
    expect(responseCache.has('key1')).toBe(true);
    expect(responseCache.has('key2')).toBe(false);
  });

  it('should delete a key', () => {
    responseCache.set('key1', [Buffer.from('data')]);
    expect(responseCache.delete('key1')).toBe(true);
    expect(responseCache.has('key1')).toBe(false);
  });

  it('should clear all entries', () => {
    responseCache.set('key1', [Buffer.from('a')]);
    responseCache.set('key2', [Buffer.from('b')]);
    responseCache.clear();
    expect(responseCache.has('key1')).toBe(false);
    expect(responseCache.has('key2')).toBe(false);
  });
});

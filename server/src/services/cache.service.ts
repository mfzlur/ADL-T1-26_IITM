import { redis } from '../config/redis';

export class CacheService {
  /**
   * Set a value in cache
   * @param key Cache key
   * @param value Value to store (will be JSON stringified)
   * @param ttl Time to live in seconds (optional)
   */
  static async set(key: string, value: any, ttl?: number): Promise<void> {
    const data = JSON.stringify(value);
    if (ttl) {
      await redis.setex(key, ttl, data);
    } else {
      await redis.set(key, data);
    }
  }

  /**
   * Get a value from cache
   * @param key Cache key
   */
  static async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch (e) {
      console.error(`Error parsing cache data for key ${key}:`, e);
      return null;
    }
  }

  /**
   * Delete a key from cache
   * @param key Cache key
   */
  static async del(key: string): Promise<void> {
    await redis.del(key);
  }

  /**
   * Delete keys by pattern (e.g. "mc:list:*")
   * @param pattern Glob pattern
   */
  static async delByPattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  static async flushAll(): Promise<void> {
    await redis.flushall();
  }
}

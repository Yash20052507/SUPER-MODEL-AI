import { createClient, RedisClientType } from 'redis';
import { logger } from '../config/logger';
import { CacheEntry } from '../types';

export class CacheService {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD,
    });

    this.client.on('error', (err) => {
      logger.error('Redis Cache error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      logger.info('Redis Cache connected');
      this.isConnected = true;
    });

    this.client.on('disconnect', () => {
      logger.warn('Redis Cache disconnected');
      this.isConnected = false;
    });

    this.connect();
  }

  private async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis Cache:', error);
    }
  }

  async get(key: string): Promise<any> {
    try {
      if (!this.isConnected) {
        return null;
      }

      const cached = await this.client.get(key);
      
      if (cached) {
        const parsed = JSON.parse(cached);
        
        // Check if cache entry has expired
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          await this.delete(key);
          return null;
        }
        
        return parsed.value;
      }
      
      return null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    try {
      if (!this.isConnected) {
        return;
      }

      const cacheEntry: CacheEntry = {
        key,
        value,
        ttl: ttlSeconds,
        createdAt: new Date(),
      };

      const serialized = JSON.stringify({
        ...cacheEntry,
        expiresAt: Date.now() + (ttlSeconds * 1000),
      });

      await this.client.setEx(key, ttlSeconds, serialized);
    } catch (error) {
      logger.error('Cache set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      if (!this.isConnected) {
        return;
      }

      await this.client.del(key);
    } catch (error) {
      logger.error('Cache delete error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      if (!this.isConnected) {
        return;
      }

      await this.client.flushAll();
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        return false;
      }

      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  async increment(key: string, value: number = 1): Promise<number> {
    try {
      if (!this.isConnected) {
        return 0;
      }

      return await this.client.incrBy(key, value);
    } catch (error) {
      logger.error('Cache increment error:', error);
      return 0;
    }
  }

  async getKeys(pattern: string = '*'): Promise<string[]> {
    try {
      if (!this.isConnected) {
        return [];
      }

      return await this.client.keys(pattern);
    } catch (error) {
      logger.error('Cache getKeys error:', error);
      return [];
    }
  }

  async setHash(key: string, field: string, value: any): Promise<void> {
    try {
      if (!this.isConnected) {
        return;
      }

      await this.client.hSet(key, field, JSON.stringify(value));
    } catch (error) {
      logger.error('Cache setHash error:', error);
    }
  }

  async getHash(key: string, field: string): Promise<any> {
    try {
      if (!this.isConnected) {
        return null;
      }

      const result = await this.client.hGet(key, field);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      logger.error('Cache getHash error:', error);
      return null;
    }
  }

  async getAllHash(key: string): Promise<Record<string, any>> {
    try {
      if (!this.isConnected) {
        return {};
      }

      const result = await this.client.hGetAll(key);
      const parsed: Record<string, any> = {};
      
      for (const [field, value] of Object.entries(result)) {
        try {
          parsed[field] = JSON.parse(value);
        } catch {
          parsed[field] = value;
        }
      }
      
      return parsed;
    } catch (error) {
      logger.error('Cache getAllHash error:', error);
      return {};
    }
  }

  async deleteHash(key: string, field: string): Promise<void> {
    try {
      if (!this.isConnected) {
        return;
      }

      await this.client.hDel(key, field);
    } catch (error) {
      logger.error('Cache deleteHash error:', error);
    }
  }

  async addToSet(key: string, value: string): Promise<void> {
    try {
      if (!this.isConnected) {
        return;
      }

      await this.client.sAdd(key, value);
    } catch (error) {
      logger.error('Cache addToSet error:', error);
    }
  }

  async getSet(key: string): Promise<string[]> {
    try {
      if (!this.isConnected) {
        return [];
      }

      return await this.client.sMembers(key);
    } catch (error) {
      logger.error('Cache getSet error:', error);
      return [];
    }
  }

  async removeFromSet(key: string, value: string): Promise<void> {
    try {
      if (!this.isConnected) {
        return;
      }

      await this.client.sRem(key, value);
    } catch (error) {
      logger.error('Cache removeFromSet error:', error);
    }
  }

  async getStats(): Promise<{
    connected: boolean;
    memoryUsage: string;
    totalKeys: number;
    hitRate: number;
  }> {
    try {
      if (!this.isConnected) {
        return {
          connected: false,
          memoryUsage: '0 MB',
          totalKeys: 0,
          hitRate: 0,
        };
      }

      const info = await this.client.info('memory');
      const dbSize = await this.client.dbSize();
      
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : '0 MB';
      
      return {
        connected: true,
        memoryUsage,
        totalKeys: dbSize,
        hitRate: 0, // This would require custom tracking
      };
    } catch (error) {
      logger.error('Cache getStats error:', error);
      return {
        connected: false,
        memoryUsage: '0 MB',
        totalKeys: 0,
        hitRate: 0,
      };
    }
  }

  async close(): Promise<void> {
    try {
      await this.client.quit();
      this.isConnected = false;
    } catch (error) {
      logger.error('Cache close error:', error);
    }
  }
}
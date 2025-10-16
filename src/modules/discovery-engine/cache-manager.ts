/**
 * Cache Manager
 * 
 * This module provides caching functionality for API responses,
 * improving performance and reducing API usage.
 */

import { createLogger } from '../../utils/logger.js';
import type { MCPDiscoveryResult } from '../../types/mcp.js';

const logger = createLogger('cache-manager');

/**
 * Cache entry
 */
interface CacheEntry {
  key: string;
  data: MCPDiscoveryResult[];
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  enabled: boolean;
  ttlMinutes: number;
  maxEntries: number;
  enableLRU: boolean;
  enableCompression: boolean;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalEntries: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  totalSize: number;
  averageEntrySize: number;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}

/**
 * Cache manager class
 */
export class CacheManager {
  private config: CacheConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private hitCount: number = 0;
  private missCount: number = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      enabled: true,
      ttlMinutes: 60,
      maxEntries: 1000,
      enableLRU: true,
      enableCompression: false,
      ...config
    };

    // Start cleanup interval
    if (this.config.enabled) {
      this.startCleanupInterval();
    }

    logger.info('Cache manager initialized', { config: this.config });
  }

  /**
   * Gets cached data for a key
   */
  async get(key: string): Promise<MCPDiscoveryResult[] | null> {
    if (!this.config.enabled) {
      return null;
    }

    const entry = this.cache.get(key);
    
    if (!entry) {
      this.missCount++;
      logger.debug('Cache miss', { key });
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.missCount++;
      logger.debug('Cache entry expired', { key, age: Date.now() - entry.timestamp });
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.hitCount++;

    logger.debug('Cache hit', { 
      key, 
      accessCount: entry.accessCount,
      age: Date.now() - entry.timestamp 
    });

    return entry.data;
  }

  /**
   * Sets cached data for a key
   */
  async set(key: string, data: MCPDiscoveryResult[]): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxEntries) {
      await this.evictEntries();
    }

    const entry: CacheEntry = {
      key,
      data: this.config.enableCompression ? this.compressData(data) : data,
      timestamp: Date.now(),
      ttl: this.config.ttlMinutes * 60 * 1000,
      accessCount: 0,
      lastAccessed: Date.now()
    };

    this.cache.set(key, entry);
    
    logger.debug('Cache entry set', { 
      key, 
      dataSize: data.length,
      ttlMinutes: this.config.ttlMinutes 
    });
  }

  /**
   * Deletes a cache entry
   */
  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    
    if (deleted) {
      logger.debug('Cache entry deleted', { key });
    }
    
    return deleted;
  }

  /**
   * Clears all cache entries
   */
  async clear(): Promise<void> {
    const entryCount = this.cache.size;
    this.cache.clear();
    
    logger.info('Cache cleared', { entryCount });
  }

  /**
   * Checks if a key exists in cache
   */
  has(key: string): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const entry = this.cache.get(key);
    return entry !== undefined && !this.isExpired(entry);
  }

  /**
   * Gets cache statistics
   */
  getStats(): CacheStats {
    const totalEntries = this.cache.size;
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;
    
    let totalSize = 0;
    let oldestTimestamp = Number.MAX_SAFE_INTEGER;
    let newestTimestamp = 0;

    for (const entry of this.cache.values()) {
      totalSize += this.calculateEntrySize(entry);
      oldestTimestamp = Math.min(oldestTimestamp, entry.timestamp);
      newestTimestamp = Math.max(newestTimestamp, entry.timestamp);
    }

    const averageEntrySize = totalEntries > 0 ? totalSize / totalEntries : 0;

    return {
      totalEntries,
      hitCount: this.hitCount,
      missCount: this.missCount,
      hitRate,
      totalSize,
      averageEntrySize,
      oldestEntry: totalEntries > 0 ? new Date(oldestTimestamp) : null,
      newestEntry: totalEntries > 0 ? new Date(newestTimestamp) : null
    };
  }

  /**
   * Gets cache hit rate
   */
  getHitRate(): number {
    const totalRequests = this.hitCount + this.missCount;
    return totalRequests > 0 ? this.hitCount / totalRequests : 0;
  }

  /**
   * Gets all cache keys
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Gets cache entry details
   */
  getEntryDetails(key: string): {
    exists: boolean;
    expired: boolean;
    age: number;
    accessCount: number;
    dataSize: number;
  } | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    return {
      exists: true,
      expired: this.isExpired(entry),
      age: Date.now() - entry.timestamp,
      accessCount: entry.accessCount,
      dataSize: this.calculateEntrySize(entry)
    };
  }

  /**
   * Updates cache configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart cleanup interval if needed
    if (this.config.enabled) {
      this.startCleanupInterval();
    }
    
    logger.info('Cache configuration updated', { config: this.config });
  }

  /**
   * Checks if a cache entry has expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Evicts entries when cache is full
   */
  private async evictEntries(): Promise<void> {
    if (!this.config.enableLRU) {
      // Simple FIFO eviction
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        logger.debug('Cache entry evicted (FIFO)', { key: firstKey });
      }
      return;
    }

    // LRU eviction - find least recently used entry
    let lruKey: string | null = null;
    let lruTime = Number.MAX_SAFE_INTEGER;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      logger.debug('Cache entry evicted (LRU)', { key: lruKey });
    }
  }

  /**
   * Calculates the size of a cache entry
   */
  private calculateEntrySize(entry: CacheEntry): number {
    // Rough estimation of memory usage
    const keySize = entry.key.length * 2; // 2 bytes per character (UTF-16)
    const dataSize = JSON.stringify(entry.data).length * 2;
    const metadataSize = 100; // Rough estimate for metadata
    
    return keySize + dataSize + metadataSize;
  }

  /**
   * Compresses data (placeholder implementation)
   */
  private compressData(data: MCPDiscoveryResult[]): MCPDiscoveryResult[] {
    // In a real implementation, this would use compression algorithms
    // For now, just return the data as-is
    return data;
  }

  /**
   * Starts the cleanup interval for expired entries
   */
  private startCleanupInterval(): void {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
  }

  /**
   * Cleans up expired cache entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug('Cleaned up expired cache entries', { count: cleanedCount });
    }
  }

  /**
   * Generates a cache key from search parameters
   */
  static generateCacheKey(query: string, options?: any): string {
    const optionsStr = options ? JSON.stringify(options) : '';
    const combined = `${query}:${optionsStr}`;
    
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `mcp_discovery_${Math.abs(hash)}`;
  }
}

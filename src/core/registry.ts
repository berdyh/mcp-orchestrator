/**
 * MCP Registry and Cache Module
 * 
 * This module provides local storage and caching for discovered MCP servers.
 * It supports both JSON file storage and SQLite database storage.
 */

import { createLogger } from '../utils/logger.js';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { z } from 'zod';

const logger = createLogger('mcp-registry');

/**
 * MCP Registry Entry Schema
 */
export const MCPRegistryEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.array(z.string()),
  repository: z.string().url(),
  npmPackage: z.string().optional(),
  installCommand: z.string(),
  configurationSchema: z.record(z.any()),
  requiredCredentials: z.array(z.object({
    keyName: z.string(),
    envVarName: z.string(),
    description: z.string(),
    optional: z.boolean(),
    obtainUrl: z.string().url().optional(),
    validationPattern: z.string().optional()
  })),
  documentationUrl: z.string().url(),
  examples: z.array(z.string()),
  discoveryMetadata: z.object({
    source: z.string(),
    discoveredAt: z.string(),
    confidence: z.number().min(0).max(1),
    lastVerified: z.string()
  }),
  usageStats: z.object({
    timesUsed: z.number().min(0),
    lastUsed: z.string(),
    averageSuccessRate: z.number().min(0).max(1)
  })
});

export type MCPRegistryEntry = z.infer<typeof MCPRegistryEntrySchema>;

/**
 * Registry Configuration
 */
export interface RegistryConfig {
  storageType: 'json' | 'sqlite';
  storagePath: string;
  cacheTTL: number; // in seconds
  maxEntries: number;
}

/**
 * Default registry configuration
 */
const DEFAULT_CONFIG: RegistryConfig = {
  storageType: 'json',
  storagePath: join(homedir(), '.mcp-hub', 'registry.json'),
  cacheTTL: 86400, // 24 hours
  maxEntries: 1000
};

/**
 * MCP Registry Class
 */
export class MCPRegistry {
  private config: RegistryConfig;
  private cache: Map<string, MCPRegistryEntry> = new Map();
  private lastCacheUpdate: number = 0;

  constructor(config: Partial<RegistryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    logger.info(`Initializing MCP registry with ${this.config.storageType} storage`);
  }

  /**
   * Initialize the registry (load from storage)
   */
  async initialize(): Promise<void> {
    try {
      await this.ensureStorageDirectory();
      await this.loadFromStorage();
      logger.info(`Registry initialized with ${this.cache.size} entries`);
    } catch (error) {
      logger.error('Failed to initialize registry:', error);
      throw error;
    }
  }

  /**
   * Add or update an MCP entry in the registry
   */
  async addEntry(entry: MCPRegistryEntry): Promise<void> {
    try {
      // Validate entry
      const validatedEntry = MCPRegistryEntrySchema.parse(entry);
      
      // Update cache
      this.cache.set(validatedEntry.id, validatedEntry);
      
      // Persist to storage
      await this.saveToStorage();
      
      logger.info(`Added MCP entry: ${validatedEntry.name} (${validatedEntry.id})`);
    } catch (error) {
      logger.error('Failed to add registry entry:', error);
      throw error;
    }
  }

  /**
   * Get an MCP entry by ID
   */
  async getEntry(id: string): Promise<MCPRegistryEntry | null> {
    await this.refreshCacheIfNeeded();
    return this.cache.get(id) || null;
  }

  /**
   * Search for MCP entries by criteria
   */
  async searchEntries(criteria: {
    category?: string;
    name?: string;
    repository?: string;
    minConfidence?: number;
    limit?: number;
  } = {}): Promise<MCPRegistryEntry[]> {
    await this.refreshCacheIfNeeded();
    
    let results = Array.from(this.cache.values());
    
    // Apply filters
    if (criteria.category) {
      results = results.filter(entry => 
        entry.category.some(cat => 
          cat.toLowerCase().includes(criteria.category!.toLowerCase())
        )
      );
    }
    
    if (criteria.name) {
      results = results.filter(entry => 
        entry.name.toLowerCase().includes(criteria.name!.toLowerCase())
      );
    }
    
    if (criteria.repository) {
      results = results.filter(entry => 
        entry.repository.toLowerCase().includes(criteria.repository!.toLowerCase())
      );
    }
    
    if (criteria.minConfidence !== undefined) {
      results = results.filter(entry => 
        entry.discoveryMetadata.confidence >= criteria.minConfidence!
      );
    }
    
    // Sort by confidence and usage
    results.sort((a, b) => {
      const scoreA = a.discoveryMetadata.confidence * 0.7 + a.usageStats.averageSuccessRate * 0.3;
      const scoreB = b.discoveryMetadata.confidence * 0.7 + b.usageStats.averageSuccessRate * 0.3;
      return scoreB - scoreA;
    });
    
    // Apply limit
    if (criteria.limit) {
      results = results.slice(0, criteria.limit);
    }
    
    return results;
  }

  /**
   * Update usage statistics for an entry
   */
  async updateUsageStats(id: string, success: boolean): Promise<void> {
    const entry = await this.getEntry(id);
    if (!entry) {
      logger.warn(`Cannot update usage stats: entry ${id} not found`);
      return;
    }
    
    const now = new Date().toISOString();
    const newTimesUsed = entry.usageStats.timesUsed + 1;
    const newSuccessRate = (entry.usageStats.averageSuccessRate * entry.usageStats.timesUsed + (success ? 1 : 0)) / newTimesUsed;
    
    const updatedEntry: MCPRegistryEntry = {
      ...entry,
      usageStats: {
        timesUsed: newTimesUsed,
        lastUsed: now,
        averageSuccessRate: newSuccessRate
      }
    };
    
    await this.addEntry(updatedEntry);
    logger.info(`Updated usage stats for ${entry.name}: ${newSuccessRate.toFixed(2)} success rate`);
  }

  /**
   * Remove an entry from the registry
   */
  async removeEntry(id: string): Promise<boolean> {
    const existed = this.cache.has(id);
    if (existed) {
      this.cache.delete(id);
      await this.saveToStorage();
      logger.info(`Removed MCP entry: ${id}`);
    }
    return existed;
  }

  /**
   * Clear all entries from the registry
   */
  async clear(): Promise<void> {
    this.cache.clear();
    await this.saveToStorage();
    logger.info('Cleared all registry entries');
  }

  /**
   * Get registry statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    categories: Record<string, number>;
    averageConfidence: number;
    averageSuccessRate: number;
    lastUpdated: string;
  }> {
    await this.refreshCacheIfNeeded();
    
    const entries = Array.from(this.cache.values());
    const categories: Record<string, number> = {};
    let totalConfidence = 0;
    let totalSuccessRate = 0;
    
    for (const entry of entries) {
      // Count categories
      for (const category of entry.category) {
        categories[category] = (categories[category] || 0) + 1;
      }
      
      totalConfidence += entry.discoveryMetadata.confidence;
      totalSuccessRate += entry.usageStats.averageSuccessRate;
    }
    
    return {
      totalEntries: entries.length,
      categories,
      averageConfidence: entries.length > 0 ? totalConfidence / entries.length : 0,
      averageSuccessRate: entries.length > 0 ? totalSuccessRate / entries.length : 0,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDirectory(): Promise<void> {
    const dir = dirname(this.config.storagePath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create storage directory:', error);
      throw error;
    }
  }

  /**
   * Load entries from storage
   */
  private async loadFromStorage(): Promise<void> {
    try {
      if (this.config.storageType === 'json') {
        await this.loadFromJSON();
      } else {
        // SQLite implementation would go here
        throw new Error('SQLite storage not yet implemented');
      }
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        // File doesn't exist yet, start with empty cache
        logger.info('Registry file does not exist, starting with empty cache');
        return;
      }
      throw error;
    }
  }

  /**
   * Load entries from JSON file
   */
  private async loadFromJSON(): Promise<void> {
    const data = await fs.readFile(this.config.storagePath, 'utf-8');
    const entries = JSON.parse(data);
    
    this.cache.clear();
    for (const entry of entries) {
      try {
        const validatedEntry = MCPRegistryEntrySchema.parse(entry);
        this.cache.set(validatedEntry.id, validatedEntry);
      } catch (error) {
        logger.warn(`Skipping invalid registry entry: ${error}`);
      }
    }
    
    this.lastCacheUpdate = Date.now();
  }

  /**
   * Save entries to storage
   */
  private async saveToStorage(): Promise<void> {
    if (this.config.storageType === 'json') {
      await this.saveToJSON();
    } else {
      // SQLite implementation would go here
      throw new Error('SQLite storage not yet implemented');
    }
  }

  /**
   * Save entries to JSON file
   */
  private async saveToJSON(): Promise<void> {
    const entries = Array.from(this.cache.values());
    const data = JSON.stringify(entries, null, 2);
    await fs.writeFile(this.config.storagePath, data, 'utf-8');
    this.lastCacheUpdate = Date.now();
  }

  /**
   * Refresh cache if TTL has expired
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    const now = Date.now();
    const ttlMs = this.config.cacheTTL * 1000;
    
    if (now - this.lastCacheUpdate > ttlMs) {
      logger.info('Cache TTL expired, refreshing from storage');
      await this.loadFromStorage();
    }
  }
}

/**
 * Create a default registry instance
 */
export function createRegistry(config?: Partial<RegistryConfig>): MCPRegistry {
  return new MCPRegistry(config);
}

/**
 * Utility function to create a new MCP registry entry
 */
export function createRegistryEntry(data: {
  id: string;
  name: string;
  category: string[];
  repository: string;
  npmPackage?: string;
  installCommand: string;
  configurationSchema: Record<string, any>;
  requiredCredentials: Array<{
    keyName: string;
    envVarName: string;
    description: string;
    optional: boolean;
    obtainUrl?: string;
    validationPattern?: string;
  }>;
  documentationUrl: string;
  examples: string[];
  source: string;
  confidence: number;
}): MCPRegistryEntry {
  const now = new Date().toISOString();
  
  return {
    id: data.id,
    name: data.name,
    category: data.category,
    repository: data.repository,
    npmPackage: data.npmPackage,
    installCommand: data.installCommand,
    configurationSchema: data.configurationSchema,
    requiredCredentials: data.requiredCredentials,
    documentationUrl: data.documentationUrl,
    examples: data.examples,
    discoveryMetadata: {
      source: data.source,
      discoveredAt: now,
      confidence: data.confidence,
      lastVerified: now
    },
    usageStats: {
      timesUsed: 0,
      lastUsed: now,
      averageSuccessRate: 0
    }
  };
}

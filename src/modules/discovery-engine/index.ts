/**
 * Discovery Engine - Main Module
 * 
 * This module provides the main public API for MCP server discovery,
 * combining Perplexity API integration, response parsing, and confidence scoring.
 */

import { createLogger } from '../../utils/logger';
import type { MCPDiscoveryResult } from '../../types/mcp';
import { PerplexityClient } from './perplexity-client';
import { MCPParser } from './mcp-parser';
import { ConfidenceScorer } from './confidence-scorer';
import { RateLimiter } from './rate-limiter';
import { CacheManager } from './cache-manager';
import { FallbackManager } from './fallback-manager';

const logger = createLogger('discovery-engine');

/**
 * Discovery engine configuration
 */
export interface DiscoveryEngineConfig {
  perplexityApiKey?: string;
  maxRetries?: number;
  retryDelay?: number;
  rateLimitPerMinute?: number;
  cacheEnabled?: boolean;
  cacheTtlMinutes?: number;
  fallbackEnabled?: boolean;
}

/**
 * Discovery search options
 */
export interface DiscoverySearchOptions {
  maxResults?: number;
  includeNpmPackages?: boolean;
  includeGitHubRepos?: boolean;
  minConfidenceScore?: number;
  categories?: string[];
  excludeCategories?: string[];
}

/**
 * Discovery result with metadata
 */
export interface DiscoveryResult {
  success: boolean;
  results: MCPDiscoveryResult[];
  totalFound: number;
  searchTime: number;
  source: 'perplexity' | 'cache' | 'fallback';
  error?: string;
}

/**
 * Main discovery engine class
 */
export class DiscoveryEngine {
  private perplexityClient: PerplexityClient;
  private parser: MCPParser;
  private scorer: ConfidenceScorer;
  private rateLimiter: RateLimiter;
  private cacheManager: CacheManager;
  private fallbackManager: FallbackManager;
  private config: DiscoveryEngineConfig;

  constructor(config: DiscoveryEngineConfig = {}) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      rateLimitPerMinute: 20,
      cacheEnabled: true,
      cacheTtlMinutes: 60,
      fallbackEnabled: true,
      ...config
    };

    this.perplexityClient = new PerplexityClient({
      ...(this.config.perplexityApiKey && { apiKey: this.config.perplexityApiKey }),
      maxRetries: this.config.maxRetries!,
      retryDelay: this.config.retryDelay!
    });

    this.parser = new MCPParser();
    this.scorer = new ConfidenceScorer();
    this.rateLimiter = new RateLimiter({ requestsPerMinute: this.config.rateLimitPerMinute! });
    this.cacheManager = new CacheManager({
      enabled: this.config.cacheEnabled!,
      ttlMinutes: this.config.cacheTtlMinutes!,
      maxEntries: 1000,
      enableLRU: true,
      enableCompression: false
    });
    this.fallbackManager = new FallbackManager({
      enablePredefinedRegistry: this.config.fallbackEnabled!,
      enableAlternativeSources: this.config.fallbackEnabled!
    });

    logger.info('Discovery engine initialized', {
      rateLimitPerMinute: this.config.rateLimitPerMinute,
      cacheEnabled: this.config.cacheEnabled,
      fallbackEnabled: this.config.fallbackEnabled
    });
  }

  /**
   * Sets the Perplexity API key
   */
  setApiKey(apiKey: string): void {
    this.perplexityClient.setApiKey(apiKey);
    logger.debug('Perplexity API key set');
  }

  /**
   * Discovers MCP servers based on a search query
   */
  async discoverMCPs(
    query: string, 
    options: DiscoverySearchOptions = {}
  ): Promise<DiscoveryResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting MCP discovery', { query, options });

      // Check cache first
      if (this.config.cacheEnabled) {
        const cachedResult = await this.cacheManager.get(query);
        if (cachedResult) {
          logger.debug('Returning cached discovery result', { query });
          return {
            success: true,
            results: cachedResult,
            totalFound: cachedResult.length,
            searchTime: Date.now() - startTime,
            source: 'cache'
          };
        }
      }

      // Apply rate limiting
      await this.rateLimiter.waitForSlot();

      // Search using Perplexity API
      const searchResult = await this.perplexityClient.search(query);
      
      if (!searchResult.success) {
        throw new Error(searchResult.error || 'Perplexity API search failed');
      }

      // Parse the response to extract MCP metadata
      const parsedResults = await this.parser.parseResponse(searchResult.data || '');
      
      // Score the results for confidence
      const scoredResults = await this.scorer.scoreResults(parsedResults, query);
      
      // Filter results based on options
      const filteredResults = this.filterResults(scoredResults, options);

      // Cache the results
      if (this.config.cacheEnabled && filteredResults.length > 0) {
        await this.cacheManager.set(query, filteredResults);
      }

      const searchTime = Date.now() - startTime;
      logger.info('MCP discovery completed', { 
        query, 
        resultsFound: filteredResults.length,
        searchTime 
      });

      return {
        success: true,
        results: filteredResults,
        totalFound: filteredResults.length,
        searchTime,
        source: 'perplexity'
      };

    } catch (error) {
      logger.error('MCP discovery failed', { 
        query, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      // Try fallback if enabled
      if (this.config.fallbackEnabled) {
        return await this.tryFallbackDiscovery(query, options, startTime);
      }

      return {
        success: false,
        results: [],
        totalFound: 0,
        searchTime: Date.now() - startTime,
        source: 'perplexity',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Discovers MCP servers by category
   */
  async discoverByCategory(
    category: string, 
    options: DiscoverySearchOptions = {}
  ): Promise<DiscoveryResult> {
    const query = `MCP server ${category} Model Context Protocol tools`;
    return this.discoverMCPs(query, { ...options, categories: [category] });
  }

  /**
   * Discovers MCP servers by tool type
   */
  async discoverByToolType(
    toolType: string, 
    options: DiscoverySearchOptions = {}
  ): Promise<DiscoveryResult> {
    const query = `MCP server ${toolType} tools Model Context Protocol`;
    return this.discoverMCPs(query, options);
  }

  /**
   * Discovers MCP servers by technology stack
   */
  async discoverByTechnology(
    technology: string, 
    options: DiscoverySearchOptions = {}
  ): Promise<DiscoveryResult> {
    const query = `MCP server ${technology} integration Model Context Protocol`;
    return this.discoverMCPs(query, options);
  }

  /**
   * Gets discovery statistics
   */
  async getDiscoveryStats(): Promise<{
    totalSearches: number;
    cacheHitRate: number;
    averageSearchTime: number;
    rateLimitStatus: { remaining: number; resetTime: Date };
  }> {
    return {
      totalSearches: this.rateLimiter.getTotalRequests(),
      cacheHitRate: this.cacheManager.getHitRate(),
      averageSearchTime: this.rateLimiter.getAverageResponseTime(),
      rateLimitStatus: this.rateLimiter.getStatus()
    };
  }

  /**
   * Clears the discovery cache
   */
  async clearCache(): Promise<void> {
    await this.cacheManager.clear();
    logger.info('Discovery cache cleared');
  }

  /**
   * Filters results based on search options
   */
  private filterResults(
    results: MCPDiscoveryResult[], 
    options: DiscoverySearchOptions
  ): MCPDiscoveryResult[] {
    let filtered = results;

    // Filter by confidence score
    if (options.minConfidenceScore !== undefined) {
      filtered = filtered.filter(r => r.confidence_score >= options.minConfidenceScore!);
    }

    // Filter by categories
    if (options.categories && options.categories.length > 0) {
      filtered = filtered.filter(r => 
        options.categories!.some(cat => 
          r.mcp_name.toLowerCase().includes(cat.toLowerCase()) ||
          r.setup_instructions.toLowerCase().includes(cat.toLowerCase())
        )
      );
    }

    // Exclude categories
    if (options.excludeCategories && options.excludeCategories.length > 0) {
      filtered = filtered.filter(r => 
        !options.excludeCategories!.some(cat => 
          r.mcp_name.toLowerCase().includes(cat.toLowerCase()) ||
          r.setup_instructions.toLowerCase().includes(cat.toLowerCase())
        )
      );
    }

    // Filter by package type
    if (options.includeNpmPackages === false) {
      filtered = filtered.filter(r => !r.npm_package);
    }

    if (options.includeGitHubRepos === false) {
      filtered = filtered.filter(r => !r.repository_url.includes('github.com'));
    }

    // Limit results
    if (options.maxResults && options.maxResults > 0) {
      filtered = filtered.slice(0, options.maxResults);
    }

    return filtered;
  }

  /**
   * Tries fallback discovery methods
   */
  private async tryFallbackDiscovery(
    query: string, 
    options: DiscoverySearchOptions, 
    startTime: number
  ): Promise<DiscoveryResult> {
    logger.info('Attempting fallback discovery', { query });

    try {
      // Use fallback manager for discovery
      const fallbackOptions: any = {};
      if (options.maxResults !== undefined) fallbackOptions.maxResults = options.maxResults;
      if (options.categories !== undefined) fallbackOptions.categories = options.categories;
      if (options.excludeCategories !== undefined) fallbackOptions.excludeCategories = options.excludeCategories;
      
      const fallbackResults = await this.fallbackManager.attemptFallbackDiscovery(query, fallbackOptions);
      
      return {
        success: true,
        results: fallbackResults,
        totalFound: fallbackResults.length,
        searchTime: Date.now() - startTime,
        source: 'fallback'
      };
    } catch (error) {
      logger.error('Fallback discovery failed', { 
        query, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      return {
        success: false,
        results: [],
        totalFound: 0,
        searchTime: Date.now() - startTime,
        source: 'fallback',
        error: error instanceof Error ? error.message : 'Fallback failed'
      };
    }
  }
}

/**
 * Default discovery engine instance
 */
export const defaultDiscoveryEngine = new DiscoveryEngine();

/**
 * Utility functions for discovery
 */
export const discoveryUtils = {
  /**
   * Quick MCP discovery
   */
  async discover(query: string, options?: DiscoverySearchOptions): Promise<MCPDiscoveryResult[]> {
    const result = await defaultDiscoveryEngine.discoverMCPs(query, options);
    
    if (!result.success) {
      throw new Error(result.error || 'Discovery failed');
    }

    return result.results;
  },

  /**
   * Discover by category
   */
  async discoverByCategory(category: string, options?: DiscoverySearchOptions): Promise<MCPDiscoveryResult[]> {
    const result = await defaultDiscoveryEngine.discoverByCategory(category, options);
    
    if (!result.success) {
      throw new Error(result.error || 'Category discovery failed');
    }

    return result.results;
  },

  /**
   * Get discovery stats
   */
  async getStats() {
    return await defaultDiscoveryEngine.getDiscoveryStats();
  }
};

// Export all classes and types
export * from './perplexity-client';
export * from './mcp-parser';
export * from './confidence-scorer';
export * from './rate-limiter';
export * from './cache-manager';
export * from './fallback-manager';
export * from './query-templates';

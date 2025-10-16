/**
 * Fallback Manager
 * 
 * This module provides fallback mechanisms when the primary discovery methods fail,
 * including predefined MCP registries and alternative discovery strategies.
 */

import { createLogger } from '../../utils/logger.js';
import type { MCPDiscoveryResult } from '../../types/mcp.js';

const logger = createLogger('fallback-manager');

/**
 * Fallback configuration
 */
export interface FallbackConfig {
  enablePredefinedRegistry: boolean;
  enableAlternativeSources: boolean;
  enableCachedResults: boolean;
  maxFallbackResults: number;
  fallbackTimeout: number;
}

/**
 * Fallback source
 */
export interface FallbackSource {
  name: string;
  description: string;
  priority: number;
  enabled: boolean;
}

/**
 * Fallback manager class
 */
export class FallbackManager {
  private config: FallbackConfig;
  private sources: FallbackSource[] = [];
  private predefinedRegistry: MCPDiscoveryResult[] = [];

  constructor(config: Partial<FallbackConfig> = {}) {
    this.config = {
      enablePredefinedRegistry: true,
      enableAlternativeSources: true,
      enableCachedResults: true,
      maxFallbackResults: 10,
      fallbackTimeout: 5000,
      ...config
    };

    this.initializeSources();
    this.initializePredefinedRegistry();

    logger.info('Fallback manager initialized', { config: this.config });
  }

  /**
   * Attempts fallback discovery when primary methods fail
   */
  async attemptFallbackDiscovery(
    query: string,
    options?: {
      maxResults?: number;
      categories?: string[];
      excludeCategories?: string[];
    }
  ): Promise<MCPDiscoveryResult[]> {
    try {
      logger.info('Attempting fallback discovery', { query });

      const results: MCPDiscoveryResult[] = [];
      const maxResults = options?.maxResults || this.config.maxFallbackResults;

      // Try predefined registry first
      if (this.config.enablePredefinedRegistry) {
        const registryResults = await this.searchPredefinedRegistry(query, options);
        results.push(...registryResults);
      }

      // Try alternative sources if we need more results
      if (results.length < maxResults && this.config.enableAlternativeSources) {
        const alternativeResults = await this.searchAlternativeSources(query, options);
        results.push(...alternativeResults);
      }

      // Remove duplicates and limit results
      const uniqueResults = this.removeDuplicates(results);
      const limitedResults = uniqueResults.slice(0, maxResults);

      logger.info('Fallback discovery completed', {
        query,
        resultsFound: limitedResults.length,
        sourcesUsed: this.getUsedSources()
      });

      return limitedResults;

    } catch (error) {
      logger.error('Fallback discovery failed', {
        query,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Searches the predefined MCP registry
   */
  private async searchPredefinedRegistry(
    query: string,
    options?: {
      categories?: string[];
      excludeCategories?: string[];
    }
  ): Promise<MCPDiscoveryResult[]> {
    const queryLower = query.toLowerCase();
    const results: MCPDiscoveryResult[] = [];

    for (const entry of this.predefinedRegistry) {
      // Check if entry matches query
      if (this.matchesQuery(entry, queryLower)) {
        // Check category filters
        if (this.matchesCategoryFilters(entry, options)) {
          results.push(entry);
        }
      }
    }

    logger.debug('Predefined registry search completed', {
      query,
      matchesFound: results.length,
      totalRegistrySize: this.predefinedRegistry.length
    });

    return results;
  }

  /**
   * Searches alternative sources
   */
  private async searchAlternativeSources(
    query: string,
    options?: {
      categories?: string[];
      excludeCategories?: string[];
    }
  ): Promise<MCPDiscoveryResult[]> {
    const results: MCPDiscoveryResult[] = [];

    // This would integrate with alternative sources like:
    // - GitHub API search
    // - NPM registry search
    // - Community MCP lists
    // - Documentation sites

    // For now, return empty array as placeholder
    logger.debug('Alternative sources search completed', {
      query,
      resultsFound: results.length
    });

    return results;
  }

  /**
   * Checks if an entry matches the search query
   */
  private matchesQuery(entry: MCPDiscoveryResult, queryLower: string): boolean {
    const searchableText = [
      entry.mcp_name,
      entry.setup_instructions,
      entry.repository_url,
      entry.npm_package || '',
      entry.documentation_url
    ].join(' ').toLowerCase();

    // Split query into words
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    
    // Check if all query words are present
    return queryWords.every(word => searchableText.includes(word));
  }

  /**
   * Checks if an entry matches category filters
   */
  private matchesCategoryFilters(
    entry: MCPDiscoveryResult,
    options?: {
      categories?: string[];
      excludeCategories?: string[];
    }
  ): boolean {
    if (!options) return true;

    const entryText = [
      entry.mcp_name,
      entry.setup_instructions
    ].join(' ').toLowerCase();

    // Check include categories
    if (options.categories && options.categories.length > 0) {
      const hasMatchingCategory = options.categories.some(category =>
        entryText.includes(category.toLowerCase())
      );
      if (!hasMatchingCategory) return false;
    }

    // Check exclude categories
    if (options.excludeCategories && options.excludeCategories.length > 0) {
      const hasExcludedCategory = options.excludeCategories.some(category =>
        entryText.includes(category.toLowerCase())
      );
      if (hasExcludedCategory) return false;
    }

    return true;
  }

  /**
   * Removes duplicate results
   */
  private removeDuplicates(results: MCPDiscoveryResult[]): MCPDiscoveryResult[] {
    const seen = new Set<string>();
    const unique: MCPDiscoveryResult[] = [];

    for (const result of results) {
      const key = `${result.mcp_name}:${result.repository_url}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(result);
      }
    }

    return unique;
  }

  /**
   * Gets the sources that were used
   */
  private getUsedSources(): string[] {
    return this.sources
      .filter(source => source.enabled)
      .map(source => source.name);
  }

  /**
   * Initializes fallback sources
   */
  private initializeSources(): void {
    this.sources = [
      {
        name: 'predefined-registry',
        description: 'Curated list of known MCP servers',
        priority: 1,
        enabled: this.config.enablePredefinedRegistry
      },
      {
        name: 'github-search',
        description: 'GitHub API search for MCP repositories',
        priority: 2,
        enabled: this.config.enableAlternativeSources
      },
      {
        name: 'npm-search',
        description: 'NPM registry search for MCP packages',
        priority: 3,
        enabled: this.config.enableAlternativeSources
      },
      {
        name: 'community-lists',
        description: 'Community-maintained MCP server lists',
        priority: 4,
        enabled: this.config.enableAlternativeSources
      }
    ];
  }

  /**
   * Initializes the predefined MCP registry
   */
  private initializePredefinedRegistry(): void {
    this.predefinedRegistry = [
      {
        mcp_name: 'filesystem-mcp',
        repository_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
        npm_package: '@modelcontextprotocol/server-filesystem',
        documentation_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
        setup_instructions: 'Install via npm: npm install @modelcontextprotocol/server-filesystem\nConfigure in your MCP client with appropriate file system permissions.',
        required_credentials: [],
        confidence_score: 0.95
      },
      {
        mcp_name: 'git-mcp',
        repository_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/git',
        npm_package: '@modelcontextprotocol/server-git',
        documentation_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/git',
        setup_instructions: 'Install via npm: npm install @modelcontextprotocol/server-git\nConfigure with git repository paths and authentication if needed.',
        required_credentials: [],
        confidence_score: 0.95
      },
      {
        mcp_name: 'sqlite-mcp',
        repository_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite',
        npm_package: '@modelcontextprotocol/server-sqlite',
        documentation_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite',
        setup_instructions: 'Install via npm: npm install @modelcontextprotocol/server-sqlite\nConfigure with SQLite database file paths.',
        required_credentials: [],
        confidence_score: 0.95
      },
      {
        mcp_name: 'brave-search-mcp',
        repository_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search',
        npm_package: '@modelcontextprotocol/server-brave-search',
        documentation_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search',
        setup_instructions: 'Install via npm: npm install @modelcontextprotocol/server-brave-search\nConfigure with Brave Search API key.',
        required_credentials: ['BRAVE_API_KEY'],
        confidence_score: 0.95
      },
      {
        mcp_name: 'fetch-mcp',
        repository_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch',
        npm_package: '@modelcontextprotocol/server-fetch',
        documentation_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/fetch',
        setup_instructions: 'Install via npm: npm install @modelcontextprotocol/server-fetch\nConfigure with allowed domains and request limits.',
        required_credentials: [],
        confidence_score: 0.95
      },
      {
        mcp_name: 'postgres-mcp',
        repository_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres',
        npm_package: '@modelcontextprotocol/server-postgres',
        documentation_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/postgres',
        setup_instructions: 'Install via npm: npm install @modelcontextprotocol/server-postgres\nConfigure with PostgreSQL connection details.',
        required_credentials: ['POSTGRES_CONNECTION_STRING'],
        confidence_score: 0.95
      },
      {
        mcp_name: 'puppeteer-mcp',
        repository_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer',
        npm_package: '@modelcontextprotocol/server-puppeteer',
        documentation_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer',
        setup_instructions: 'Install via npm: npm install @modelcontextprotocol/server-puppeteer\nConfigure with browser settings and allowed domains.',
        required_credentials: [],
        confidence_score: 0.95
      },
      {
        mcp_name: 'sequential-thinking-mcp',
        repository_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sequential-thinking',
        npm_package: '@modelcontextprotocol/server-sequential-thinking',
        documentation_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/sequential-thinking',
        setup_instructions: 'Install via npm: npm install @modelcontextprotocol/server-sequential-thinking\nNo additional configuration required.',
        required_credentials: [],
        confidence_score: 0.95
      },
      {
        mcp_name: 'memory-mcp',
        repository_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory',
        npm_package: '@modelcontextprotocol/server-memory',
        documentation_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/memory',
        setup_instructions: 'Install via npm: npm install @modelcontextprotocol/server-memory\nConfigure with memory storage settings.',
        required_credentials: [],
        confidence_score: 0.95
      },
      {
        mcp_name: 'github-mcp',
        repository_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/github',
        npm_package: '@modelcontextprotocol/server-github',
        documentation_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/github',
        setup_instructions: 'Install via npm: npm install @modelcontextprotocol/server-github\nConfigure with GitHub personal access token.',
        required_credentials: ['GITHUB_PERSONAL_ACCESS_TOKEN'],
        confidence_score: 0.95
      }
    ];

    logger.info('Predefined registry initialized', {
      entryCount: this.predefinedRegistry.length
    });
  }

  /**
   * Updates fallback configuration
   */
  updateConfig(newConfig: Partial<FallbackConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update source enabled states
    this.sources.forEach(source => {
      if (source.name === 'predefined-registry') {
        source.enabled = this.config.enablePredefinedRegistry;
      } else {
        source.enabled = this.config.enableAlternativeSources;
      }
    });
    
    logger.info('Fallback configuration updated', { config: this.config });
  }

  /**
   * Gets fallback statistics
   */
  getStats(): {
    config: FallbackConfig;
    sources: FallbackSource[];
    registrySize: number;
    enabledSources: number;
  } {
    return {
      config: this.config,
      sources: this.sources,
      registrySize: this.predefinedRegistry.length,
      enabledSources: this.sources.filter(s => s.enabled).length
    };
  }

  /**
   * Adds a new entry to the predefined registry
   */
  addRegistryEntry(entry: MCPDiscoveryResult): void {
    this.predefinedRegistry.push(entry);
    logger.debug('Added entry to predefined registry', { mcpName: entry.mcp_name });
  }

  /**
   * Removes an entry from the predefined registry
   */
  removeRegistryEntry(mcpName: string): boolean {
    const index = this.predefinedRegistry.findIndex(entry => entry.mcp_name === mcpName);
    if (index !== -1) {
      this.predefinedRegistry.splice(index, 1);
      logger.debug('Removed entry from predefined registry', { mcpName });
      return true;
    }
    return false;
  }

  /**
   * Gets all predefined registry entries
   */
  getRegistryEntries(): MCPDiscoveryResult[] {
    return [...this.predefinedRegistry];
  }
}

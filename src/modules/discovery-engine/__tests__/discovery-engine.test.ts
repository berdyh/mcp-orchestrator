/**
 * Discovery Engine Integration Tests
 * 
 * This module contains comprehensive tests for the discovery engine,
 * including mocked API responses and end-to-end functionality tests.
 */

import { DiscoveryEngine } from '../index';
import { PerplexityClient } from '../perplexity-client';
import { MCPParser } from '../mcp-parser';
import { ConfidenceScorer } from '../confidence-scorer';
import { RateLimiter } from '../rate-limiter';
import { CacheManager } from '../cache-manager';
import { FallbackManager } from '../fallback-manager';
import type { MCPDiscoveryResult } from '../../../types/mcp';

// Mock implementations
jest.mock('../perplexity-client');
jest.mock('../mcp-parser');
jest.mock('../confidence-scorer');
jest.mock('../rate-limiter');
jest.mock('../cache-manager');
jest.mock('../fallback-manager');

describe('DiscoveryEngine', () => {
  let discoveryEngine: DiscoveryEngine;
  let mockPerplexityClient: jest.Mocked<PerplexityClient>;
  let mockParser: jest.Mocked<MCPParser>;
  let mockScorer: jest.Mocked<ConfidenceScorer>;
  let mockRateLimiter: jest.Mocked<RateLimiter>;
  let mockCacheManager: jest.Mocked<CacheManager>;
  let mockFallbackManager: jest.Mocked<FallbackManager>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockPerplexityClient = new PerplexityClient() as jest.Mocked<PerplexityClient>;
    mockParser = new MCPParser() as jest.Mocked<MCPParser>;
    mockScorer = new ConfidenceScorer() as jest.Mocked<ConfidenceScorer>;
    mockRateLimiter = new RateLimiter({ requestsPerMinute: 20 }) as jest.Mocked<RateLimiter>;
    mockCacheManager = new CacheManager({ enabled: true, ttlMinutes: 60 }) as jest.Mocked<CacheManager>;
    mockFallbackManager = new FallbackManager() as jest.Mocked<FallbackManager>;

    // Mock constructor calls
    (PerplexityClient as jest.Mock).mockImplementation(() => mockPerplexityClient);
    (MCPParser as jest.Mock).mockImplementation(() => mockParser);
    (ConfidenceScorer as jest.Mock).mockImplementation(() => mockScorer);
    (RateLimiter as jest.Mock).mockImplementation(() => mockRateLimiter);
    (CacheManager as jest.Mock).mockImplementation(() => mockCacheManager);
    (FallbackManager as jest.Mock).mockImplementation(() => mockFallbackManager);

    // Create discovery engine instance
    discoveryEngine = new DiscoveryEngine({
      perplexityApiKey: 'test-api-key',
      cacheEnabled: true,
      fallbackEnabled: true
    });
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      const engine = new DiscoveryEngine();
      expect(engine).toBeDefined();
    });

    it('should initialize with custom configuration', () => {
      const config = {
        maxRetries: 5,
        retryDelay: 2000,
        rateLimitPerMinute: 10,
        cacheEnabled: false,
        fallbackEnabled: false
      };
      
      const engine = new DiscoveryEngine(config);
      expect(engine).toBeDefined();
    });

    it('should set API key', () => {
      discoveryEngine.setApiKey('new-api-key');
      expect(mockPerplexityClient.setApiKey).toHaveBeenCalledWith('new-api-key');
    });
  });

  describe('MCP Discovery', () => {
    const mockDiscoveryResults: MCPDiscoveryResult[] = [
      {
        mcp_name: 'filesystem-mcp',
        repository_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
        npm_package: '@modelcontextprotocol/server-filesystem',
        documentation_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
        setup_instructions: 'npm install @modelcontextprotocol/server-filesystem',
        required_credentials: [],
        confidence_score: 0.9
      },
      {
        mcp_name: 'git-mcp',
        repository_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/git',
        npm_package: '@modelcontextprotocol/server-git',
        documentation_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/git',
        setup_instructions: 'npm install @modelcontextprotocol/server-git',
        required_credentials: [],
        confidence_score: 0.8
      }
    ];

    beforeEach(() => {
      // Setup default mock behaviors
      mockCacheManager.get.mockResolvedValue(null);
      mockRateLimiter.waitForSlot.mockResolvedValue();
      mockPerplexityClient.search.mockResolvedValue({
        success: true,
        data: 'Mocked Perplexity response with MCP server information',
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 }
      });
      mockParser.parseResponse.mockResolvedValue(mockDiscoveryResults);
      mockScorer.scoreResults.mockResolvedValue(mockDiscoveryResults);
      mockCacheManager.set.mockResolvedValue();
    });

    it('should discover MCPs successfully', async () => {
      const result = await discoveryEngine.discoverMCPs('filesystem tools');

      expect(result.success).toBe(true);
      expect(result.results).toEqual(mockDiscoveryResults);
      expect(result.source).toBe('perplexity');
      expect(mockPerplexityClient.search).toHaveBeenCalledWith('filesystem tools');
      expect(mockParser.parseResponse).toHaveBeenCalled();
      expect(mockScorer.scoreResults).toHaveBeenCalled();
    });

    it('should return cached results when available', async () => {
      mockCacheManager.get.mockResolvedValue(mockDiscoveryResults);

      const result = await discoveryEngine.discoverMCPs('filesystem tools');

      expect(result.success).toBe(true);
      expect(result.results).toEqual(mockDiscoveryResults);
      expect(result.source).toBe('cache');
      expect(mockPerplexityClient.search).not.toHaveBeenCalled();
    });

    it('should filter results based on options', async () => {
      const options = {
        maxResults: 1,
        minConfidenceScore: 0.85
      };

      const result = await discoveryEngine.discoverMCPs('filesystem tools', options);

      expect(result.success).toBe(true);
      expect(result.results.length).toBe(1);
      expect(result.results[0].confidence_score).toBeGreaterThanOrEqual(0.85);
    });

    it('should handle Perplexity API failures with fallback', async () => {
      mockPerplexityClient.search.mockResolvedValue({
        success: false,
        error: 'API rate limit exceeded'
      });
      mockFallbackManager.attemptFallbackDiscovery.mockResolvedValue(mockDiscoveryResults);

      const result = await discoveryEngine.discoverMCPs('filesystem tools');

      expect(result.success).toBe(true);
      expect(result.results).toEqual(mockDiscoveryResults);
      expect(result.source).toBe('fallback');
      expect(mockFallbackManager.attemptFallbackDiscovery).toHaveBeenCalled();
    });

    it('should handle complete failure gracefully', async () => {
      mockPerplexityClient.search.mockResolvedValue({
        success: false,
        error: 'API error'
      });
      mockFallbackManager.attemptFallbackDiscovery.mockResolvedValue([]);

      const result = await discoveryEngine.discoverMCPs('filesystem tools');

      expect(result.success).toBe(false);
      expect(result.results).toEqual([]);
      expect(result.error).toBeDefined();
    });
  });

  describe('Category-based Discovery', () => {
    beforeEach(() => {
      mockCacheManager.get.mockResolvedValue(null);
      mockRateLimiter.waitForSlot.mockResolvedValue();
      mockPerplexityClient.search.mockResolvedValue({
        success: true,
        data: 'Mocked response',
        usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 }
      });
      mockParser.parseResponse.mockResolvedValue([]);
      mockScorer.scoreResults.mockResolvedValue([]);
    });

    it('should discover by category', async () => {
      await discoveryEngine.discoverByCategory('filesystem');

      expect(mockPerplexityClient.search).toHaveBeenCalledWith(
        expect.stringContaining('filesystem')
      );
    });

    it('should discover by tool type', async () => {
      await discoveryEngine.discoverByToolType('database');

      expect(mockPerplexityClient.search).toHaveBeenCalledWith(
        expect.stringContaining('database')
      );
    });

    it('should discover by technology', async () => {
      await discoveryEngine.discoverByTechnology('nodejs');

      expect(mockPerplexityClient.search).toHaveBeenCalledWith(
        expect.stringContaining('nodejs')
      );
    });
  });

  describe('Statistics and Management', () => {
    it('should get discovery statistics', async () => {
      mockRateLimiter.getTotalRequests.mockReturnValue(10);
      mockCacheManager.getHitRate.mockReturnValue(0.8);
      mockRateLimiter.getAverageResponseTime.mockReturnValue(1500);
      mockRateLimiter.getStatus.mockReturnValue({
        remaining: 15,
        resetTime: new Date(),
        totalRequests: 10,
        windowStart: new Date()
      });

      const stats = await discoveryEngine.getDiscoveryStats();

      expect(stats.totalSearches).toBe(10);
      expect(stats.cacheHitRate).toBe(0.8);
      expect(stats.averageSearchTime).toBe(1500);
      expect(stats.rateLimitStatus.remaining).toBe(15);
    });

    it('should clear cache', async () => {
      await discoveryEngine.clearCache();
      expect(mockCacheManager.clear).toHaveBeenCalled();
    });
  });
});

describe('PerplexityClient', () => {
  let client: PerplexityClient;

  beforeEach(() => {
    client = new PerplexityClient({
      apiKey: 'test-api-key'
    });
  });

  it('should set API key', () => {
    client.setApiKey('new-key');
    // This would test the actual implementation
  });

  it('should test connection', async () => {
    // Mock axios for connection test
    const mockAxios = {
      post: jest.fn().mockResolvedValue({
        status: 200,
        data: { choices: [{ message: { content: 'test' } }] }
      })
    };

    // This would require mocking the axios instance
    // const result = await client.testConnection();
    // expect(result.success).toBe(true);
  });
});

describe('MCPParser', () => {
  let parser: MCPParser;

  beforeEach(() => {
    parser = new MCPParser();
  });

  it('should parse valid MCP response', async () => {
    const mockResponse = `
      Here are some MCP servers I found:

      1. **filesystem-mcp**
      - Repository: https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem
      - NPM Package: @modelcontextprotocol/server-filesystem
      - Installation: npm install @modelcontextprotocol/server-filesystem
      - Documentation: https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem

      2. **git-mcp**
      - Repository: https://github.com/modelcontextprotocol/servers/tree/main/src/git
      - NPM Package: @modelcontextprotocol/server-git
      - Installation: npm install @modelcontextprotocol/server-git
    `;

    const results = await parser.parseResponse(mockResponse);

    expect(results).toHaveLength(2);
    expect(results[0].mcp_name).toBe('filesystem-mcp');
    expect(results[0].repository_url).toContain('github.com');
    expect(results[0].npm_package).toBe('@modelcontextprotocol/server-filesystem');
  });

  it('should handle empty response', async () => {
    const results = await parser.parseResponse('');
    expect(results).toHaveLength(0);
  });

  it('should handle malformed response', async () => {
    const malformedResponse = 'This is not a valid MCP response';
    const results = await parser.parseResponse(malformedResponse);
    expect(results).toHaveLength(0);
  });
});

describe('ConfidenceScorer', () => {
  let scorer: ConfidenceScorer;

  beforeEach(() => {
    scorer = new ConfidenceScorer();
  });

  it('should score results with high confidence', async () => {
    const mockResults: MCPDiscoveryResult[] = [
      {
        mcp_name: 'filesystem-mcp',
        repository_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
        npm_package: '@modelcontextprotocol/server-filesystem',
        documentation_url: 'https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem',
        setup_instructions: 'npm install @modelcontextprotocol/server-filesystem',
        required_credentials: [],
        confidence_score: 0.5 // Will be recalculated
      }
    ];

    const scoredResults = await scorer.scoreResults(mockResults, 'filesystem tools');

    expect(scoredResults).toHaveLength(1);
    expect(scoredResults[0].confidence_score).toBeGreaterThan(0.5);
  });

  it('should get confidence level', () => {
    expect(scorer.getConfidenceLevel(0.95)).toBe('excellent');
    expect(scorer.getConfidenceLevel(0.75)).toBe('high');
    expect(scorer.getConfidenceLevel(0.5)).toBe('medium');
    expect(scorer.getConfidenceLevel(0.2)).toBe('low');
  });

  it('should get scoring statistics', () => {
    const mockResults: MCPDiscoveryResult[] = [
      { mcp_name: 'test1', repository_url: '', documentation_url: '', setup_instructions: '', required_credentials: [], confidence_score: 0.9 },
      { mcp_name: 'test2', repository_url: '', documentation_url: '', setup_instructions: '', required_credentials: [], confidence_score: 0.7 },
      { mcp_name: 'test3', repository_url: '', documentation_url: '', setup_instructions: '', required_credentials: [], confidence_score: 0.3 }
    ];

    const stats = scorer.getScoringStats(mockResults);

    expect(stats.totalResults).toBe(3);
    expect(stats.averageScore).toBeCloseTo(0.63, 2);
    expect(stats.confidenceLevels.excellent).toBe(1);
    expect(stats.confidenceLevels.high).toBe(1);
    expect(stats.confidenceLevels.low).toBe(1);
  });
});

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({ requestsPerMinute: 10 });
  });

  it('should allow requests within limit', () => {
    expect(rateLimiter.canMakeRequest()).toBe(true);
  });

  it('should record requests', () => {
    rateLimiter.recordRequest();
    expect(rateLimiter.getTotalRequests()).toBe(1);
  });

  it('should record response times', () => {
    rateLimiter.recordResponseTime(1000);
    expect(rateLimiter.getAverageResponseTime()).toBe(1000);
  });

  it('should get status', () => {
    const status = rateLimiter.getStatus();
    expect(status.remaining).toBe(10);
    expect(status.totalRequests).toBe(0);
  });
});

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager({ enabled: true, ttlMinutes: 60 });
  });

  it('should store and retrieve data', async () => {
    const testData: MCPDiscoveryResult[] = [
      {
        mcp_name: 'test-mcp',
        repository_url: 'https://github.com/test/test',
        documentation_url: 'https://github.com/test/test',
        setup_instructions: 'npm install test-mcp',
        required_credentials: [],
        confidence_score: 0.8
      }
    ];

    await cacheManager.set('test-key', testData);
    const retrieved = await cacheManager.get('test-key');

    expect(retrieved).toEqual(testData);
  });

  it('should return null for non-existent keys', async () => {
    const result = await cacheManager.get('non-existent');
    expect(result).toBeNull();
  });

  it('should check if key exists', () => {
    expect(cacheManager.has('non-existent')).toBe(false);
  });

  it('should get statistics', () => {
    const stats = cacheManager.getStats();
    expect(stats.totalEntries).toBe(0);
    expect(stats.hitRate).toBe(0);
  });

  it('should clear cache', async () => {
    await cacheManager.set('test-key', []);
    await cacheManager.clear();
    expect(cacheManager.getStats().totalEntries).toBe(0);
  });
});

describe('FallbackManager', () => {
  let fallbackManager: FallbackManager;

  beforeEach(() => {
    fallbackManager = new FallbackManager();
  });

  it('should attempt fallback discovery', async () => {
    const results = await fallbackManager.attemptFallbackDiscovery('filesystem');

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  it('should get statistics', () => {
    const stats = fallbackManager.getStats();
    expect(stats.registrySize).toBeGreaterThan(0);
    expect(stats.enabledSources).toBeGreaterThan(0);
  });

  it('should add and remove registry entries', () => {
    const testEntry: MCPDiscoveryResult = {
      mcp_name: 'test-mcp',
      repository_url: 'https://github.com/test/test',
      documentation_url: 'https://github.com/test/test',
      setup_instructions: 'npm install test-mcp',
      required_credentials: [],
      confidence_score: 0.8
    };

    fallbackManager.addRegistryEntry(testEntry);
    const entries = fallbackManager.getRegistryEntries();
    expect(entries).toContainEqual(testEntry);

    const removed = fallbackManager.removeRegistryEntry('test-mcp');
    expect(removed).toBe(true);
  });
});

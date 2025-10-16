# Discovery Engine

The Discovery Engine is a comprehensive module for discovering Model Context Protocol (MCP) servers using the Perplexity API and intelligent fallback mechanisms. It provides automated discovery, parsing, confidence scoring, and caching capabilities.

## Overview

The Discovery Engine consists of several interconnected components:

- **PerplexityClient**: Handles API communication with retry logic
- **MCPParser**: Extracts MCP metadata from API responses
- **ConfidenceScorer**: Evaluates result quality and reliability
- **RateLimiter**: Manages API rate limits and request throttling
- **CacheManager**: Caches responses for improved performance
- **FallbackManager**: Provides alternative discovery methods
- **QueryTemplates**: Predefined search patterns for different use cases

## Features

### 🔍 Intelligent Discovery
- **Perplexity API Integration**: Uses Perplexity's online search capabilities to find MCP servers
- **Query Templates**: Predefined search patterns for different technologies and use cases
- **Smart Parsing**: Extracts repository URLs, npm packages, setup instructions, and credentials
- **Confidence Scoring**: Multi-factor algorithm to evaluate result quality

### 🚀 Performance & Reliability
- **Rate Limiting**: Respects API limits with configurable throttling
- **Caching**: In-memory caching with TTL and LRU eviction
- **Retry Logic**: Exponential backoff for failed requests
- **Fallback Mechanisms**: Predefined registry when API fails

### 🛠️ Developer Experience
- **TypeScript Support**: Full type safety and IntelliSense
- **Comprehensive Testing**: Unit and integration tests with mocks
- **Detailed Logging**: Structured logging for debugging and monitoring
- **Flexible Configuration**: Customizable settings for all components

## Quick Start

### Basic Usage

```typescript
import { DiscoveryEngine } from './discovery-engine';

// Initialize with API key
const engine = new DiscoveryEngine({
  perplexityApiKey: 'your-api-key',
  cacheEnabled: true,
  fallbackEnabled: true
});

// Discover MCP servers
const result = await engine.discoverMCPs('filesystem tools');

if (result.success) {
  console.log(`Found ${result.results.length} MCP servers`);
  result.results.forEach(mcp => {
    console.log(`- ${mcp.mcp_name}: ${mcp.npm_package}`);
  });
}
```

### Category-based Discovery

```typescript
// Discover by category
const filesystemMCPs = await engine.discoverByCategory('filesystem');

// Discover by tool type
const databaseMCPs = await engine.discoverByToolType('database');

// Discover by technology
const nodejsMCPs = await engine.discoverByTechnology('nodejs');
```

### Advanced Options

```typescript
const result = await engine.discoverMCPs('web scraping', {
  maxResults: 5,
  minConfidenceScore: 0.7,
  categories: ['web', 'scraping'],
  excludeCategories: ['deprecated']
});
```

## Configuration

### Discovery Engine Configuration

```typescript
interface DiscoveryEngineConfig {
  perplexityApiKey?: string;        // Perplexity API key
  maxRetries?: number;              // Max retry attempts (default: 3)
  retryDelay?: number;              // Retry delay in ms (default: 1000)
  rateLimitPerMinute?: number;      // API rate limit (default: 20)
  cacheEnabled?: boolean;           // Enable caching (default: true)
  cacheTtlMinutes?: number;         // Cache TTL in minutes (default: 60)
  fallbackEnabled?: boolean;        // Enable fallback (default: true)
}
```

### Search Options

```typescript
interface DiscoverySearchOptions {
  maxResults?: number;              // Maximum results to return
  includeNpmPackages?: boolean;     // Include npm packages
  includeGitHubRepos?: boolean;     // Include GitHub repositories
  minConfidenceScore?: number;      // Minimum confidence score
  categories?: string[];            // Include only these categories
  excludeCategories?: string[];     // Exclude these categories
}
```

## Components

### PerplexityClient

Handles communication with the Perplexity API with robust error handling and retry logic.

```typescript
import { PerplexityClient } from './perplexity-client';

const client = new PerplexityClient({
  apiKey: 'your-api-key',
  maxRetries: 3,
  retryDelay: 1000
});

// Test connection
const connectionTest = await client.testConnection();
if (connectionTest.success) {
  console.log('API connection successful');
}

// Search for MCP servers
const result = await client.search('filesystem MCP server');
```

**Features:**
- Exponential backoff retry logic
- Request/response logging
- Connection testing
- Usage statistics tracking

### MCPParser

Parses Perplexity API responses to extract structured MCP server information.

```typescript
import { MCPParser } from './mcp-parser';

const parser = new MCPParser({
  minConfidenceScore: 0.3,
  requireRepositoryUrl: false,
  strictMode: false
});

const results = await parser.parseResponse(apiResponse);
```

**Extraction Capabilities:**
- MCP server names
- Repository URLs (GitHub, GitLab, etc.)
- NPM package names
- Documentation URLs
- Setup instructions
- Required credentials

### ConfidenceScorer

Evaluates the quality and reliability of discovered MCP servers using multiple factors.

```typescript
import { ConfidenceScorer } from './confidence-scorer';

const scorer = new ConfidenceScorer({
  weights: {
    contentQuality: 0.25,
    urlReliability: 0.20,
    contentCompleteness: 0.20,
    sourceCredibility: 0.15,
    technicalValidity: 0.10,
    contextRelevance: 0.10
  }
});

const scoredResults = await scorer.scoreResults(results, originalQuery);
```

**Scoring Factors:**
- Content quality (repository, npm package, documentation)
- URL reliability (domain reputation, official sources)
- Content completeness (setup instructions, credentials)
- Source credibility (official MCP packages, verified sources)
- Technical validity (package naming, repository structure)
- Context relevance (query matching, category alignment)

### RateLimiter

Manages API rate limits with sliding window and burst protection.

```typescript
import { RateLimiter } from './rate-limiter';

const rateLimiter = new RateLimiter({
  requestsPerMinute: 20,
  burstLimit: 40,
  enableSlidingWindow: true
});

// Wait for available slot
await rateLimiter.waitForSlot();

// Record request
rateLimiter.recordRequest();

// Record response time
rateLimiter.recordResponseTime(1500);
```

**Features:**
- Sliding window rate limiting
- Burst protection
- Request tracking
- Response time statistics
- Configurable limits

### CacheManager

Provides intelligent caching with TTL, LRU eviction, and compression.

```typescript
import { CacheManager } from './cache-manager';

const cacheManager = new CacheManager({
  enabled: true,
  ttlMinutes: 60,
  maxEntries: 1000,
  enableLRU: true,
  enableCompression: false
});

// Store results
await cacheManager.set('query-key', results);

// Retrieve results
const cached = await cacheManager.get('query-key');

// Get statistics
const stats = cacheManager.getStats();
console.log(`Hit rate: ${stats.hitRate * 100}%`);
```

**Features:**
- TTL-based expiration
- LRU eviction policy
- Hit/miss statistics
- Memory usage tracking
- Configurable compression

### FallbackManager

Provides alternative discovery methods when primary sources fail.

```typescript
import { FallbackManager } from './fallback-manager';

const fallbackManager = new FallbackManager({
  enablePredefinedRegistry: true,
  enableAlternativeSources: true,
  maxFallbackResults: 10
});

const results = await fallbackManager.attemptFallbackDiscovery('filesystem');
```

**Fallback Sources:**
- Predefined MCP registry (curated list)
- GitHub API search
- NPM registry search
- Community-maintained lists

### QueryTemplates

Predefined search patterns for different discovery scenarios.

```typescript
import { QueryTemplateRegistry, queryUtils } from './query-templates';

const registry = new QueryTemplateRegistry();

// Get template by name
const template = registry.getTemplate('nodejs-mcp');

// Generate query
const query = registry.generateQuery('nodejs-mcp', { technology: 'filesystem' });

// Quick utility functions
const techQuery = queryUtils.generateTechnologyQuery('nodejs');
const toolQuery = queryUtils.generateToolTypeQuery('database');
const integrationQuery = queryUtils.generateIntegrationQuery('slack');
```

**Template Categories:**
- General discovery
- Technology-specific (Node.js, Python, Docker)
- Tool-type specific (filesystem, database, git)
- Integration-specific (Slack, GitHub, AWS)
- Category-specific (development, testing, deployment)
- Advanced (multi-tool, custom development, comparisons)

## Error Handling

The Discovery Engine provides comprehensive error handling with graceful degradation:

```typescript
try {
  const result = await engine.discoverMCPs('filesystem tools');
  
  if (!result.success) {
    console.error('Discovery failed:', result.error);
    // Handle error appropriately
  }
} catch (error) {
  console.error('Unexpected error:', error);
  // Handle unexpected errors
}
```

**Error Scenarios:**
- API rate limiting
- Network connectivity issues
- Invalid API responses
- Parsing failures
- Cache errors

## Monitoring and Statistics

### Discovery Statistics

```typescript
const stats = await engine.getDiscoveryStats();

console.log(`Total searches: ${stats.totalSearches}`);
console.log(`Cache hit rate: ${stats.cacheHitRate * 100}%`);
console.log(`Average search time: ${stats.averageSearchTime}ms`);
console.log(`Rate limit status: ${stats.rateLimitStatus.remaining} remaining`);
```

### Component Statistics

```typescript
// Rate limiter stats
const rateLimitStats = rateLimiter.getDetailedStats();

// Cache stats
const cacheStats = cacheManager.getStats();

// Confidence scoring stats
const scoringStats = scorer.getScoringStats(results);

// Fallback stats
const fallbackStats = fallbackManager.getStats();
```

## Testing

The module includes comprehensive tests covering all components:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test discovery-engine.test.ts
```

**Test Coverage:**
- Unit tests for all components
- Integration tests with mocked APIs
- Error handling scenarios
- Performance and edge cases
- Configuration validation

## Best Practices

### 1. API Key Management

```typescript
// Use environment variables
const engine = new DiscoveryEngine({
  perplexityApiKey: process.env.PERPLEXITY_API_KEY
});

// Or use credential manager
import { credentialUtils } from '../credential-manager';

const apiKey = await credentialUtils.get('perplexity_api_key');
const engine = new DiscoveryEngine({ perplexityApiKey: apiKey });
```

### 2. Caching Strategy

```typescript
// Enable caching for production
const engine = new DiscoveryEngine({
  cacheEnabled: true,
  cacheTtlMinutes: 60 // 1 hour cache
});

// Clear cache when needed
await engine.clearCache();
```

### 3. Rate Limiting

```typescript
// Configure appropriate rate limits
const engine = new DiscoveryEngine({
  rateLimitPerMinute: 20, // Adjust based on your API plan
  maxRetries: 3
});
```

### 4. Error Handling

```typescript
// Always check for success
const result = await engine.discoverMCPs(query);

if (result.success) {
  // Process results
  processResults(result.results);
} else {
  // Handle failure
  handleDiscoveryFailure(result.error);
}
```

### 5. Confidence Filtering

```typescript
// Filter by confidence score
const result = await engine.discoverMCPs(query, {
  minConfidenceScore: 0.7 // Only high-confidence results
});

// Check confidence levels
result.results.forEach(mcp => {
  const level = scorer.getConfidenceLevel(mcp.confidence_score);
  console.log(`${mcp.mcp_name}: ${level} confidence`);
});
```

## Troubleshooting

### Common Issues

**1. API Key Not Set**
```
Error: Perplexity API key is required
```
Solution: Set the API key in configuration or environment variables.

**2. Rate Limit Exceeded**
```
Error: API rate limit exceeded
```
Solution: Increase rate limit configuration or implement request queuing.

**3. No Results Found**
```
Result: success: false, results: []
```
Solution: Try different search terms or enable fallback mechanisms.

**4. Low Confidence Scores**
```
Result: confidence_score: 0.2
```
Solution: Adjust confidence scoring weights or improve search queries.

### Debug Mode

Enable detailed logging for troubleshooting:

```typescript
import { createLogger } from '../../utils/logger';

const logger = createLogger('discovery-engine');
logger.level = 'debug'; // Enable debug logging
```

## Contributing

When contributing to the Discovery Engine:

1. **Add Tests**: Include unit and integration tests for new features
2. **Update Documentation**: Keep README and code comments current
3. **Follow Patterns**: Use existing patterns for consistency
4. **Handle Errors**: Implement proper error handling and logging
5. **Performance**: Consider caching and rate limiting implications

## License

This module is part of the MCP Meta-Orchestrator project and follows the same MIT license.

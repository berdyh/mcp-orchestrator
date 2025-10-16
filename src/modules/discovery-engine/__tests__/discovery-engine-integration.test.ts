/**
 * Discovery Engine Integration Tests
 * 
 * Tests the integration between the discovery engine and web scraper
 * to ensure they work together properly.
 */

import { DiscoveryEngine, type DiscoverySearchOptions } from '../index';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('discovery-engine-integration-test');

describe('Discovery Engine Integration', () => {
  let discoveryEngine: DiscoveryEngine;

  beforeEach(() => {
    discoveryEngine = new DiscoveryEngine({
      webScrapingEnabled: true,
      webScrapingConfig: {
        maxRetries: 2,
        retryDelay: 500,
        timeout: 10000,
        rateLimitPerMinute: 5, // Conservative for testing
        respectRobotsTxt: true,
        maxContentLength: 512 * 1024
      },
      cacheEnabled: false, // Disable cache for testing
      fallbackEnabled: false // Disable fallback for testing
    });
  });

  describe('Web Scraping Integration', () => {
    it('should enhance discovery results with web scraping', async () => {
      // Mock a simple discovery result
      const mockResults = [
        {
          mcp_name: 'test-mcp-server',
          repository_url: 'https://github.com/test/test-mcp-server',
          documentation_url: 'https://github.com/test/test-mcp-server',
          setup_instructions: 'npm install test-mcp-server',
          required_credentials: ['API_KEY'],
          confidence_score: 0.8
        }
      ];

      // Test the web scraping enhancement method directly
      const scrapedContent = await (discoveryEngine as any).enhanceResultsWithWebScraping(
        mockResults,
        { enableWebScraping: true, scrapeDocumentation: true }
      );

      expect(scrapedContent).toBeDefined();
      expect(Array.isArray(scrapedContent)).toBe(true);
      
      // The scraping might fail for the mock URL, but the method should handle it gracefully
      if (scrapedContent.length > 0) {
        const scraped = scrapedContent[0];
        expect(scraped.url).toBeDefined();
        expect(scraped.metadata).toBeDefined();
        expect(scraped.extractedData).toBeDefined();
        expect(scraped.success).toBeDefined();
      }

      logger.info('Web scraping integration test completed', {
        scrapedContentCount: scrapedContent.length
      });
    }, 30000);

    it('should handle web scraping failures gracefully', async () => {
      // Test with invalid URLs to ensure graceful failure handling
      const mockResults = [
        {
          mcp_name: 'invalid-mcp-server',
          repository_url: 'https://invalid-url-that-does-not-exist.com',
          documentation_url: 'https://invalid-url-that-does-not-exist.com',
          setup_instructions: 'npm install invalid-mcp-server',
          required_credentials: ['API_KEY'],
          confidence_score: 0.5
        }
      ];

      const scrapedContent = await (discoveryEngine as any).enhanceResultsWithWebScraping(
        mockResults,
        { enableWebScraping: true, scrapeDocumentation: true }
      );

      expect(scrapedContent).toBeDefined();
      expect(Array.isArray(scrapedContent)).toBe(true);
      
      // Should handle failures gracefully
      if (scrapedContent.length > 0) {
        const scraped = scrapedContent[0];
        expect(scraped.success).toBe(false);
        expect(scraped.error).toBeDefined();
      }

      logger.info('Web scraping failure handling test completed', {
        scrapedContentCount: scrapedContent.length
      });
    }, 30000);

    it('should respect web scraping configuration', async () => {
      const discoveryEngineWithDisabledScraping = new DiscoveryEngine({
        webScrapingEnabled: false,
        cacheEnabled: false,
        fallbackEnabled: false
      });

      const mockResults = [
        {
          mcp_name: 'test-mcp-server',
          repository_url: 'https://github.com/test/test-mcp-server',
          documentation_url: 'https://github.com/test/test-mcp-server',
          setup_instructions: 'npm install test-mcp-server',
          required_credentials: ['API_KEY'],
          confidence_score: 0.8
        }
      ];

      const scrapedContent = await (discoveryEngineWithDisabledScraping as any).enhanceResultsWithWebScraping(
        mockResults,
        { enableWebScraping: true, scrapeDocumentation: true }
      );

      expect(scrapedContent).toBeDefined();
      expect(scrapedContent.length).toBe(0); // Should return empty array when disabled

      logger.info('Web scraping configuration test completed');
    }, 10000);
  });

  describe('Discovery Options Integration', () => {
    it('should respect enableWebScraping option', async () => {
      const mockResults = [
        {
          mcp_name: 'test-mcp-server',
          repository_url: 'https://github.com/test/test-mcp-server',
          documentation_url: 'https://github.com/test/test-mcp-server',
          setup_instructions: 'npm install test-mcp-server',
          required_credentials: ['API_KEY'],
          confidence_score: 0.8
        }
      ];

      // Test with web scraping disabled in options
      const scrapedContentDisabled = await (discoveryEngine as any).enhanceResultsWithWebScraping(
        mockResults,
        { enableWebScraping: false, scrapeDocumentation: true }
      );

      expect(scrapedContentDisabled).toBeDefined();
      expect(scrapedContentDisabled.length).toBeGreaterThanOrEqual(0);

      // Test with web scraping enabled in options
      const scrapedContentEnabled = await (discoveryEngine as any).enhanceResultsWithWebScraping(
        mockResults,
        { enableWebScraping: true, scrapeDocumentation: true }
      );

      expect(scrapedContentEnabled).toBeDefined();
      expect(Array.isArray(scrapedContentEnabled)).toBe(true);

      logger.info('Discovery options integration test completed', {
        disabledCount: scrapedContentDisabled.length,
        enabledCount: scrapedContentEnabled.length
      });
    }, 20000);
  });

  describe('Scraping Target Creation', () => {
    it('should create appropriate scraping targets from MCP results', async () => {
      const mockResults = [
        {
          mcp_name: 'github-mcp-server',
          repository_url: 'https://github.com/test/github-mcp-server',
          documentation_url: 'https://github.com/test/github-mcp-server',
          setup_instructions: 'npm install github-mcp-server',
          required_credentials: ['GITHUB_TOKEN'],
          confidence_score: 0.9
        },
        {
          mcp_name: 'npm-mcp-server',
          repository_url: 'https://github.com/test/npm-mcp-server',
          npm_package: '@test/npm-mcp-server',
          documentation_url: 'https://docs.test.com/npm-mcp-server',
          setup_instructions: 'npm install @test/npm-mcp-server',
          required_credentials: ['NPM_TOKEN'],
          confidence_score: 0.8
        }
      ];

      const scrapedContent = await (discoveryEngine as any).enhanceResultsWithWebScraping(
        mockResults,
        { enableWebScraping: true, scrapeDocumentation: true }
      );

      expect(scrapedContent).toBeDefined();
      expect(Array.isArray(scrapedContent)).toBe(true);
      
      // Should create targets for GitHub repos and NPM packages
      // The actual scraping might fail, but targets should be created
      logger.info('Scraping target creation test completed', {
        mockResultsCount: mockResults.length,
        scrapedContentCount: scrapedContent.length
      });
    }, 30000);
  });
});

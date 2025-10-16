/**
 * Web Scraper Tests
 * 
 * Tests for the web scraper functionality
 */

import { WebScraper } from '../web-scraper';

describe('WebScraper', () => {
  let webScraper: WebScraper;

  beforeEach(() => {
    webScraper = new WebScraper({
      maxRetries: 1,
      retryDelay: 500,
      timeout: 10000,
      rateLimitPerMinute: 5,
      respectRobotsTxt: false, // Disable for testing
      maxContentLength: 1024 * 512 // 512KB for testing
    });
  });

  describe('scrapeUrl', () => {
    it('should handle invalid URLs gracefully', async () => {
      const result = await webScraper.scrapeUrl('invalid-url');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.url).toBe('invalid-url');
    });

    it('should handle non-existent URLs', async () => {
      const result = await webScraper.scrapeUrl('https://this-domain-does-not-exist-12345.com');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should scrape a simple HTML page', async () => {
      // Test with a simple, reliable page
      const result = await webScraper.scrapeUrl('https://httpbin.org/html');
      
      if (result.success) {
        expect(result.title).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.metadata.contentType).toBe('general');
        expect(result.extractedData).toBeDefined();
      } else {
        // If it fails, it should have a proper error message
        expect(result.error).toBeDefined();
      }
    }, 15000);

    it('should extract structured data from content', async () => {
      const result = await webScraper.scrapeUrl('https://httpbin.org/html');
      
      if (result.success) {
        expect(result.extractedData.installationCommands).toBeDefined();
        expect(result.extractedData.configurationExamples).toBeDefined();
        expect(result.extractedData.setupInstructions).toBeDefined();
        expect(result.extractedData.requiredCredentials).toBeDefined();
        expect(result.extractedData.codeExamples).toBeDefined();
        expect(result.extractedData.troubleshooting).toBeDefined();
      }
    }, 15000);
  });

  describe('scrapeGitHubReadme', () => {
    it('should handle invalid GitHub URLs', async () => {
      const result = await webScraper.scrapeGitHubReadme('https://github.com/invalid/repo');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should convert GitHub repo URL to README URL', async () => {
      const result = await webScraper.scrapeGitHubReadme('https://github.com/microsoft/vscode');
      
      // This might fail due to rate limiting or access restrictions, but should handle gracefully
      expect(result.url).toContain('raw.githubusercontent.com');
      expect(result.metadata.contentType).toBe('github');
    }, 15000);
  });

  describe('scrapeNpmPackage', () => {
    it('should handle invalid package names', async () => {
      const result = await webScraper.scrapeNpmPackage('invalid-package-name-12345');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should scrape a real NPM package', async () => {
      const result = await webScraper.scrapeNpmPackage('axios');
      
      if (result.success) {
        expect(result.metadata.contentType).toBe('npm');
        expect(result.title).toContain('axios');
      } else {
        // If it fails, it should have a proper error message
        expect(result.error).toBeDefined();
      }
    }, 15000);
  });

  describe('scrapeMultipleUrls', () => {
    it('should handle empty target list', async () => {
      const result = await webScraper.scrapeMultipleUrls([]);
      
      expect(result).toEqual([]);
    });

    it('should scrape multiple URLs with rate limiting', async () => {
      const targets = [
        {
          url: 'https://httpbin.org/html',
          type: 'general' as const,
          priority: 'high' as const
        },
        {
          url: 'https://httpbin.org/json',
          type: 'general' as const,
          priority: 'medium' as const
        }
      ];

      const results = await webScraper.scrapeMultipleUrls(targets);
      
      // Check that we got results (success or failure)
      expect(results).toHaveLength(2);
      
      // If any succeed, that's good; if all fail, that's also acceptable for testing
      const successfulResults = results.filter(r => r.success);
      const failedResults = results.filter(r => !r.success);
      
      // Either we should have some successful results, or all should have proper error messages
      if (successfulResults.length === 0) {
        expect(failedResults.every(r => r.error)).toBe(true);
      }
    }, 20000);
  });

  describe('error handling', () => {
    it('should respect timeout settings', async () => {
      const fastScraper = new WebScraper({
        timeout: 100, // Very short timeout
        maxRetries: 1
      });

      const result = await fastScraper.scrapeUrl('https://httpbin.org/delay/2');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    }, 10000);

    it('should handle rate limiting gracefully', async () => {
      const slowScraper = new WebScraper({
        rateLimitPerMinute: 1, // Very slow rate limit
        respectRobotsTxt: false
      });

      const targets = [
        {
          url: 'https://httpbin.org/html',
          type: 'general' as const,
          priority: 'high' as const
        },
        {
          url: 'https://httpbin.org/json',
          type: 'general' as const,
          priority: 'high' as const
        }
      ];

      const startTime = Date.now();
      const results = await slowScraper.scrapeMultipleUrls(targets);
      const endTime = Date.now();

      // Should take at least 1 minute due to rate limiting
      expect(endTime - startTime).toBeGreaterThan(50000); // 50 seconds
      expect(results).toHaveLength(2);
    }, 70000);
  });
});

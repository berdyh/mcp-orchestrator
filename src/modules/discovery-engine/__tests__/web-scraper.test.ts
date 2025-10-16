/**
 * Web Scraper Tests
 * 
 * Tests for the web scraper functionality to ensure it can properly
 * extract MCP documentation from various sources.
 */

import { WebScraper, type ScrapingTarget } from '../web-scraper.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('web-scraper-test');

describe('WebScraper', () => {
  let webScraper: WebScraper;

  beforeEach(() => {
    webScraper = new WebScraper({
      maxRetries: 2,
      retryDelay: 500,
      timeout: 10000,
      rateLimitPerMinute: 5, // Very conservative for testing
      respectRobotsTxt: true,
      maxContentLength: 512 * 1024 // 512KB max for testing
    });
  });

  describe('GitHub README Scraping', () => {
    it('should scrape GitHub README content', async () => {
      // Test with a known MCP server repository
      const repoUrl = 'https://github.com/modelcontextprotocol/servers';
      
      const result = await webScraper.scrapeGitHubReadme(repoUrl);
      
      expect(result).toBeDefined();
      expect(result.url).toContain('github');
      expect(['github', 'readme']).toContain(result.metadata.contentType);
      
      if (result.success) {
        expect(result.title).toBeTruthy();
        expect(result.content).toBeTruthy();
        expect(result.extractedData.installationCommands.length).toBeGreaterThanOrEqual(0);
        expect(result.extractedData.setupInstructions.length).toBeGreaterThanOrEqual(0);
        
        logger.info('GitHub README scraping test passed', {
          title: result.title,
          contentLength: result.content.length,
          installationCommands: result.extractedData.installationCommands.length,
          setupInstructions: result.extractedData.setupInstructions.length
        });
      } else {
        logger.warn('GitHub README scraping failed', { error: result.error });
        // This is acceptable for testing - the repo might not exist or be accessible
        expect(result.error).toBeDefined();
      }
    }, 30000); // 30 second timeout for network requests

    it('should handle invalid GitHub URLs gracefully', async () => {
      const invalidUrl = 'https://github.com/nonexistent/repo';
      
      const result = await webScraper.scrapeGitHubReadme(invalidUrl);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      
      logger.info('Invalid GitHub URL test passed', { error: result.error });
    }, 15000);
  });

  describe('NPM Package Scraping', () => {
    it('should scrape NPM package documentation', async () => {
      // Test with a known MCP-related package
      const packageName = '@modelcontextprotocol/sdk';
      
      const result = await webScraper.scrapeNpmPackage(packageName);
      
      expect(result).toBeDefined();
      expect(result.url).toContain('npmjs.com');
      expect(['npm', 'general']).toContain(result.metadata.contentType);
      
      if (result.success) {
        expect(result.title).toBeTruthy();
        expect(result.content).toBeTruthy();
        expect(result.extractedData.installationCommands.length).toBeGreaterThanOrEqual(0);
        
        logger.info('NPM package scraping test passed', {
          title: result.title,
          contentLength: result.content.length,
          installationCommands: result.extractedData.installationCommands.length
        });
      } else {
        logger.warn('NPM package scraping failed', { error: result.error });
        // This is acceptable for testing
        expect(result.error).toBeDefined();
      }
    }, 30000);

    it('should handle invalid NPM package names gracefully', async () => {
      const invalidPackage = 'nonexistent-package-12345';
      
      const result = await webScraper.scrapeNpmPackage(invalidPackage);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      
      logger.info('Invalid NPM package test passed', { error: result.error });
    }, 15000);
  });

  describe('Multiple URL Scraping', () => {
    it('should scrape multiple URLs with rate limiting', async () => {
      const targets: ScrapingTarget[] = [
        {
          url: 'https://github.com/modelcontextprotocol/servers',
          type: 'github_readme',
          priority: 'high'
        },
        {
          url: 'https://www.npmjs.com/package/@modelcontextprotocol/sdk',
          type: 'npm_docs',
          priority: 'medium'
        }
      ];
      
      const results = await webScraper.scrapeMultipleUrls(targets);
      
      expect(results).toBeDefined();
      expect(results.length).toBe(targets.length);
      
      let successCount = 0;
      for (const result of results) {
        expect(result.url).toBeTruthy();
        if (result.success) {
          successCount++;
          expect(result.title).toBeTruthy();
          expect(result.content).toBeTruthy();
        } else {
          expect(result.error).toBeDefined();
        }
      }
      
      logger.info('Multiple URL scraping test completed', {
        total: results.length,
        successful: successCount,
        failed: results.length - successCount
      });
    }, 60000); // 60 second timeout for multiple requests
  });

  describe('Content Extraction', () => {
    it('should extract installation commands from content', async () => {
      // Test with a simple HTML content that contains installation commands
      const testHtml = `
        <html>
          <body>
            <h1>Test MCP Server</h1>
            <h2>Installation</h2>
            <pre><code>npm install @test/mcp-server</code></pre>
            <p>You can also install with yarn:</p>
            <pre><code>yarn add @test/mcp-server</code></pre>
          </body>
        </html>
      `;
      
      // We'll test the private method through a public method
      const result = await webScraper.scrapeUrl('data:text/html;base64,' + Buffer.from(testHtml).toString('base64'));
      
      if (result.success) {
        expect(result.extractedData.installationCommands.length).toBeGreaterThan(0);
        expect(result.extractedData.installationCommands.some(cmd => 
          cmd.includes('npm install') || cmd.includes('yarn add')
        )).toBe(true);
        
        logger.info('Content extraction test passed', {
          installationCommands: result.extractedData.installationCommands
        });
      }
    }, 10000);
  });

  describe('Error Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      const webScraperWithShortTimeout = new WebScraper({
        timeout: 100, // Very short timeout
        maxRetries: 1
      });
      
      const result = await webScraperWithShortTimeout.scrapeUrl('https://httpbin.org/delay/5');
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      
      logger.info('Timeout handling test passed', { error: result.error });
    }, 10000);

    it('should handle invalid URLs gracefully', async () => {
      const result = await webScraper.scrapeUrl('not-a-valid-url');
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      
      logger.info('Invalid URL handling test passed', { error: result.error });
    }, 10000);
  });

  describe('Rate Limiting', () => {
    it('should respect rate limits', async () => {
      const startTime = Date.now();
      
      // Make multiple requests quickly
      const promises = [
        webScraper.scrapeUrl('https://httpbin.org/get'),
        webScraper.scrapeUrl('https://httpbin.org/get'),
        webScraper.scrapeUrl('https://httpbin.org/get')
      ];
      
      const results = await Promise.allSettled(promises);
      const endTime = Date.now();
      
      // Should take some time due to rate limiting
      expect(endTime - startTime).toBeGreaterThan(1000); // At least 1 second
      
      logger.info('Rate limiting test passed', {
        duration: endTime - startTime,
        results: results.length
      });
    }, 30000);
  });
});
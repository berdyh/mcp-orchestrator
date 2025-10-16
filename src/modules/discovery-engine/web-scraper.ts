/**
 * Web Scraper for MCP Documentation
 * 
 * This module provides web scraping capabilities to extract detailed MCP documentation
 * from GitHub repositories, NPM packages, and official documentation sites.
 */

import axios, { type AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { createLogger } from '../../utils/logger';
import { RateLimiter } from './rate-limiter';

const logger = createLogger('web-scraper');

/**
 * Scraped content from a web page
 */
export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  metadata: {
    contentType: 'readme' | 'documentation' | 'npm' | 'github' | 'general';
    lastModified?: string | undefined;
    language?: string | undefined;
    size?: number | undefined;
  };
  extractedData: {
    installationCommands: string[];
    configurationExamples: string[];
    setupInstructions: string[];
    requiredCredentials: string[];
    codeExamples: string[];
    troubleshooting: string[];
  };
  success: boolean;
  error?: string | undefined;
}

/**
 * Web scraper configuration
 */
export interface WebScraperConfig {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  rateLimitPerMinute?: number;
  respectRobotsTxt?: boolean;
  userAgent?: string;
  maxContentLength?: number;
}

/**
 * Scraping target
 */
export interface ScrapingTarget {
  url: string;
  type: 'github_readme' | 'npm_docs' | 'documentation' | 'general';
  priority: 'high' | 'medium' | 'low';
  expectedContent?: string[];
}

/**
 * Web scraper class
 */
export class WebScraper {
  private axiosInstance: AxiosInstance;
  private rateLimiter: RateLimiter;
  private config: WebScraperConfig;

  constructor(config: WebScraperConfig = {}) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
      rateLimitPerMinute: 10, // Conservative rate limiting
      respectRobotsTxt: true,
      userAgent: 'MCP-Meta-Orchestrator/1.0 (Web Scraper)',
      maxContentLength: 1024 * 1024, // 1MB max
      ...config
    };

    this.rateLimiter = new RateLimiter({ 
      requestsPerMinute: this.config.rateLimitPerMinute! 
    });

    this.axiosInstance = axios.create({
      timeout: this.config.timeout!,
      headers: {
        'User-Agent': this.config.userAgent!,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      maxContentLength: this.config.maxContentLength!,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400
    });

    logger.info('Web scraper initialized', {
      rateLimitPerMinute: this.config.rateLimitPerMinute,
      respectRobotsTxt: this.config.respectRobotsTxt,
      timeout: this.config.timeout
    });
  }

  /**
   * Scrapes content from a single URL
   */
  async scrapeUrl(url: string, type?: 'github_readme' | 'npm_docs' | 'documentation' | 'general'): Promise<ScrapedContent> {
    try {
      logger.debug('Starting to scrape URL', { url, type });

      // Apply rate limiting
      await this.rateLimiter.waitForSlot();

      // Check robots.txt if enabled
      if (this.config.respectRobotsTxt) {
        const canScrape = await this.checkRobotsTxt(url);
        if (!canScrape) {
          return {
            url,
            title: '',
            content: '',
            metadata: { contentType: 'general' },
            extractedData: {
              installationCommands: [],
              configurationExamples: [],
              setupInstructions: [],
              requiredCredentials: [],
              codeExamples: [],
              troubleshooting: []
            },
            success: false,
            error: 'Robots.txt disallows scraping this URL'
          };
        }
      }

      // Fetch the page
      const response = await this.fetchWithRetry(url);
      
      if (!response.success) {
        return {
          url,
          title: '',
          content: '',
          metadata: { contentType: 'general' },
          extractedData: {
            installationCommands: [],
            configurationExamples: [],
            setupInstructions: [],
            requiredCredentials: [],
            codeExamples: [],
            troubleshooting: []
          },
          success: false,
          error: response.error
        };
      }

      // Parse the content
      const parsed = this.parseContent(response.data!, url, type);
      
      logger.info('Successfully scraped URL', { 
        url, 
        contentType: parsed.metadata.contentType,
        contentLength: parsed.content.length 
      });

      return parsed;

    } catch (error) {
      logger.error('Failed to scrape URL', { 
        url, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      return {
        url,
        title: '',
        content: '',
        metadata: { contentType: 'general' },
        extractedData: {
          installationCommands: [],
          configurationExamples: [],
          setupInstructions: [],
          requiredCredentials: [],
          codeExamples: [],
          troubleshooting: []
        },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Scrapes multiple URLs in parallel (with rate limiting)
   */
  async scrapeMultipleUrls(targets: ScrapingTarget[]): Promise<ScrapedContent[]> {
    logger.info('Starting to scrape multiple URLs', { count: targets.length });

    const results: ScrapedContent[] = [];
    
    // Process targets in batches to respect rate limits
    const batchSize = Math.max(1, Math.floor(this.config.rateLimitPerMinute! / 2));
    
    for (let i = 0; i < targets.length; i += batchSize) {
      const batch = targets.slice(i, i + batchSize);
      
      const batchPromises = batch.map(target => 
        this.scrapeUrl(target.url, target.type)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          logger.error('Batch scraping failed', { 
            error: result.reason instanceof Error ? result.reason.message : 'Unknown error' 
          });
        }
      }
      
      // Add delay between batches
      if (i + batchSize < targets.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    logger.info('Completed scraping multiple URLs', { 
      total: targets.length, 
      successful: results.filter(r => r.success).length 
    });

    return results;
  }

  /**
   * Scrapes GitHub README content
   */
  async scrapeGitHubReadme(repoUrl: string): Promise<ScrapedContent> {
    // Convert GitHub repo URL to raw README URL
    const readmeUrl = this.convertToGitHubReadmeUrl(repoUrl);
    return this.scrapeUrl(readmeUrl, 'github_readme');
  }

  /**
   * Scrapes NPM package documentation
   */
  async scrapeNpmPackage(packageName: string): Promise<ScrapedContent> {
    const npmUrl = `https://www.npmjs.com/package/${packageName}`;
    return this.scrapeUrl(npmUrl, 'npm_docs');
  }

  /**
   * Fetches content with retry logic
   */
  private async fetchWithRetry(url: string): Promise<{ success: boolean; data?: string; error?: string }> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries!; attempt++) {
      try {
        logger.debug('Fetching URL', { url, attempt: attempt + 1 });

        const response = await this.axiosInstance.get(url);
        
        if (response.status === 200 && response.data) {
          return {
            success: true,
            data: response.data
          };
        } else {
          throw new Error(`Unexpected status: ${response.status}`);
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry on certain errors
        if (this.shouldNotRetry(error)) {
          logger.error('Non-retryable error', { url, error: lastError.message });
          break;
        }

        // If this is the last attempt, don't wait
        if (attempt === this.config.maxRetries!) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.config.retryDelay! * Math.pow(2, attempt),
          10000
        );

        logger.warn('Fetch failed, retrying', { 
          url, 
          attempt: attempt + 1, 
          delay, 
          error: lastError.message 
        });

        await this.sleep(delay);
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Max retries exceeded'
    };
  }

  /**
   * Determines if an error should not be retried
   */
  private shouldNotRetry(error: any): boolean {
    // Don't retry on client errors
    if (error.response?.status >= 400 && error.response?.status < 500) {
      return true;
    }

    // Don't retry on timeout
    if (error.code === 'ECONNABORTED') {
      return true;
    }

    return false;
  }

  /**
   * Checks robots.txt for scraping permissions
   */
  private async checkRobotsTxt(url: string): Promise<boolean> {
    try {
      const urlObj = new URL(url);
      const robotsUrl = `${urlObj.protocol}//${urlObj.host}/robots.txt`;
      
      const response = await this.axiosInstance.get(robotsUrl, { timeout: 5000 });
      
      if (response.status === 200 && response.data) {
        const robotsContent = response.data;
        const userAgent = this.config.userAgent!;
        
        // Simple robots.txt parsing
        const lines = robotsContent.split('\n');
        let currentUserAgent = '';
        let disallowPaths: string[] = [];
        
        for (const line of lines) {
          const trimmed = line.trim().toLowerCase();
          
          if (trimmed.startsWith('user-agent:')) {
            currentUserAgent = trimmed.substring(11).trim();
          } else if (trimmed.startsWith('disallow:') && 
                     (currentUserAgent === '*' || currentUserAgent === userAgent.toLowerCase())) {
            const disallowPath = trimmed.substring(9).trim();
            if (disallowPath) {
              disallowPaths.push(disallowPath);
            }
          }
        }
        
        // Check if the URL path is disallowed
        const urlPath = urlObj.pathname;
        for (const disallowPath of disallowPaths) {
          if (urlPath.startsWith(disallowPath)) {
            logger.debug('URL disallowed by robots.txt', { url, disallowPath });
            return false;
          }
        }
      }
      
      return true;
    } catch (error) {
      // If we can't check robots.txt, assume it's allowed
      logger.debug('Could not check robots.txt, assuming allowed', { url });
      return true;
    }
  }

  /**
   * Converts GitHub repo URL to raw README URL
   */
  private convertToGitHubReadmeUrl(repoUrl: string): string {
    try {
      const url = new URL(repoUrl);
      
      if (url.hostname === 'github.com') {
        const pathParts = url.pathname.split('/').filter(part => part);
        
        if (pathParts.length >= 2) {
          const owner = pathParts[0];
          const repo = pathParts[1];
          
          // Try common README filenames
          const readmeFiles = ['README.md', 'readme.md', 'Readme.md', 'README.rst', 'README.txt'];
          
          for (const readmeFile of readmeFiles) {
            const readmeUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${readmeFile}`;
            // We'll try the first one and let the scraper handle 404s
            return readmeUrl;
          }
        }
      }
      
      return repoUrl;
    } catch (error) {
      logger.warn('Could not convert to GitHub README URL', { repoUrl });
      return repoUrl;
    }
  }

  /**
   * Parses scraped content and extracts relevant information
   */
  private parseContent(html: string, url: string, type?: string): ScrapedContent {
    const $ = cheerio.load(html);
    
    // Extract title
    const title = $('title').text().trim() || 
                  $('h1').first().text().trim() || 
                  $('h2').first().text().trim() || 
                  'Untitled';

    // Extract main content
    let content = '';
    
    if (type === 'github_readme') {
      // For GitHub README, the content is usually in the body
      content = $('body').text().trim();
    } else if (type === 'npm_docs') {
      // For NPM docs, look for main content areas
      content = $('.package-description, .package-readme, .package-details').text().trim() ||
                $('main, .main, .content').text().trim() ||
                $('body').text().trim();
    } else {
      // For general content, try to find main content areas
      content = $('main, .main, .content, .documentation, .readme').text().trim() ||
                $('body').text().trim();
    }

    // Determine content type
    const contentType = this.determineContentType(url, type);

    // Extract structured data
    const extractedData = this.extractStructuredData($ as cheerio.CheerioAPI, content, type);

    return {
      url,
      title,
      content,
      metadata: {
        contentType,
        lastModified: this.extractLastModified($ as cheerio.CheerioAPI),
        language: this.extractLanguage($ as cheerio.CheerioAPI),
        size: content.length
      },
      extractedData,
      success: true
    };
  }

  /**
   * Determines the content type based on URL and type hint
   */
  private determineContentType(url: string, type?: string): 'readme' | 'documentation' | 'npm' | 'github' | 'general' {
    if (type) {
      switch (type) {
        case 'github_readme': return 'github';
        case 'npm_docs': return 'npm';
        case 'documentation': return 'documentation';
        default: return 'general';
      }
    }

    const lowerUrl = url.toLowerCase();
    
    if (lowerUrl.includes('github.com') && lowerUrl.includes('readme')) {
      return 'github';
    } else if (lowerUrl.includes('npmjs.com')) {
      return 'npm';
    } else if (lowerUrl.includes('docs') || lowerUrl.includes('documentation')) {
      return 'documentation';
    } else if (lowerUrl.includes('readme')) {
      return 'readme';
    }
    
    return 'general';
  }

  /**
   * Extracts structured data from the content
   */
  private extractStructuredData($: cheerio.CheerioAPI, content: string, type?: string): ScrapedContent['extractedData'] {
    const extractedData: ScrapedContent['extractedData'] = {
      installationCommands: [],
      configurationExamples: [],
      setupInstructions: [],
      requiredCredentials: [],
      codeExamples: [],
      troubleshooting: []
    };

    // Extract installation commands
    extractedData.installationCommands = this.extractInstallationCommands($, content);
    
    // Extract configuration examples
    extractedData.configurationExamples = this.extractConfigurationExamples($, content);
    
    // Extract setup instructions
    extractedData.setupInstructions = this.extractSetupInstructions($, content);
    
    // Extract required credentials
    extractedData.requiredCredentials = this.extractRequiredCredentials($, content);
    
    // Extract code examples
    extractedData.codeExamples = this.extractCodeExamples($, content);
    
    // Extract troubleshooting information
    extractedData.troubleshooting = this.extractTroubleshooting($, content);

    return extractedData;
  }

  /**
   * Extracts installation commands from content
   */
  private extractInstallationCommands($: cheerio.CheerioAPI, content: string): string[] {
    const commands: string[] = [];
    
    // Look for code blocks with installation commands
    $('pre code, code').each((_, element) => {
      const code = $(element).text().trim();
      if (this.isInstallationCommand(code)) {
        commands.push(code);
      }
    });

    // Look for installation patterns in text
    const installPatterns = [
      /npm\s+install[^\n]*/gi,
      /pip\s+install[^\n]*/gi,
      /yarn\s+add[^\n]*/gi,
      /pnpm\s+add[^\n]*/gi,
      /go\s+get[^\n]*/gi,
      /docker\s+pull[^\n]*/gi
    ];

    for (const pattern of installPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        commands.push(...matches);
      }
    }

    return [...new Set(commands)]; // Remove duplicates
  }

  /**
   * Extracts configuration examples from content
   */
  private extractConfigurationExamples($: cheerio.CheerioAPI, content: string): string[] {
    const examples: string[] = [];
    
    // Look for JSON configuration blocks
    $('pre code').each((_, element) => {
      const code = $(element).text().trim();
      if (this.isJsonConfiguration(code)) {
        examples.push(code);
      }
    });

    // Look for configuration patterns in text
    const configPatterns = [
      /```json[\s\S]*?```/gi,
      /```yaml[\s\S]*?```/gi,
      /```toml[\s\S]*?```/gi,
      /```ini[\s\S]*?```/gi
    ];

    for (const pattern of configPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        examples.push(...matches);
      }
    }

    return [...new Set(examples)];
  }

  /**
   * Extracts setup instructions from content
   */
  private extractSetupInstructions($: cheerio.CheerioAPI, content: string): string[] {
    const instructions: string[] = [];
    
    // Look for setup-related sections
    const setupKeywords = ['setup', 'install', 'configure', 'initialize', 'getting started'];
    
    $('h1, h2, h3, h4, h5, h6').each((_, element) => {
      const heading = $(element).text().toLowerCase();
      if (setupKeywords.some(keyword => heading.includes(keyword))) {
        const section = this.extractSectionContent($, element);
        if (section) {
          instructions.push(section);
        }
      }
    });

    return instructions;
  }

  /**
   * Extracts required credentials from content
   */
  private extractRequiredCredentials($: cheerio.CheerioAPI, content: string): string[] {
    const credentials: string[] = [];
    
    // Look for credential patterns
    const credentialPatterns = [
      /API[_\s]?[Kk]ey/gi,
      /[Tt]oken/gi,
      /[Ss]ecret/gi,
      /[Pp]assword/gi,
      /[Uu]sername/gi,
      /[Ee]mail/gi,
      /[Uu]rl/gi,
      /[Ee]ndpoint/gi
    ];

    for (const pattern of credentialPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        credentials.push(...matches);
      }
    }

    // Look for environment variable patterns
    const envPattern = /[A-Z_][A-Z0-9_]*/g;
    const envMatches = content.match(envPattern);
    if (envMatches) {
      credentials.push(...envMatches.filter(match => 
        match.length > 3 && 
        (match.includes('API') || match.includes('KEY') || match.includes('TOKEN') || match.includes('SECRET'))
      ));
    }

    return [...new Set(credentials)];
  }

  /**
   * Extracts code examples from content
   */
  private extractCodeExamples($: cheerio.CheerioAPI, content: string): string[] {
    const examples: string[] = [];
    
    // Look for code blocks
    $('pre code').each((_, element) => {
      const code = $(element).text().trim();
      if (code.length > 50) { // Only include substantial code blocks
        examples.push(code);
      }
    });

    return examples;
  }

  /**
   * Extracts troubleshooting information from content
   */
  private extractTroubleshooting($: cheerio.CheerioAPI, content: string): string[] {
    const troubleshooting: string[] = [];
    
    // Look for troubleshooting sections
    const troubleKeywords = ['troubleshoot', 'trouble', 'error', 'issue', 'problem', 'fix', 'solution'];
    
    $('h1, h2, h3, h4, h5, h6').each((_, element) => {
      const heading = $(element).text().toLowerCase();
      if (troubleKeywords.some(keyword => heading.includes(keyword))) {
        const section = this.extractSectionContent($, element);
        if (section) {
          troubleshooting.push(section);
        }
      }
    });

    return troubleshooting;
  }

  /**
   * Helper methods
   */
  private isInstallationCommand(code: string): boolean {
    const installKeywords = ['npm install', 'pip install', 'yarn add', 'pnpm add', 'go get', 'docker pull'];
    return installKeywords.some(keyword => code.toLowerCase().includes(keyword));
  }

  private isJsonConfiguration(code: string): boolean {
    try {
      JSON.parse(code);
      return true;
    } catch {
      return false;
    }
  }

  private extractSectionContent($: cheerio.CheerioAPI, headingElement: cheerio.Element): string | null {
    const $heading = $(headingElement);
    const $nextElements = $heading.nextUntil('h1, h2, h3, h4, h5, h6');
    
    if ($nextElements.length > 0) {
      return $nextElements.text().trim();
    }
    
    return null;
  }

  private extractLastModified($: cheerio.CheerioAPI): string | undefined {
    // Try to find last modified date in various formats
    const lastModifiedSelectors = [
      'meta[property="article:modified_time"]',
      'meta[name="last-modified"]',
      'meta[http-equiv="last-modified"]',
      '.last-modified',
      '.updated',
      '.date'
    ];

    for (const selector of lastModifiedSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        const content = element.attr('content') || element.text();
        if (content) {
          return content.trim();
        }
      }
    }

    return undefined;
  }

  private extractLanguage($: cheerio.CheerioAPI): string | undefined {
    const langElement = $('html[lang], meta[name="language"]');
    if (langElement.length > 0) {
      return langElement.attr('lang') || langElement.attr('content');
    }
    return undefined;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Default web scraper instance
 */
export const defaultWebScraper = new WebScraper();

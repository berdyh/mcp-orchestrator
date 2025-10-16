/**
 * Perplexity API Client
 * 
 * This module provides a robust client for interacting with the Perplexity API,
 * including retry logic, error handling, and response validation.
 */

import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('perplexity-client');

/**
 * Perplexity API configuration
 */
export interface PerplexityConfig {
  apiKey?: string;
  baseUrl?: string;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

/**
 * Perplexity API request
 */
export interface PerplexityRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
}

/**
 * Perplexity API response
 */
export interface PerplexityResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Search result from Perplexity API
 */
export interface PerplexitySearchResult {
  success: boolean;
  data?: string | undefined;
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

/**
 * Perplexity API client with retry logic
 */
export class PerplexityClient {
  private axiosInstance: AxiosInstance;
  private config: PerplexityConfig;
  private retryConfig: RetryConfig;

  constructor(config: PerplexityConfig = {}) {
    this.config = {
      baseUrl: 'https://api.perplexity.ai',
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
      ...config
    };

    this.retryConfig = {
      maxRetries: this.config.maxRetries || 3,
      baseDelay: this.config.retryDelay || 1000,
      maxDelay: 10000,
      backoffMultiplier: 2
    };

    this.axiosInstance = axios.create({
      baseURL: this.config.baseUrl!,
      timeout: this.config.timeout!,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      }
    });

    // Add request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        logger.debug('Perplexity API request', {
          url: config.url,
          method: config.method,
          hasApiKey: !!this.config.apiKey
        });
        return config;
      },
      (error) => {
        logger.error('Perplexity API request error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.debug('Perplexity API response', {
          status: response.status,
          statusText: response.statusText,
          usage: response.data?.usage
        });
        return response;
      },
      (error) => {
        logger.error('Perplexity API response error', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message
        });
        return Promise.reject(error);
      }
    );

    logger.info('Perplexity client initialized', {
      baseUrl: this.config.baseUrl,
      maxRetries: this.retryConfig.maxRetries,
      timeout: this.config.timeout
    });
  }

  /**
   * Sets the API key
   */
  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
    this.axiosInstance.defaults.headers['Authorization'] = `Bearer ${apiKey}`;
    logger.debug('Perplexity API key updated');
  }

  /**
   * Searches for MCP servers using Perplexity API
   */
  async search(query: string): Promise<PerplexitySearchResult> {
    try {
      if (!this.config.apiKey) {
        throw new Error('Perplexity API key is required');
      }

      const request: PerplexityRequest = {
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'system',
            content: this.getSystemPrompt()
          },
          {
            role: 'user',
            content: query
          }
        ],
        max_tokens: 4000,
        temperature: 0.1,
        top_p: 0.9
      };

      const response = await this.executeWithRetry(request);
      
      if (!response.success) {
        return {
          success: false,
          error: response.error || 'Search failed'
        };
      }

      return {
        success: true,
        data: response.data,
        usage: response.usage
      };

    } catch (error) {
      logger.error('Perplexity search failed', {
        query,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed'
      };
    }
  }

  /**
   * Executes a request with retry logic
   */
  private async executeWithRetry(request: PerplexityRequest): Promise<{
    success: boolean;
    data?: string;
    usage?: any;
    error?: string;
  }> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        logger.debug('Perplexity API attempt', { attempt: attempt + 1, maxRetries: this.retryConfig.maxRetries + 1 });

        const response: AxiosResponse<PerplexityResponse> = await this.axiosInstance.post(
          '/chat/completions',
          request
        );

        if (response.status === 200 && response.data.choices?.[0]?.message?.content) {
      const content = response.data.choices[0].message.content;
      if (!content) {
        throw new Error('Empty response content');
      }
      return {
        success: true,
        data: content,
        usage: response.data.usage
      };
        } else {
          throw new Error(`Invalid response format: ${JSON.stringify(response.data)}`);
        }

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry on certain errors
        if (this.shouldNotRetry(error)) {
          logger.error('Non-retryable error encountered', { error: lastError.message });
          break;
        }

        // If this is the last attempt, don't wait
        if (attempt === this.retryConfig.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt),
          this.retryConfig.maxDelay
        );

        logger.warn('Perplexity API request failed, retrying', {
          attempt: attempt + 1,
          maxRetries: this.retryConfig.maxRetries + 1,
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
    // Don't retry on authentication errors
    if (error.response?.status === 401) {
      return true;
    }

    // Don't retry on permission errors
    if (error.response?.status === 403) {
      return true;
    }

    // Don't retry on bad request errors
    if (error.response?.status === 400) {
      return true;
    }

    // Don't retry on rate limit errors (let the rate limiter handle it)
    if (error.response?.status === 429) {
      return true;
    }

    return false;
  }

  /**
   * Gets the system prompt for MCP discovery
   */
  private getSystemPrompt(): string {
    return `You are an expert at finding and analyzing Model Context Protocol (MCP) servers. 

Your task is to help discover MCP servers that can be used for various development tasks. When searching for MCP servers, look for:

1. **NPM packages** - Look for packages with names like @modelcontextprotocol/server-* or mcp-*
2. **GitHub repositories** - Look for repositories containing MCP server implementations
3. **Documentation** - Look for setup instructions, configuration examples, and usage guides
4. **Required credentials** - Identify what API keys, tokens, or other credentials are needed

For each MCP server you find, provide:
- The name of the MCP server
- Repository URL (GitHub, GitLab, etc.)
- NPM package name (if available)
- Documentation URL
- Setup instructions
- Required credentials (API keys, tokens, etc.)

Format your response as a structured list with clear sections for each MCP server found. Be specific about installation commands, configuration requirements, and any prerequisites.

Focus on finding actual, working MCP servers that are actively maintained and have good documentation.`;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Tests the API connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.config.apiKey) {
        return { success: false, error: 'API key not set' };
      }

      const testRequest: PerplexityRequest = {
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [
          {
            role: 'user',
            content: 'Test connection'
          }
        ],
        max_tokens: 10
      };

      const response = await this.axiosInstance.post('/chat/completions', testRequest);
      
      if (response.status === 200) {
        return { success: true };
      } else {
        return { success: false, error: `Unexpected status: ${response.status}` };
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }

  /**
   * Gets API usage statistics
   */
  getUsageStats(): {
    totalRequests: number;
    totalTokens: number;
    averageTokensPerRequest: number;
  } {
    // This would track usage over time
    // For now, return placeholder data
    return {
      totalRequests: 0,
      totalTokens: 0,
      averageTokensPerRequest: 0
    };
  }
}

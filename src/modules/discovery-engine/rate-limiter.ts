/**
 * Rate Limiter
 * 
 * This module provides rate limiting functionality for API requests,
 * ensuring compliance with API rate limits and preventing abuse.
 */

import { createLogger } from '../../utils/logger.js';

const logger = createLogger('rate-limiter');

/**
 * Rate limiter configuration
 */
export interface RateLimiterConfig {
  requestsPerMinute: number;
  burstLimit?: number;
  windowSize?: number; // in milliseconds
  enableSlidingWindow?: boolean;
}

/**
 * Rate limit status
 */
export interface RateLimitStatus {
  remaining: number;
  resetTime: Date;
  totalRequests: number;
  windowStart: Date;
}

/**
 * Request tracking entry
 */
interface RequestEntry {
  timestamp: number;
  requestId: string;
}

/**
 * Rate limiter class
 */
export class RateLimiter {
  private config: RateLimiterConfig;
  private requests: RequestEntry[] = [];
  private totalRequests: number = 0;
  private responseTimes: number[] = [];
  private windowStart: number = Date.now();

  constructor(config: RateLimiterConfig) {
    this.config = {
      burstLimit: config.requestsPerMinute * 2,
      windowSize: 60 * 1000, // 1 minute
      enableSlidingWindow: true,
      ...config
    };

    logger.info('Rate limiter initialized', {
      requestsPerMinute: this.config.requestsPerMinute,
      burstLimit: this.config.burstLimit,
      windowSize: this.config.windowSize
    });
  }

  /**
   * Waits for an available slot before making a request
   */
  async waitForSlot(): Promise<void> {
    const now = Date.now();
    
    // Clean up old requests
    this.cleanupOldRequests(now);

    // Check if we're within rate limits
    const currentRequests = this.getCurrentRequestCount(now);
    
    if (currentRequests >= this.config.requestsPerMinute) {
      const waitTime = this.calculateWaitTime(now);
      logger.debug('Rate limit reached, waiting', { 
        currentRequests, 
        limit: this.config.requestsPerMinute,
        waitTime 
      });
      
      await this.sleep(waitTime);
    }

    // Record the request
    this.recordRequest(now);
  }

  /**
   * Records a request for rate limiting
   */
  recordRequest(timestamp: number = Date.now()): void {
    const requestId = this.generateRequestId();
    this.requests.push({ timestamp, requestId });
    this.totalRequests++;
    
    logger.debug('Request recorded', { 
      requestId, 
      totalRequests: this.totalRequests,
      currentWindowRequests: this.getCurrentRequestCount(timestamp)
    });
  }

  /**
   * Records response time for statistics
   */
  recordResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime);
    
    // Keep only last 100 response times for memory efficiency
    if (this.responseTimes.length > 100) {
      this.responseTimes = this.responseTimes.slice(-100);
    }
  }

  /**
   * Gets current rate limit status
   */
  getStatus(): RateLimitStatus {
    const now = Date.now();
    const currentRequests = this.getCurrentRequestCount(now);
    const remaining = Math.max(0, this.config.requestsPerMinute - currentRequests);
    const resetTime = new Date(this.windowStart + this.config.windowSize!);

    return {
      remaining,
      resetTime,
      totalRequests: this.totalRequests,
      windowStart: new Date(this.windowStart)
    };
  }

  /**
   * Gets total number of requests made
   */
  getTotalRequests(): number {
    return this.totalRequests;
  }

  /**
   * Gets average response time
   */
  getAverageResponseTime(): number {
    if (this.responseTimes.length === 0) {
      return 0;
    }
    
    return this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
  }

  /**
   * Checks if a request can be made immediately
   */
  canMakeRequest(): boolean {
    const now = Date.now();
    this.cleanupOldRequests(now);
    const currentRequests = this.getCurrentRequestCount(now);
    
    return currentRequests < this.config.requestsPerMinute;
  }

  /**
   * Gets the number of requests in the current window
   */
  private getCurrentRequestCount(now: number): number {
    if (!this.config.enableSlidingWindow) {
      // Fixed window approach
      const windowStart = Math.floor(now / this.config.windowSize!) * this.config.windowSize!;
      return this.requests.filter(req => req.timestamp >= windowStart).length;
    } else {
      // Sliding window approach
      const windowStart = now - this.config.windowSize!;
      return this.requests.filter(req => req.timestamp >= windowStart).length;
    }
  }

  /**
   * Calculates how long to wait before the next request
   */
  private calculateWaitTime(now: number): number {
    if (!this.config.enableSlidingWindow) {
      // Fixed window: wait until next window
      const currentWindow = Math.floor(now / this.config.windowSize!);
      const nextWindowStart = (currentWindow + 1) * this.config.windowSize!;
      return nextWindowStart - now;
    } else {
      // Sliding window: wait until oldest request expires
      const windowStart = now - this.config.windowSize!;
      const oldestRequest = this.requests.find(req => req.timestamp >= windowStart);
      
      if (oldestRequest) {
        return oldestRequest.timestamp + this.config.windowSize! - now;
      }
      
      return 0;
    }
  }

  /**
   * Cleans up old requests outside the current window
   */
  private cleanupOldRequests(now: number): void {
    const cutoffTime = now - this.config.windowSize!;
    this.requests = this.requests.filter(req => req.timestamp > cutoffTime);
  }

  /**
   * Generates a unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Resets the rate limiter
   */
  reset(): void {
    this.requests = [];
    this.totalRequests = 0;
    this.responseTimes = [];
    this.windowStart = Date.now();
    
    logger.info('Rate limiter reset');
  }

  /**
   * Updates the rate limit configuration
   */
  updateConfig(newConfig: Partial<RateLimiterConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    logger.info('Rate limiter configuration updated', { config: this.config });
  }

  /**
   * Gets detailed statistics
   */
  getDetailedStats(): {
    config: RateLimiterConfig;
    currentStatus: RateLimitStatus;
    averageResponseTime: number;
    requestHistory: RequestEntry[];
    responseTimeHistory: number[];
  } {
    return {
      config: this.config,
      currentStatus: this.getStatus(),
      averageResponseTime: this.getAverageResponseTime(),
      requestHistory: [...this.requests],
      responseTimeHistory: [...this.responseTimes]
    };
  }
}

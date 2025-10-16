/**
 * Adaptive Learning System for Confidence Scoring
 * 
 * This module provides machine learning capabilities to improve confidence scoring
 * based on user feedback, usage patterns, and success rates.
 */

import { createLogger } from '../../utils/logger.js';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

const logger = createLogger('adaptive-learning');

/**
 * User feedback data
 */
export interface UserFeedback {
  mcpId: string;
  mcpName: string;
  originalQuery: string;
  predictedScore: number;
  actualScore: number; // User's rating (0-1)
  success: boolean;
  usageDuration: number; // in minutes
  errorType?: string;
  feedback: string;
  timestamp: Date;
}

/**
 * Learning metrics
 */
export interface LearningMetrics {
  totalFeedback: number;
  accuracy: number;
  bias: number;
  variance: number;
  improvementRate: number;
  lastUpdated: Date;
}

/**
 * Weight adjustment data
 */
export interface WeightAdjustment {
  factor: string;
  currentWeight: number;
  suggestedWeight: number;
  confidence: number;
  reason: string;
}

/**
 * Learning configuration
 */
export interface LearningConfig {
  enableLearning: boolean;
  learningRate: number;
  minSamples: number;
  updateInterval: number; // in hours
  storagePath: string;
  enableBiasCorrection: boolean;
  enableVarianceReduction: boolean;
}

/**
 * Default learning configuration
 */
const DEFAULT_LEARNING_CONFIG: LearningConfig = {
  enableLearning: true,
  learningRate: 0.01,
  minSamples: 10,
  updateInterval: 24,
  storagePath: join(homedir(), '.mcp-hub', 'learning-data.json'),
  enableBiasCorrection: true,
  enableVarianceReduction: true
};

/**
 * Adaptive Learning System
 */
export class AdaptiveLearningSystem {
  private config: LearningConfig;
  private feedbackData: UserFeedback[] = [];
  private learningMetrics: LearningMetrics | null = null;
  private lastUpdate: number = 0;

  constructor(config: Partial<LearningConfig> = {}) {
    this.config = { ...DEFAULT_LEARNING_CONFIG, ...config };
    logger.info('Adaptive learning system initialized', { config: this.config });
  }

  /**
   * Initialize the learning system
   */
  async initialize(): Promise<void> {
    try {
      await this.ensureStorageDirectory();
      await this.loadFeedbackData();
      await this.calculateLearningMetrics();
      logger.info('Adaptive learning system initialized', {
        feedbackCount: this.feedbackData.length,
        metrics: this.learningMetrics
      });
    } catch (error) {
      logger.error('Failed to initialize adaptive learning system:', error);
      throw error;
    }
  }

  /**
   * Record user feedback
   */
  async recordFeedback(feedback: Omit<UserFeedback, 'timestamp'>): Promise<void> {
    if (!this.config.enableLearning) return;

    const fullFeedback: UserFeedback = {
      ...feedback,
      timestamp: new Date()
    };

    this.feedbackData.push(fullFeedback);
    await this.saveFeedbackData();
    
    // Update learning metrics
    await this.calculateLearningMetrics();
    
    // Check if we should update weights
    if (this.shouldUpdateWeights()) {
      await this.updateWeights();
    }

    logger.info('Recorded user feedback', {
      mcpId: feedback.mcpId,
      predictedScore: feedback.predictedScore,
      actualScore: feedback.actualScore,
      success: feedback.success
    });
  }

  /**
   * Get weight adjustments based on learning
   */
  async getWeightAdjustments(): Promise<WeightAdjustment[]> {
    if (!this.learningMetrics || this.feedbackData.length < this.config.minSamples) {
      return [];
    }

    const adjustments: WeightAdjustment[] = [];

    // Analyze bias in different factors
    const factorBias = this.analyzeFactorBias();
    
    for (const [factor, bias] of Object.entries(factorBias)) {
      if (Math.abs(bias) > 0.1) { // Significant bias
        const currentWeight = this.getCurrentWeight(factor);
        const suggestedWeight = this.calculateSuggestedWeight(factor, bias);
        
        adjustments.push({
          factor,
          currentWeight,
          suggestedWeight,
          confidence: this.calculateConfidence(factor),
          reason: this.generateAdjustmentReason(factor, bias)
        });
      }
    }

    return adjustments;
  }

  /**
   * Apply weight adjustments
   */
  async applyWeightAdjustments(adjustments: WeightAdjustment[]): Promise<void> {
    if (!this.config.enableLearning) return;

    for (const adjustment of adjustments) {
      if (adjustment.confidence > 0.7) { // High confidence adjustments only
        await this.updateWeight(adjustment.factor, adjustment.suggestedWeight);
        logger.info('Applied weight adjustment', {
          factor: adjustment.factor,
          oldWeight: adjustment.currentWeight,
          newWeight: adjustment.suggestedWeight,
          reason: adjustment.reason
        });
      }
    }

    this.lastUpdate = Date.now();
  }

  /**
   * Get learning statistics
   */
  getLearningStats(): {
    totalFeedback: number;
    accuracy: number;
    bias: number;
    variance: number;
    improvementRate: number;
    recentAccuracy: number;
    factorPerformance: Record<string, number>;
  } {
    if (!this.learningMetrics) {
      return {
        totalFeedback: 0,
        accuracy: 0,
        bias: 0,
        variance: 0,
        improvementRate: 0,
        recentAccuracy: 0,
        factorPerformance: {}
      };
    }

    const recentFeedback = this.feedbackData.filter(
      f => Date.now() - f.timestamp.getTime() < 7 * 24 * 60 * 60 * 1000 // Last 7 days
    );

    const recentAccuracy = recentFeedback.length > 0
      ? recentFeedback.reduce((sum, f) => sum + (f.success ? 1 : 0), 0) / recentFeedback.length
      : 0;

    const factorPerformance = this.calculateFactorPerformance();

    return {
      totalFeedback: this.learningMetrics.totalFeedback,
      accuracy: this.learningMetrics.accuracy,
      bias: this.learningMetrics.bias,
      variance: this.learningMetrics.variance,
      improvementRate: this.learningMetrics.improvementRate,
      recentAccuracy,
      factorPerformance
    };
  }

  /**
   * Predict success probability for a given MCP
   */
  async predictSuccess(
    mcpId: string,
    mcpName: string,
    predictedScore: number,
    query: string
  ): Promise<{
    successProbability: number;
    confidence: number;
    factors: Record<string, number>;
  }> {
    if (this.feedbackData.length < this.config.minSamples) {
      return {
        successProbability: predictedScore,
        confidence: 0.5,
        factors: {}
      };
    }

    // Find similar MCPs based on name and query
    const similarFeedback = this.findSimilarFeedback(mcpName, query);
    
    if (similarFeedback.length === 0) {
      return {
        successProbability: predictedScore,
        confidence: 0.5,
        factors: {}
      };
    }

    // Calculate success probability based on similar cases
    const successRate = similarFeedback.reduce((sum, f) => sum + (f.success ? 1 : 0), 0) / similarFeedback.length;
    const confidence = Math.min(similarFeedback.length / 10, 1); // More samples = higher confidence

    // Analyze factors that contribute to success
    const factors = this.analyzeSuccessFactors(similarFeedback);

    return {
      successProbability: successRate,
      confidence,
      factors
    };
  }

  /**
   * Analyze factor bias
   */
  private analyzeFactorBias(): Record<string, number> {
    const factorBias: Record<string, number> = {};
    const factors = [
      'repositoryHealth', 'documentationQuality', 'communityAdoption',
      'maintenanceStatus', 'technicalQuality', 'securityScore', 'performanceScore'
    ];

    for (const factor of factors) {
      const factorFeedback = this.feedbackData.filter(f => f.feedback.includes(factor));
      if (factorFeedback.length > 0) {
        const bias = factorFeedback.reduce((sum, f) => {
          return sum + (f.actualScore - f.predictedScore);
        }, 0) / factorFeedback.length;
        factorBias[factor] = bias;
      }
    }

    return factorBias;
  }

  /**
   * Calculate learning metrics
   */
  private async calculateLearningMetrics(): Promise<void> {
    if (this.feedbackData.length === 0) {
      this.learningMetrics = null;
      return;
    }

    const totalFeedback = this.feedbackData.length;
    const accuracy = this.feedbackData.reduce((sum, f) => sum + (f.success ? 1 : 0), 0) / totalFeedback;
    
    // Calculate bias (average difference between predicted and actual)
    const bias = this.feedbackData.reduce((sum, f) => {
      return sum + (f.actualScore - f.predictedScore);
    }, 0) / totalFeedback;

    // Calculate variance
    const variance = this.feedbackData.reduce((sum, f) => {
      const diff = f.actualScore - f.predictedScore;
      return sum + (diff - bias) * (diff - bias);
    }, 0) / totalFeedback;

    // Calculate improvement rate (comparing recent vs older feedback)
    const recentFeedback = this.feedbackData.slice(-Math.floor(totalFeedback / 2));
    const olderFeedback = this.feedbackData.slice(0, Math.floor(totalFeedback / 2));
    
    const recentAccuracy = recentFeedback.length > 0
      ? recentFeedback.reduce((sum, f) => sum + (f.success ? 1 : 0), 0) / recentFeedback.length
      : 0;
    const olderAccuracy = olderFeedback.length > 0
      ? olderFeedback.reduce((sum, f) => sum + (f.success ? 1 : 0), 0) / olderFeedback.length
      : 0;
    
    const improvementRate = olderAccuracy > 0 ? (recentAccuracy - olderAccuracy) / olderAccuracy : 0;

    this.learningMetrics = {
      totalFeedback,
      accuracy,
      bias,
      variance,
      improvementRate,
      lastUpdated: new Date()
    };
  }

  /**
   * Check if weights should be updated
   */
  private shouldUpdateWeights(): boolean {
    const now = Date.now();
    const timeSinceUpdate = now - this.lastUpdate;
    const updateIntervalMs = this.config.updateInterval * 60 * 60 * 1000;
    
    return timeSinceUpdate > updateIntervalMs && 
           this.feedbackData.length >= this.config.minSamples;
  }

  /**
   * Update weights based on learning
   */
  private async updateWeights(): Promise<void> {
    const adjustments = await this.getWeightAdjustments();
    await this.applyWeightAdjustments(adjustments);
  }

  /**
   * Find similar feedback based on MCP name and query
   */
  private findSimilarFeedback(mcpName: string, query: string): UserFeedback[] {
    return this.feedbackData.filter(f => {
      const nameSimilarity = this.calculateStringSimilarity(f.mcpName, mcpName);
      const querySimilarity = this.calculateStringSimilarity(f.originalQuery, query);
      
      return nameSimilarity > 0.3 || querySimilarity > 0.3;
    });
  }

  /**
   * Calculate string similarity (simple Jaccard similarity)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Analyze success factors
   */
  private analyzeSuccessFactors(feedback: UserFeedback[]): Record<string, number> {
    const factors: Record<string, number> = {};
    const successFeedback = feedback.filter(f => f.success);
    
    if (successFeedback.length === 0) return factors;

    // Analyze which factors correlate with success
    const factorNames = [
      'repositoryHealth', 'documentationQuality', 'communityAdoption',
      'maintenanceStatus', 'technicalQuality', 'securityScore', 'performanceScore'
    ];

    for (const factor of factorNames) {
      const factorFeedback = successFeedback.filter(f => f.feedback.includes(factor));
      if (factorFeedback.length > 0) {
        factors[factor] = factorFeedback.reduce((sum, f) => sum + f.actualScore, 0) / factorFeedback.length;
      }
    }

    return factors;
  }

  /**
   * Calculate factor performance
   */
  private calculateFactorPerformance(): Record<string, number> {
    const factorPerformance: Record<string, number> = {};
    const factors = [
      'repositoryHealth', 'documentationQuality', 'communityAdoption',
      'maintenanceStatus', 'technicalQuality', 'securityScore', 'performanceScore'
    ];

    for (const factor of factors) {
      const factorFeedback = this.feedbackData.filter(f => f.feedback.includes(factor));
      if (factorFeedback.length > 0) {
        const successRate = factorFeedback.reduce((sum, f) => sum + (f.success ? 1 : 0), 0) / factorFeedback.length;
        factorPerformance[factor] = successRate;
      }
    }

    return factorPerformance;
  }

  /**
   * Get current weight for a factor
   */
  private getCurrentWeight(factor: string): number {
    // This would integrate with the confidence scorer's weight configuration
    const defaultWeights: Record<string, number> = {
      repositoryHealth: 0.12,
      documentationQuality: 0.10,
      communityAdoption: 0.12,
      maintenanceStatus: 0.10,
      technicalQuality: 0.08,
      securityScore: 0.08,
      performanceScore: 0.05
    };
    
    return defaultWeights[factor] || 0.1;
  }

  /**
   * Calculate suggested weight based on bias
   */
  private calculateSuggestedWeight(factor: string, bias: number): number {
    const currentWeight = this.getCurrentWeight(factor);
    const adjustment = bias * this.config.learningRate;
    return Math.max(0.01, Math.min(0.3, currentWeight + adjustment));
  }

  /**
   * Calculate confidence in weight adjustment
   */
  private calculateConfidence(factor: string): number {
    const factorFeedback = this.feedbackData.filter(f => f.feedback.includes(factor));
    if (factorFeedback.length < 5) return 0.3; // Low confidence with few samples
    
    return Math.min(factorFeedback.length / 20, 1); // More samples = higher confidence
  }

  /**
   * Generate adjustment reason
   */
  private generateAdjustmentReason(factor: string, bias: number): string {
    if (bias > 0.1) {
      return `Factor ${factor} is consistently over-weighted. Consider reducing its influence.`;
    } else if (bias < -0.1) {
      return `Factor ${factor} is consistently under-weighted. Consider increasing its influence.`;
    }
    return `Factor ${factor} shows moderate bias and may need adjustment.`;
  }

  /**
   * Update weight for a factor
   */
  private async updateWeight(factor: string, newWeight: number): Promise<void> {
    // This would integrate with the confidence scorer to update its configuration
    logger.info(`Weight updated for ${factor}: ${newWeight}`);
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDirectory(): Promise<void> {
    const dir = dirname(this.config.storagePath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create storage directory:', error);
      throw error;
    }
  }

  /**
   * Load feedback data from storage
   */
  private async loadFeedbackData(): Promise<void> {
    try {
      const data = await fs.readFile(this.config.storagePath, 'utf-8');
      const parsed = JSON.parse(data);
      this.feedbackData = parsed.map((f: any) => ({
        ...f,
        timestamp: new Date(f.timestamp)
      }));
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        logger.info('No existing feedback data found, starting fresh');
        this.feedbackData = [];
      } else {
        throw error;
      }
    }
  }

  /**
   * Save feedback data to storage
   */
  private async saveFeedbackData(): Promise<void> {
    const data = JSON.stringify(this.feedbackData, null, 2);
    await fs.writeFile(this.config.storagePath, data, 'utf-8');
  }
}

/**
 * Create a default adaptive learning system
 */
export function createAdaptiveLearningSystem(config?: Partial<LearningConfig>): AdaptiveLearningSystem {
  return new AdaptiveLearningSystem(config);
}

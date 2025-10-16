/**
 * Confidence Scoring Algorithm
 * 
 * This module provides sophisticated confidence scoring for MCP discovery results,
 * evaluating multiple factors to determine the reliability and quality of each result.
 */

import { createLogger } from '../../utils/logger';
import type { MCPDiscoveryResult } from '../../types/mcp';

const logger = createLogger('confidence-scorer');

/**
 * Confidence scoring factors
 */
export interface ConfidenceFactors {
  // Content quality factors
  hasRepositoryUrl: boolean;
  hasNpmPackage: boolean;
  hasDocumentationUrl: boolean;
  hasSetupInstructions: boolean;
  hasRequiredCredentials: boolean;
  
  // URL reliability factors
  repositoryUrlReliability: number;
  documentationUrlReliability: number;
  
  // Content completeness factors
  setupInstructionsQuality: number;
  credentialInformationQuality: number;
  
  // Source credibility factors
  sourceCredibility: number;
  contentConsistency: number;
  
  // Technical factors
  packageNameValidity: number;
  repositoryStructure: number;
  
  // Context relevance factors
  queryRelevance: number;
  categoryMatch: number;
}

/**
 * Confidence scoring configuration
 */
export interface ConfidenceConfig {
  weights: {
    contentQuality: number;
    urlReliability: number;
    contentCompleteness: number;
    sourceCredibility: number;
    technicalValidity: number;
    contextRelevance: number;
  };
  thresholds: {
    minimumScore: number;
    highConfidenceScore: number;
    excellentScore: number;
  };
  enableAdvancedScoring: boolean;
}

/**
 * URL reliability patterns
 */
const URL_RELIABILITY_PATTERNS = {
  high: [
    /github\.com\/modelcontextprotocol/,
    /github\.com\/anthropics/,
    /github\.com\/openai/,
    /npmjs\.com\/package\/@modelcontextprotocol/,
    /docs\.anthropic\.com/,
    /platform\.openai\.com/
  ],
  medium: [
    /github\.com\/[^\/]+\/[^\/]+/,
    /gitlab\.com\/[^\/]+\/[^\/]+/,
    /npmjs\.com\/package\/[^\/]+/,
    /docs\.[^\/]+\.com/,
    /readme\.md/i
  ],
  low: [
    /bitbucket\.org/,
    /sourceforge\.net/,
    /code\.google\.com/,
    /personal\.github\.io/
  ]
};

/**
 * Package name validation patterns
 */
const PACKAGE_VALIDATION_PATTERNS = {
  excellent: [
    /^@modelcontextprotocol\/server-[a-z0-9\-]+$/,
    /^mcp-[a-z0-9\-]+$/,
    /^@[a-z0-9\-]+\/mcp-[a-z0-9\-]+$/
  ],
  good: [
    /^[a-z0-9\-]+-mcp$/,
    /^mcp[a-z0-9\-]+$/,
    /^@[a-z0-9\-]+\/[a-z0-9\-]+$/
  ],
  fair: [
    /^[a-z0-9\-]+$/,
    /^@[a-z0-9\-]+\/[a-z0-9\-]+$/
  ]
};

/**
 * Setup instruction quality indicators
 */
const SETUP_QUALITY_INDICATORS = {
  excellent: [
    'npm install',
    'pip install',
    'yarn add',
    'pnpm add',
    'docker pull',
    'go get',
    'configuration',
    'environment variables',
    'setup guide',
    'installation guide'
  ],
  good: [
    'install',
    'setup',
    'configure',
    'initialize',
    'start',
    'run',
    'usage',
    'example'
  ],
  fair: [
    'clone',
    'download',
    'get',
    'use'
  ]
};

/**
 * Credential information quality indicators
 */
const CREDENTIAL_QUALITY_INDICATORS = {
  excellent: [
    'api key',
    'access token',
    'bearer token',
    'client secret',
    'environment variable',
    'configuration file',
    'credentials',
    'authentication'
  ],
  good: [
    'key',
    'token',
    'secret',
    'password',
    'username',
    'email',
    'url',
    'endpoint'
  ],
  fair: [
    'auth',
    'login',
    'user',
    'pass'
  ]
};

/**
 * Confidence scorer class
 */
export class ConfidenceScorer {
  private config: ConfidenceConfig;

  constructor(config: Partial<ConfidenceConfig> = {}) {
    this.config = {
      weights: {
        contentQuality: 0.25,
        urlReliability: 0.20,
        contentCompleteness: 0.20,
        sourceCredibility: 0.15,
        technicalValidity: 0.10,
        contextRelevance: 0.10
      },
      thresholds: {
        minimumScore: 0.3,
        highConfidenceScore: 0.7,
        excellentScore: 0.9
      },
      enableAdvancedScoring: true,
      ...config
    };

    logger.info('Confidence scorer initialized', { config: this.config });
  }

  /**
   * Scores a list of MCP discovery results
   */
  async scoreResults(
    results: MCPDiscoveryResult[], 
    originalQuery: string
  ): Promise<MCPDiscoveryResult[]> {
    try {
      logger.debug('Scoring MCP discovery results', { 
        resultCount: results.length,
        query: originalQuery.substring(0, 100) + '...'
      });

      const scoredResults = await Promise.all(
        results.map(result => this.scoreResult(result, originalQuery))
      );

      // Sort by confidence score (highest first)
      const sortedResults = scoredResults.sort((a, b) => b.confidence_score - a.confidence_score);

      logger.info('Confidence scoring completed', {
        totalResults: results.length,
        highConfidenceResults: sortedResults.filter(r => r.confidence_score >= this.config.thresholds.highConfidenceScore).length,
        averageScore: sortedResults.reduce((sum, r) => sum + r.confidence_score, 0) / sortedResults.length
      });

      return sortedResults;

    } catch (error) {
      logger.error('Failed to score results', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return results; // Return original results if scoring fails
    }
  }

  /**
   * Scores a single MCP discovery result
   */
  private async scoreResult(
    result: MCPDiscoveryResult, 
    originalQuery: string
  ): Promise<MCPDiscoveryResult> {
    try {
      const factors = this.analyzeConfidenceFactors(result, originalQuery);
      const confidenceScore = this.calculateConfidenceScore(factors);

      return {
        ...result,
        confidence_score: confidenceScore
      };

    } catch (error) {
      logger.debug('Failed to score individual result', {
        mcpName: result.mcp_name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Return with minimum confidence score
      return {
        ...result,
        confidence_score: this.config.thresholds.minimumScore
      };
    }
  }

  /**
   * Analyzes confidence factors for a result
   */
  private analyzeConfidenceFactors(
    result: MCPDiscoveryResult, 
    originalQuery: string
  ): ConfidenceFactors {
    return {
      // Content quality factors
      hasRepositoryUrl: !!result.repository_url,
      hasNpmPackage: !!result.npm_package,
      hasDocumentationUrl: !!result.documentation_url,
      hasSetupInstructions: result.setup_instructions.length > 0,
      hasRequiredCredentials: result.required_credentials.length > 0,
      
      // URL reliability factors
      repositoryUrlReliability: this.scoreUrlReliability(result.repository_url),
      documentationUrlReliability: this.scoreUrlReliability(result.documentation_url),
      
      // Content completeness factors
      setupInstructionsQuality: this.scoreSetupInstructionsQuality(result.setup_instructions),
      credentialInformationQuality: this.scoreCredentialInformationQuality(result.required_credentials),
      
      // Source credibility factors
      sourceCredibility: this.scoreSourceCredibility(result),
      contentConsistency: this.scoreContentConsistency(result),
      
      // Technical factors
      packageNameValidity: this.scorePackageNameValidity(result.npm_package),
      repositoryStructure: this.scoreRepositoryStructure(result.repository_url),
      
      // Context relevance factors
      queryRelevance: this.scoreQueryRelevance(result, originalQuery),
      categoryMatch: this.scoreCategoryMatch(result, originalQuery)
    };
  }

  /**
   * Calculates overall confidence score from factors
   */
  private calculateConfidenceScore(factors: ConfidenceFactors): number {
    const { weights } = this.config;

    // Content quality score
    const contentQualityScore = (
      (factors.hasRepositoryUrl ? 0.2 : 0) +
      (factors.hasNpmPackage ? 0.2 : 0) +
      (factors.hasDocumentationUrl ? 0.2 : 0) +
      (factors.hasSetupInstructions ? 0.2 : 0) +
      (factors.hasRequiredCredentials ? 0.2 : 0)
    );

    // URL reliability score
    const urlReliabilityScore = (
      factors.repositoryUrlReliability * 0.6 +
      factors.documentationUrlReliability * 0.4
    );

    // Content completeness score
    const contentCompletenessScore = (
      factors.setupInstructionsQuality * 0.6 +
      factors.credentialInformationQuality * 0.4
    );

    // Source credibility score
    const sourceCredibilityScore = (
      factors.sourceCredibility * 0.7 +
      factors.contentConsistency * 0.3
    );

    // Technical validity score
    const technicalValidityScore = (
      factors.packageNameValidity * 0.6 +
      factors.repositoryStructure * 0.4
    );

    // Context relevance score
    const contextRelevanceScore = (
      factors.queryRelevance * 0.7 +
      factors.categoryMatch * 0.3
    );

    // Calculate weighted total
    const totalScore = (
      contentQualityScore * weights.contentQuality +
      urlReliabilityScore * weights.urlReliability +
      contentCompletenessScore * weights.contentCompleteness +
      sourceCredibilityScore * weights.sourceCredibility +
      technicalValidityScore * weights.technicalValidity +
      contextRelevanceScore * weights.contextRelevance
    );

    return Math.min(Math.max(totalScore, 0), 1);
  }

  /**
   * Scores URL reliability based on domain and patterns
   */
  private scoreUrlReliability(url?: string): number {
    if (!url) return 0;

    const lowerUrl = url.toLowerCase();

    // Check high reliability patterns
    for (const pattern of URL_RELIABILITY_PATTERNS.high) {
      if (pattern.test(lowerUrl)) {
        return 1.0;
      }
    }

    // Check medium reliability patterns
    for (const pattern of URL_RELIABILITY_PATTERNS.medium) {
      if (pattern.test(lowerUrl)) {
        return 0.7;
      }
    }

    // Check low reliability patterns
    for (const pattern of URL_RELIABILITY_PATTERNS.low) {
      if (pattern.test(lowerUrl)) {
        return 0.3;
      }
    }

    // Default score for unknown URLs
    return 0.5;
  }

  /**
   * Scores setup instructions quality
   */
  private scoreSetupInstructionsQuality(instructions: string): number {
    if (!instructions) return 0;

    const lowerInstructions = instructions.toLowerCase();
    let score = 0;

    // Check for excellent indicators
    for (const indicator of SETUP_QUALITY_INDICATORS.excellent) {
      if (lowerInstructions.includes(indicator)) {
        score += 0.3;
      }
    }

    // Check for good indicators
    for (const indicator of SETUP_QUALITY_INDICATORS.good) {
      if (lowerInstructions.includes(indicator)) {
        score += 0.2;
      }
    }

    // Check for fair indicators
    for (const indicator of SETUP_QUALITY_INDICATORS.fair) {
      if (lowerInstructions.includes(indicator)) {
        score += 0.1;
      }
    }

    // Bonus for length and detail
    if (instructions.length > 100) score += 0.1;
    if (instructions.includes('\n')) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Scores credential information quality
   */
  private scoreCredentialInformationQuality(credentials: string[]): number {
    if (credentials.length === 0) return 0;

    let score = 0;
    const allCredentials = credentials.join(' ').toLowerCase();

    // Check for excellent indicators
    for (const indicator of CREDENTIAL_QUALITY_INDICATORS.excellent) {
      if (allCredentials.includes(indicator)) {
        score += 0.3;
      }
    }

    // Check for good indicators
    for (const indicator of CREDENTIAL_QUALITY_INDICATORS.good) {
      if (allCredentials.includes(indicator)) {
        score += 0.2;
      }
    }

    // Check for fair indicators
    for (const indicator of CREDENTIAL_QUALITY_INDICATORS.fair) {
      if (allCredentials.includes(indicator)) {
        score += 0.1;
      }
    }

    // Bonus for having multiple credential types
    if (credentials.length > 1) score += 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Scores source credibility
   */
  private scoreSourceCredibility(result: MCPDiscoveryResult): number {
    let score = 0.5; // Base score

    // Check repository URL credibility
    if (result.repository_url) {
      const repoScore = this.scoreUrlReliability(result.repository_url);
      score += repoScore * 0.3;
    }

    // Check documentation URL credibility
    if (result.documentation_url) {
      const docScore = this.scoreUrlReliability(result.documentation_url);
      score += docScore * 0.2;
    }

    // Check for official MCP packages
    if (result.npm_package?.startsWith('@modelcontextprotocol/')) {
      score += 0.3;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Scores content consistency
   */
  private scoreContentConsistency(result: MCPDiscoveryResult): number {
    let score = 0;

    // Check if package name matches repository
    if (result.npm_package && result.repository_url) {
      const packageName = result.npm_package.replace('@modelcontextprotocol/server-', '');
      if (result.repository_url.toLowerCase().includes(packageName.toLowerCase())) {
        score += 0.3;
      }
    }

    // Check if setup instructions mention the package
    if (result.npm_package && result.setup_instructions) {
      if (result.setup_instructions.toLowerCase().includes(result.npm_package.toLowerCase())) {
        score += 0.3;
      }
    }

    // Check if documentation URL is consistent
    if (result.documentation_url && result.repository_url) {
      if (result.documentation_url.includes(result.repository_url) || 
          result.repository_url.includes(result.documentation_url)) {
        score += 0.2;
      }
    }

    // Check if credentials are mentioned in setup instructions
    if (result.required_credentials.length > 0 && result.setup_instructions) {
      const setupLower = result.setup_instructions.toLowerCase();
      const credentialMentioned = result.required_credentials.some(cred => 
        setupLower.includes(cred.toLowerCase())
      );
      if (credentialMentioned) {
        score += 0.2;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Scores package name validity
   */
  private scorePackageNameValidity(packageName?: string): number {
    if (!packageName) return 0;

    // Check for excellent patterns
    for (const pattern of PACKAGE_VALIDATION_PATTERNS.excellent) {
      if (pattern.test(packageName)) {
        return 1.0;
      }
    }

    // Check for good patterns
    for (const pattern of PACKAGE_VALIDATION_PATTERNS.good) {
      if (pattern.test(packageName)) {
        return 0.7;
      }
    }

    // Check for fair patterns
    for (const pattern of PACKAGE_VALIDATION_PATTERNS.fair) {
      if (pattern.test(packageName)) {
        return 0.4;
      }
    }

    return 0.1; // Very low score for unrecognized patterns
  }

  /**
   * Scores repository structure
   */
  private scoreRepositoryStructure(repositoryUrl?: string): number {
    if (!repositoryUrl) return 0;

    // This would ideally check the actual repository structure
    // For now, we'll use heuristics based on URL patterns
    let score = 0.5;

    // GitHub repositories tend to be more structured
    if (repositoryUrl.includes('github.com')) {
      score += 0.2;
    }

    // Official MCP repositories
    if (repositoryUrl.includes('modelcontextprotocol')) {
      score += 0.3;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Scores query relevance
   */
  private scoreQueryRelevance(result: MCPDiscoveryResult, query: string): number {
    const queryLower = query.toLowerCase();
    const resultText = `${result.mcp_name} ${result.setup_instructions}`.toLowerCase();
    
    let score = 0;

    // Check for exact matches
    const queryWords = queryLower.split(/\s+/);
    for (const word of queryWords) {
      if (word.length > 2 && resultText.includes(word)) {
        score += 0.1;
      }
    }

    // Check for MCP-related terms
    const mcpTerms = ['mcp', 'model context protocol', 'server', 'tool'];
    for (const term of mcpTerms) {
      if (queryLower.includes(term) && resultText.includes(term)) {
        score += 0.2;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Scores category match
   */
  private scoreCategoryMatch(result: MCPDiscoveryResult, query: string): number {
    const queryLower = query.toLowerCase();
    const resultText = `${result.mcp_name} ${result.setup_instructions}`.toLowerCase();
    
    // Common MCP categories
    const categories = [
      'filesystem', 'file', 'files',
      'database', 'db', 'sql',
      'git', 'version control',
      'api', 'http', 'rest',
      'web', 'scraping', 'crawling',
      'docker', 'container',
      'aws', 'cloud',
      'slack', 'discord', 'chat',
      'github', 'gitlab', 'bitbucket'
    ];

    let score = 0;
    for (const category of categories) {
      if (queryLower.includes(category) && resultText.includes(category)) {
        score += 0.2;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Gets confidence level description
   */
  getConfidenceLevel(score: number): 'low' | 'medium' | 'high' | 'excellent' {
    if (score >= this.config.thresholds.excellentScore) {
      return 'excellent';
    } else if (score >= this.config.thresholds.highConfidenceScore) {
      return 'high';
    } else if (score >= this.config.thresholds.minimumScore) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Gets scoring statistics
   */
  getScoringStats(results: MCPDiscoveryResult[]): {
    totalResults: number;
    averageScore: number;
    scoreDistribution: Record<string, number>;
    confidenceLevels: Record<string, number>;
  } {
    const totalResults = results.length;
    const averageScore = results.reduce((sum, r) => sum + r.confidence_score, 0) / totalResults;
    
    const scoreDistribution = {
      '0.0-0.2': 0,
      '0.2-0.4': 0,
      '0.4-0.6': 0,
      '0.6-0.8': 0,
      '0.8-1.0': 0
    };

    const confidenceLevels = {
      low: 0,
      medium: 0,
      high: 0,
      excellent: 0
    };

    for (const result of results) {
      const score = result.confidence_score;
      const level = this.getConfidenceLevel(score);

      // Update score distribution
      if (score < 0.2) scoreDistribution['0.0-0.2']++;
      else if (score < 0.4) scoreDistribution['0.2-0.4']++;
      else if (score < 0.6) scoreDistribution['0.4-0.6']++;
      else if (score < 0.8) scoreDistribution['0.6-0.8']++;
      else scoreDistribution['0.8-1.0']++;

      // Update confidence levels
      confidenceLevels[level]++;
    }

    return {
      totalResults,
      averageScore,
      scoreDistribution,
      confidenceLevels
    };
  }
}

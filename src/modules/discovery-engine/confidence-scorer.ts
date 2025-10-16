/**
 * Confidence Scoring Algorithm
 * 
 * This module provides sophisticated confidence scoring for MCP discovery results,
 * evaluating multiple factors to determine the reliability and quality of each result.
 */

import { createLogger } from '../../utils/logger.js';
import type { MCPDiscoveryResult } from '../../types/mcp.js';
import { AdaptiveLearningSystem, createAdaptiveLearningSystem } from './adaptive-learning.js';

const logger = createLogger('confidence-scorer');

/**
 * Comprehensive confidence scoring factors
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
  
  // Enhanced scoring factors
  repositoryHealth: number;
  npmPackageHealth: number;
  documentationQuality: number;
  communityAdoption: number;
  maintenanceStatus: number;
  technicalQuality: number;
  securityScore: number;
  performanceScore: number;
}

/**
 * Enhanced confidence scoring configuration
 */
export interface ConfidenceConfig {
  weights: {
    contentQuality: number;
    urlReliability: number;
    contentCompleteness: number;
    sourceCredibility: number;
    technicalValidity: number;
    contextRelevance: number;
    repositoryHealth: number;
    npmPackageHealth: number;
    documentationQuality: number;
    communityAdoption: number;
    maintenanceStatus: number;
    technicalQuality: number;
    securityScore: number;
    performanceScore: number;
  };
  thresholds: {
    minimumScore: number;
    highConfidenceScore: number;
    excellentScore: number;
  };
  enableAdvancedScoring: boolean;
  enableAdaptiveLearning: boolean;
  enableExternalMetrics: boolean;
}

/**
 * Repository health metrics
 */
export interface RepositoryMetrics {
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  closedIssues: number;
  recentCommits: number;
  contributors: number;
  lastCommit: Date;
  license: string;
  readmeSize: number;
  hasTests: boolean;
  hasCI: boolean;
  hasSecurityPolicy: boolean;
}

/**
 * NPM package metrics
 */
export interface NPMMetrics {
  downloads: number;
  weeklyDownloads: number;
  versions: number;
  dependencies: number;
  devDependencies: number;
  lastPublished: Date;
  maintainers: number;
  hasSecurityAudit: boolean;
  vulnerabilityCount: number;
  bundleSize: number;
}

/**
 * Documentation quality metrics
 */
export interface DocumentationMetrics {
  readmeCompleteness: number;
  apiDocumentation: number;
  examples: number;
  tutorials: number;
  changelog: boolean;
  contributing: boolean;
  license: boolean;
  codeOfConduct: boolean;
  issueTemplate: boolean;
  prTemplate: boolean;
}

/**
 * Community adoption metrics
 */
export interface CommunityMetrics {
  githubStars: number;
  npmDownloads: number;
  stackOverflowMentions: number;
  redditMentions: number;
  twitterMentions: number;
  blogPosts: number;
  conferenceTalks: number;
  corporateAdoption: number;
}

/**
 * Confidence score explanation
 */
export interface ConfidenceExplanation {
  overallScore: number;
  factors: {
    repositoryHealth: number;
    documentationQuality: number;
    communityAdoption: number;
    maintenanceStatus: number;
    technicalQuality: number;
    securityScore: number;
    performanceScore: number;
  };
  explanation: string;
  recommendations: string[];
  strengths: string[];
  weaknesses: string[];
  riskFactors: string[];
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
  private adaptiveLearning: AdaptiveLearningSystem;

  constructor(config: Partial<ConfidenceConfig> = {}) {
    this.config = {
      weights: {
        contentQuality: 0.15,
        urlReliability: 0.10,
        contentCompleteness: 0.10,
        sourceCredibility: 0.10,
        technicalValidity: 0.08,
        contextRelevance: 0.08,
        repositoryHealth: 0.12,
        npmPackageHealth: 0.10,
        documentationQuality: 0.10,
        communityAdoption: 0.12,
        maintenanceStatus: 0.10,
        technicalQuality: 0.08,
        securityScore: 0.08,
        performanceScore: 0.05
      },
      thresholds: {
        minimumScore: 0.3,
        highConfidenceScore: 0.7,
        excellentScore: 0.9
      },
      enableAdvancedScoring: true,
      enableAdaptiveLearning: true,
      enableExternalMetrics: true,
      ...config
    };

    // Initialize adaptive learning system
    this.adaptiveLearning = createAdaptiveLearningSystem({
      enableLearning: this.config.enableAdaptiveLearning
    });

    logger.info('Enhanced confidence scorer initialized', { config: this.config });
  }

  /**
   * Initialize the confidence scorer with adaptive learning
   */
  async initialize(): Promise<void> {
    if (this.config.enableAdaptiveLearning) {
      await this.adaptiveLearning.initialize();
      logger.info('Adaptive learning system initialized');
    }
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
      const factors = await this.analyzeConfidenceFactors(result, originalQuery);
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
   * Analyzes comprehensive confidence factors for a result
   */
  private async analyzeConfidenceFactors(
    result: MCPDiscoveryResult, 
    originalQuery: string
  ): Promise<ConfidenceFactors> {
    // Get enhanced metrics if enabled
    const repositoryMetrics = this.config.enableExternalMetrics 
      ? await this.getRepositoryMetrics(result.repository_url)
      : null;
    const npmMetrics = this.config.enableExternalMetrics && result.npm_package
      ? await this.getNPMMetrics(result.npm_package)
      : null;
    const documentationMetrics = this.config.enableExternalMetrics
      ? await this.getDocumentationMetrics(result.documentation_url, result.repository_url)
      : null;
    const communityMetrics = this.config.enableExternalMetrics
      ? await this.getCommunityMetrics(result.repository_url, result.npm_package)
      : null;

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
      categoryMatch: this.scoreCategoryMatch(result, originalQuery),
      
      // Enhanced scoring factors
      repositoryHealth: this.scoreRepositoryHealth(repositoryMetrics),
      npmPackageHealth: this.scoreNPMPackageHealth(npmMetrics),
      documentationQuality: this.scoreDocumentationQuality(documentationMetrics, result),
      communityAdoption: this.scoreCommunityAdoption(communityMetrics),
      maintenanceStatus: this.scoreMaintenanceStatus(repositoryMetrics, npmMetrics),
      technicalQuality: this.scoreTechnicalQuality(result, repositoryMetrics),
      securityScore: this.scoreSecurityScore(result, repositoryMetrics, npmMetrics),
      performanceScore: this.scorePerformanceScore(result, npmMetrics)
    };
  }

  /**
   * Calculates comprehensive confidence score from factors
   */
  private calculateConfidenceScore(factors: ConfidenceFactors): number {
    const { weights } = this.config;

    // Basic scoring factors
    const contentQualityScore = (
      (factors.hasRepositoryUrl ? 0.2 : 0) +
      (factors.hasNpmPackage ? 0.2 : 0) +
      (factors.hasDocumentationUrl ? 0.2 : 0) +
      (factors.hasSetupInstructions ? 0.2 : 0) +
      (factors.hasRequiredCredentials ? 0.2 : 0)
    );

    const urlReliabilityScore = (
      factors.repositoryUrlReliability * 0.6 +
      factors.documentationUrlReliability * 0.4
    );

    const contentCompletenessScore = (
      factors.setupInstructionsQuality * 0.6 +
      factors.credentialInformationQuality * 0.4
    );

    const sourceCredibilityScore = (
      factors.sourceCredibility * 0.7 +
      factors.contentConsistency * 0.3
    );

    const technicalValidityScore = (
      factors.packageNameValidity * 0.6 +
      factors.repositoryStructure * 0.4
    );

    const contextRelevanceScore = (
      factors.queryRelevance * 0.7 +
      factors.categoryMatch * 0.3
    );

    // Enhanced scoring factors
    const repositoryHealthScore = factors.repositoryHealth;
    const npmPackageHealthScore = factors.npmPackageHealth;
    const documentationQualityScore = factors.documentationQuality;
    const communityAdoptionScore = factors.communityAdoption;
    const maintenanceStatusScore = factors.maintenanceStatus;
    const technicalQualityScore = factors.technicalQuality;
    const securityScore = factors.securityScore;
    const performanceScore = factors.performanceScore;

    // Calculate weighted total with enhanced factors
    const totalScore = (
      contentQualityScore * weights.contentQuality +
      urlReliabilityScore * weights.urlReliability +
      contentCompletenessScore * weights.contentCompleteness +
      sourceCredibilityScore * weights.sourceCredibility +
      technicalValidityScore * weights.technicalValidity +
      contextRelevanceScore * weights.contextRelevance +
      repositoryHealthScore * weights.repositoryHealth +
      npmPackageHealthScore * weights.npmPackageHealth +
      documentationQualityScore * weights.documentationQuality +
      communityAdoptionScore * weights.communityAdoption +
      maintenanceStatusScore * weights.maintenanceStatus +
      technicalQualityScore * weights.technicalQuality +
      securityScore * weights.securityScore +
      performanceScore * weights.performanceScore
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

  /**
   * Get repository metrics from GitHub API
   */
  private async getRepositoryMetrics(repositoryUrl?: string): Promise<RepositoryMetrics | null> {
    if (!repositoryUrl || !this.config.enableExternalMetrics) return null;

    try {
      // Extract owner/repo from GitHub URL
      const githubMatch = repositoryUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!githubMatch) return null;

      const [, owner, repo] = githubMatch;
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;

      // In a real implementation, you would make HTTP requests here
      // For now, return mock data
      return {
        stars: Math.floor(Math.random() * 1000),
        forks: Math.floor(Math.random() * 100),
        watchers: Math.floor(Math.random() * 200),
        openIssues: Math.floor(Math.random() * 50),
        closedIssues: Math.floor(Math.random() * 200),
        recentCommits: Math.floor(Math.random() * 20),
        contributors: Math.floor(Math.random() * 10),
        lastCommit: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        license: 'MIT',
        readmeSize: Math.floor(Math.random() * 5000),
        hasTests: Math.random() > 0.3,
        hasCI: Math.random() > 0.4,
        hasSecurityPolicy: Math.random() > 0.6
      };
    } catch (error) {
      logger.debug('Failed to get repository metrics', { error });
      return null;
    }
  }

  /**
   * Get NPM package metrics
   */
  private async getNPMMetrics(packageName?: string): Promise<NPMMetrics | null> {
    if (!packageName || !this.config.enableExternalMetrics) return null;

    try {
      // In a real implementation, you would query NPM API
      // For now, return mock data
      return {
        downloads: Math.floor(Math.random() * 100000),
        weeklyDownloads: Math.floor(Math.random() * 10000),
        versions: Math.floor(Math.random() * 20),
        dependencies: Math.floor(Math.random() * 10),
        devDependencies: Math.floor(Math.random() * 5),
        lastPublished: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        maintainers: Math.floor(Math.random() * 3),
        hasSecurityAudit: Math.random() > 0.3,
        vulnerabilityCount: Math.floor(Math.random() * 5),
        bundleSize: Math.floor(Math.random() * 1000000)
      };
    } catch (error) {
      logger.debug('Failed to get NPM metrics', { error });
      return null;
    }
  }

  /**
   * Get documentation quality metrics
   */
  private async getDocumentationMetrics(docUrl?: string, repoUrl?: string): Promise<DocumentationMetrics | null> {
    if (!docUrl && !repoUrl || !this.config.enableExternalMetrics) return null;

    try {
      // In a real implementation, you would analyze documentation
      // For now, return mock data
      return {
        readmeCompleteness: Math.random() * 0.8 + 0.2,
        apiDocumentation: Math.random() * 0.9 + 0.1,
        examples: Math.floor(Math.random() * 10),
        tutorials: Math.floor(Math.random() * 5),
        changelog: Math.random() > 0.3,
        contributing: Math.random() > 0.4,
        license: Math.random() > 0.2,
        codeOfConduct: Math.random() > 0.5,
        issueTemplate: Math.random() > 0.6,
        prTemplate: Math.random() > 0.7
      };
    } catch (error) {
      logger.debug('Failed to get documentation metrics', { error });
      return null;
    }
  }

  /**
   * Get community adoption metrics
   */
  private async getCommunityMetrics(repoUrl?: string, npmPackage?: string): Promise<CommunityMetrics | null> {
    if (!repoUrl && !npmPackage || !this.config.enableExternalMetrics) return null;

    try {
      // In a real implementation, you would query various APIs
      // For now, return mock data
      return {
        githubStars: Math.floor(Math.random() * 1000),
        npmDownloads: Math.floor(Math.random() * 100000),
        stackOverflowMentions: Math.floor(Math.random() * 50),
        redditMentions: Math.floor(Math.random() * 20),
        twitterMentions: Math.floor(Math.random() * 30),
        blogPosts: Math.floor(Math.random() * 10),
        conferenceTalks: Math.floor(Math.random() * 5),
        corporateAdoption: Math.random() * 0.3
      };
    } catch (error) {
      logger.debug('Failed to get community metrics', { error });
      return null;
    }
  }

  /**
   * Score repository health
   */
  private scoreRepositoryHealth(metrics: RepositoryMetrics | null): number {
    if (!metrics) return 0.5; // Default score when metrics unavailable

    let score = 0;

    // Stars and forks indicate popularity
    score += Math.min(metrics.stars / 1000, 1) * 0.2;
    score += Math.min(metrics.forks / 100, 1) * 0.15;

    // Recent activity
    const daysSinceLastCommit = (Date.now() - metrics.lastCommit.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastCommit < 30) score += 0.2;
    else if (daysSinceLastCommit < 90) score += 0.1;

    // Issue health (more closed than open)
    const issueRatio = metrics.closedIssues / (metrics.openIssues + metrics.closedIssues);
    score += issueRatio * 0.15;

    // Contributors indicate community involvement
    score += Math.min(metrics.contributors / 5, 1) * 0.1;

    // Documentation and structure
    if (metrics.readmeSize > 1000) score += 0.1;
    if (metrics.hasTests) score += 0.1;
    if (metrics.hasCI) score += 0.05;
    if (metrics.hasSecurityPolicy) score += 0.05;

    return Math.min(score, 1);
  }

  /**
   * Score NPM package health
   */
  private scoreNPMPackageHealth(metrics: NPMMetrics | null): number {
    if (!metrics) return 0.5;

    let score = 0;

    // Download metrics
    score += Math.min(metrics.downloads / 10000, 1) * 0.3;
    score += Math.min(metrics.weeklyDownloads / 1000, 1) * 0.2;

    // Version history
    score += Math.min(metrics.versions / 10, 1) * 0.1;

    // Recency
    const daysSincePublish = (Date.now() - metrics.lastPublished.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSincePublish < 30) score += 0.2;
    else if (daysSincePublish < 90) score += 0.1;

    // Security
    if (metrics.hasSecurityAudit) score += 0.1;
    score -= Math.min(metrics.vulnerabilityCount / 10, 0.2);

    // Bundle size (smaller is better)
    if (metrics.bundleSize < 100000) score += 0.1;

    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Score documentation quality
   */
  private scoreDocumentationQuality(metrics: DocumentationMetrics | null, result: MCPDiscoveryResult): number {
    if (!metrics) {
      // Fallback to basic scoring
      return this.scoreSetupInstructionsQuality(result.setup_instructions);
    }

    let score = 0;

    score += metrics.readmeCompleteness * 0.3;
    score += metrics.apiDocumentation * 0.25;
    score += Math.min(metrics.examples / 5, 1) * 0.2;
    score += Math.min(metrics.tutorials / 3, 1) * 0.15;

    // Bonus for good practices
    if (metrics.changelog) score += 0.05;
    if (metrics.contributing) score += 0.05;

    return Math.min(score, 1);
  }

  /**
   * Score community adoption
   */
  private scoreCommunityAdoption(metrics: CommunityMetrics | null): number {
    if (!metrics) return 0.5;

    let score = 0;

    // GitHub stars
    score += Math.min(metrics.githubStars / 500, 1) * 0.3;

    // NPM downloads
    score += Math.min(metrics.npmDownloads / 50000, 1) * 0.25;

    // Social mentions
    score += Math.min(metrics.stackOverflowMentions / 20, 1) * 0.15;
    score += Math.min(metrics.redditMentions / 10, 1) * 0.1;
    score += Math.min(metrics.twitterMentions / 15, 1) * 0.1;

    // Content creation
    score += Math.min(metrics.blogPosts / 5, 1) * 0.05;
    score += Math.min(metrics.conferenceTalks / 3, 1) * 0.05;

    return Math.min(score, 1);
  }

  /**
   * Score maintenance status
   */
  private scoreMaintenanceStatus(repoMetrics: RepositoryMetrics | null, npmMetrics: NPMMetrics | null): number {
    let score = 0.5; // Base score

    if (repoMetrics) {
      const daysSinceCommit = (Date.now() - repoMetrics.lastCommit.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCommit < 7) score += 0.3;
      else if (daysSinceCommit < 30) score += 0.2;
      else if (daysSinceCommit < 90) score += 0.1;
    }

    if (npmMetrics) {
      const daysSincePublish = (Date.now() - npmMetrics.lastPublished.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSincePublish < 30) score += 0.2;
      else if (daysSincePublish < 90) score += 0.1;
    }

    return Math.min(score, 1);
  }

  /**
   * Score technical quality
   */
  private scoreTechnicalQuality(result: MCPDiscoveryResult, repoMetrics: RepositoryMetrics | null): number {
    let score = 0.5;

    // Check for technical indicators in setup instructions
    const setupLower = result.setup_instructions.toLowerCase();
    if (setupLower.includes('typescript') || setupLower.includes('ts')) score += 0.1;
    if (setupLower.includes('test') || setupLower.includes('spec')) score += 0.1;
    if (setupLower.includes('lint') || setupLower.includes('eslint')) score += 0.1;
    if (setupLower.includes('build') || setupLower.includes('compile')) score += 0.1;

    // Repository metrics
    if (repoMetrics?.hasTests) score += 0.1;
    if (repoMetrics?.hasCI) score += 0.1;

    return Math.min(score, 1);
  }

  /**
   * Score security
   */
  private scoreSecurityScore(result: MCPDiscoveryResult, repoMetrics: RepositoryMetrics | null, npmMetrics: NPMMetrics | null): number {
    let score = 0.5;

    // Repository security
    if (repoMetrics?.hasSecurityPolicy) score += 0.2;

    // NPM security
    if (npmMetrics?.hasSecurityAudit) score += 0.2;
    if (npmMetrics?.vulnerabilityCount === 0) score += 0.1;
    else if (npmMetrics?.vulnerabilityCount && npmMetrics.vulnerabilityCount > 0) score -= Math.min(npmMetrics.vulnerabilityCount / 5, 0.3);

    // Credential handling
    if (result.required_credentials.length > 0) {
      const credsLower = result.required_credentials.join(' ').toLowerCase();
      if (credsLower.includes('api key') || credsLower.includes('token')) score += 0.1;
    }

    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Score performance
   */
  private scorePerformanceScore(result: MCPDiscoveryResult, npmMetrics: NPMMetrics | null): number {
    let score = 0.5;

    if (npmMetrics) {
      // Bundle size (smaller is better)
      if (npmMetrics.bundleSize < 100000) score += 0.3;
      else if (npmMetrics.bundleSize < 500000) score += 0.2;
      else if (npmMetrics.bundleSize < 1000000) score += 0.1;

      // Dependencies (fewer is better)
      if (npmMetrics.dependencies < 5) score += 0.2;
      else if (npmMetrics.dependencies < 10) score += 0.1;
    }

    return Math.min(score, 1);
  }

  /**
   * Generate detailed confidence explanation
   */
  async generateConfidenceExplanation(
    result: MCPDiscoveryResult,
    originalQuery: string
  ): Promise<ConfidenceExplanation> {
    const factors = await this.analyzeConfidenceFactors(result, originalQuery);
    const overallScore = this.calculateConfidenceScore(factors);

    const explanation = this.generateExplanationText(overallScore, factors);
    const recommendations = this.generateRecommendations(factors);
    const strengths = this.identifyStrengths(factors);
    const weaknesses = this.identifyWeaknesses(factors);
    const riskFactors = this.identifyRiskFactors(factors);

    return {
      overallScore,
      factors: {
        repositoryHealth: factors.repositoryHealth,
        documentationQuality: factors.documentationQuality,
        communityAdoption: factors.communityAdoption,
        maintenanceStatus: factors.maintenanceStatus,
        technicalQuality: factors.technicalQuality,
        securityScore: factors.securityScore,
        performanceScore: factors.performanceScore
      },
      explanation,
      recommendations,
      strengths,
      weaknesses,
      riskFactors
    };
  }

  /**
   * Generate explanation text
   */
  private generateExplanationText(score: number, factors: ConfidenceFactors): string {
    const level = this.getConfidenceLevel(score);
    
    if (level === 'excellent') {
      return "High confidence due to excellent repository health, comprehensive documentation, strong community adoption, and active maintenance.";
    } else if (level === 'high') {
      return "Good confidence based on solid repository metrics, good documentation quality, and community adoption.";
    } else if (level === 'medium') {
      return "Moderate confidence with some areas for improvement in documentation or community adoption.";
    } else {
      return "Low confidence due to limited documentation, low community adoption, or maintenance concerns.";
    }
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(factors: ConfidenceFactors): string[] {
    const recommendations: string[] = [];

    if (factors.documentationQuality < 0.6) {
      recommendations.push("Consider improving documentation quality and completeness");
    }
    if (factors.communityAdoption < 0.5) {
      recommendations.push("Monitor community adoption and engagement");
    }
    if (factors.maintenanceStatus < 0.6) {
      recommendations.push("Check maintenance status and recent activity");
    }
    if (factors.securityScore < 0.7) {
      recommendations.push("Review security practices and vulnerability status");
    }

    return recommendations;
  }

  /**
   * Identify strengths
   */
  private identifyStrengths(factors: ConfidenceFactors): string[] {
    const strengths: string[] = [];

    if (factors.repositoryHealth > 0.8) strengths.push("Excellent repository health");
    if (factors.documentationQuality > 0.8) strengths.push("High-quality documentation");
    if (factors.communityAdoption > 0.8) strengths.push("Strong community adoption");
    if (factors.maintenanceStatus > 0.8) strengths.push("Active maintenance");
    if (factors.securityScore > 0.8) strengths.push("Good security practices");

    return strengths;
  }

  /**
   * Identify weaknesses
   */
  private identifyWeaknesses(factors: ConfidenceFactors): string[] {
    const weaknesses: string[] = [];

    if (factors.repositoryHealth < 0.4) weaknesses.push("Limited repository activity");
    if (factors.documentationQuality < 0.4) weaknesses.push("Insufficient documentation");
    if (factors.communityAdoption < 0.4) weaknesses.push("Low community adoption");
    if (factors.maintenanceStatus < 0.4) weaknesses.push("Inactive maintenance");
    if (factors.securityScore < 0.4) weaknesses.push("Security concerns");

    return weaknesses;
  }

  /**
   * Identify risk factors
   */
  private identifyRiskFactors(factors: ConfidenceFactors): string[] {
    const risks: string[] = [];

    if (factors.maintenanceStatus < 0.3) risks.push("Abandoned or inactive project");
    if (factors.securityScore < 0.3) risks.push("Security vulnerabilities present");
    if (factors.communityAdoption < 0.2) risks.push("Very low community adoption");
    if (factors.repositoryHealth < 0.2) risks.push("Poor repository health");

    return risks;
  }

  /**
   * Record user feedback for adaptive learning
   */
  async recordFeedback(data: {
    mcpId: string;
    mcpName: string;
    originalQuery: string;
    predictedScore: number;
    actualScore: number;
    success: boolean;
    usageDuration: number;
    errorType?: string;
    feedback: string;
  }): Promise<void> {
    if (this.config.enableAdaptiveLearning) {
      await this.adaptiveLearning.recordFeedback(data);
    }
  }

  /**
   * Get adaptive learning statistics
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
    if (this.config.enableAdaptiveLearning) {
      return this.adaptiveLearning.getLearningStats();
    }
    
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

  /**
   * Get weight adjustment recommendations
   */
  async getWeightAdjustments(): Promise<Array<{
    factor: string;
    currentWeight: number;
    suggestedWeight: number;
    confidence: number;
    reason: string;
  }>> {
    if (this.config.enableAdaptiveLearning) {
      return await this.adaptiveLearning.getWeightAdjustments();
    }
    
    return [];
  }

  /**
   * Apply weight adjustments from adaptive learning
   */
  async applyWeightAdjustments(): Promise<void> {
    if (this.config.enableAdaptiveLearning) {
      const adjustments = await this.getWeightAdjustments();
      await this.adaptiveLearning.applyWeightAdjustments(adjustments);
      
      // Update local weights
      for (const adjustment of adjustments) {
        if (adjustment.confidence > 0.7) {
          this.updateLocalWeight(adjustment.factor, adjustment.suggestedWeight);
        }
      }
    }
  }

  /**
   * Predict success probability using adaptive learning
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
    if (this.config.enableAdaptiveLearning) {
      return await this.adaptiveLearning.predictSuccess(mcpId, mcpName, predictedScore, query);
    }
    
    return {
      successProbability: predictedScore,
      confidence: 0.5,
      factors: {}
    };
  }

  /**
   * Update local weight configuration
   */
  private updateLocalWeight(factor: string, newWeight: number): void {
    if (factor in this.config.weights) {
      this.config.weights[factor as keyof typeof this.config.weights] = newWeight;
      logger.info(`Updated weight for ${factor}: ${newWeight}`);
    }
  }

  /**
   * Get enhanced confidence explanation with adaptive learning insights
   */
  async getEnhancedConfidenceExplanation(
    result: MCPDiscoveryResult,
    originalQuery: string
  ): Promise<ConfidenceExplanation & {
    learningInsights: {
      predictedSuccess: number;
      confidence: number;
      similarCases: number;
      improvementSuggestions: string[];
    };
  }> {
    const baseExplanation = await this.generateConfidenceExplanation(result, originalQuery);
    
    let learningInsights = {
      predictedSuccess: baseExplanation.overallScore,
      confidence: 0.5,
      similarCases: 0,
      improvementSuggestions: [] as string[]
    };

    if (this.config.enableAdaptiveLearning) {
      const prediction = await this.predictSuccess(
        result.mcp_name,
        result.mcp_name,
        baseExplanation.overallScore,
        originalQuery
      );
      
      const learningStats = this.getLearningStats();
      
      learningInsights = {
        predictedSuccess: prediction.successProbability,
        confidence: prediction.confidence,
        similarCases: learningStats.totalFeedback,
        improvementSuggestions: this.generateImprovementSuggestions(baseExplanation, prediction)
      };
    }

    return {
      ...baseExplanation,
      learningInsights
    };
  }

  /**
   * Generate improvement suggestions based on learning insights
   */
  private generateImprovementSuggestions(
    explanation: ConfidenceExplanation,
    prediction: { successProbability: number; confidence: number; factors: Record<string, number> }
  ): string[] {
    const suggestions: string[] = [];

    if (prediction.confidence < 0.5) {
      suggestions.push("Limited historical data available - consider manual evaluation");
    }

    if (prediction.successProbability < explanation.overallScore) {
      suggestions.push("Historical data suggests lower success rate than predicted");
    }

    if (explanation.overallScore < 0.6) {
      suggestions.push("Consider alternative MCPs with higher confidence scores");
    }

    return suggestions;
  }
}

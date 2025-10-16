/**
 * Comprehensive Tests for Enhanced Confidence Scorer
 * 
 * This module tests the enhanced confidence scoring system including
 * adaptive learning, comprehensive scoring factors, and explanation generation.
 */

import { ConfidenceScorer } from '../confidence-scorer.js';
import { MCPDiscoveryResult } from '../../../types/mcp.js';

describe('Enhanced Confidence Scorer', () => {
  let scorer: ConfidenceScorer;

  beforeEach(() => {
    scorer = new ConfidenceScorer({
      enableAdvancedScoring: true,
      enableAdaptiveLearning: true,
      enableExternalMetrics: true
    });
  });

  describe('Basic Scoring Functionality', () => {
    it('should score MCP discovery results', async () => {
      const mockResults: MCPDiscoveryResult[] = [
        {
          mcp_name: 'filesystem-mcp',
          repository_url: 'https://github.com/modelcontextprotocol/server-filesystem',
          npm_package: '@modelcontextprotocol/server-filesystem',
          documentation_url: 'https://github.com/modelcontextprotocol/server-filesystem#readme',
          setup_instructions: 'npm install @modelcontextprotocol/server-filesystem',
          required_credentials: ['API_KEY'],
          confidence_score: 0
        },
        {
          mcp_name: 'database-mcp',
          repository_url: 'https://github.com/example/database-mcp',
          documentation_url: 'https://example.com/docs',
          setup_instructions: 'pip install database-mcp',
          required_credentials: ['DB_URL', 'DB_PASSWORD'],
          confidence_score: 0
        }
      ];

      const scoredResults = await scorer.scoreResults(mockResults, 'filesystem operations');

      expect(scoredResults).toHaveLength(2);
      expect(scoredResults[0].confidence_score).toBeGreaterThan(0);
      expect(scoredResults[1].confidence_score).toBeGreaterThan(0);
      
      // Results should be sorted by confidence score
      expect(scoredResults[0].confidence_score).toBeGreaterThanOrEqual(scoredResults[1].confidence_score);
    });

    it('should handle empty results', async () => {
      const results = await scorer.scoreResults([], 'test query');
      expect(results).toHaveLength(0);
    });

    it('should handle scoring errors gracefully', async () => {
      const invalidResults: MCPDiscoveryResult[] = [
        {
          mcp_name: '',
          repository_url: '',
          documentation_url: '',
          setup_instructions: '',
          required_credentials: [],
          confidence_score: 0
        }
      ];

      const results = await scorer.scoreResults(invalidResults, 'test');
      expect(results).toHaveLength(1);
      expect(results[0].confidence_score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Confidence Level Classification', () => {
    it('should classify confidence levels correctly', () => {
      expect(scorer.getConfidenceLevel(0.95)).toBe('excellent');
      expect(scorer.getConfidenceLevel(0.85)).toBe('high');
      expect(scorer.getConfidenceLevel(0.65)).toBe('medium');
      expect(scorer.getConfidenceLevel(0.25)).toBe('low');
    });
  });

  describe('Scoring Statistics', () => {
    it('should calculate scoring statistics', () => {
      const mockResults: MCPDiscoveryResult[] = [
        { mcp_name: 'test1', repository_url: 'https://github.com/test1', documentation_url: 'https://test1.com', setup_instructions: 'test', required_credentials: [], confidence_score: 0.9 },
        { mcp_name: 'test2', repository_url: 'https://github.com/test2', documentation_url: 'https://test2.com', setup_instructions: 'test', required_credentials: [], confidence_score: 0.7 },
        { mcp_name: 'test3', repository_url: 'https://github.com/test3', documentation_url: 'https://test3.com', setup_instructions: 'test', required_credentials: [], confidence_score: 0.5 }
      ];

      const stats = scorer.getScoringStats(mockResults);

      expect(stats.totalResults).toBe(3);
      expect(stats.averageScore).toBeCloseTo(0.7, 1);
      expect(stats.confidenceLevels.excellent).toBe(1);
      expect(stats.confidenceLevels.high).toBe(1);
      expect(stats.confidenceLevels.medium).toBe(1);
    });
  });

  describe('Confidence Explanation Generation', () => {
    it('should generate detailed confidence explanations', async () => {
      const mockResult: MCPDiscoveryResult = {
        mcp_name: 'filesystem-mcp',
        repository_url: 'https://github.com/modelcontextprotocol/server-filesystem',
        npm_package: '@modelcontextprotocol/server-filesystem',
        documentation_url: 'https://github.com/modelcontextprotocol/server-filesystem#readme',
        setup_instructions: 'npm install @modelcontextprotocol/server-filesystem',
        required_credentials: ['API_KEY'],
        confidence_score: 0
      };

      const explanation = await scorer.generateConfidenceExplanation(mockResult, 'filesystem operations');

      expect(explanation.overallScore).toBeGreaterThan(0);
      expect(explanation.factors).toBeDefined();
      expect(explanation.explanation).toBeTruthy();
      expect(explanation.recommendations).toBeInstanceOf(Array);
      expect(explanation.strengths).toBeInstanceOf(Array);
      expect(explanation.weaknesses).toBeInstanceOf(Array);
      expect(explanation.riskFactors).toBeInstanceOf(Array);
    });

    it('should generate enhanced explanations with learning insights', async () => {
      const mockResult: MCPDiscoveryResult = {
        mcp_name: 'test-mcp',
        repository_url: 'https://github.com/test/test-mcp',
        documentation_url: 'https://test.com/docs',
        setup_instructions: 'npm install test-mcp',
        required_credentials: ['API_KEY'],
        confidence_score: 0
      };

      const enhancedExplanation = await scorer.getEnhancedConfidenceExplanation(mockResult, 'test query');

      expect(enhancedExplanation.overallScore).toBeGreaterThan(0);
      expect(enhancedExplanation.learningInsights).toBeDefined();
      expect(enhancedExplanation.learningInsights.predictedSuccess).toBeGreaterThanOrEqual(0);
      expect(enhancedExplanation.learningInsights.confidence).toBeGreaterThanOrEqual(0);
      expect(enhancedExplanation.learningInsights.improvementSuggestions).toBeInstanceOf(Array);
    });
  });

  describe('Adaptive Learning Integration', () => {
    it('should record user feedback', async () => {
      await scorer.initialize();

      await scorer.recordFeedback({
        mcpId: 'test-mcp-1',
        mcpName: 'Test MCP',
        originalQuery: 'test query',
        predictedScore: 0.8,
        actualScore: 0.9,
        success: true,
        usageDuration: 30,
        feedback: 'repositoryHealth:0.9,documentationQuality:0.8'
      });

      const learningStats = scorer.getLearningStats();
      expect(learningStats.totalFeedback).toBeGreaterThan(0);
    });

    it('should provide learning statistics', () => {
      const stats = scorer.getLearningStats();

      expect(stats).toHaveProperty('totalFeedback');
      expect(stats).toHaveProperty('accuracy');
      expect(stats).toHaveProperty('bias');
      expect(stats).toHaveProperty('variance');
      expect(stats).toHaveProperty('improvementRate');
      expect(stats).toHaveProperty('recentAccuracy');
      expect(stats).toHaveProperty('factorPerformance');
    });

    it('should get weight adjustment recommendations', async () => {
      const adjustments = await scorer.getWeightAdjustments();
      expect(adjustments).toBeInstanceOf(Array);
    });

    it('should predict success probability', async () => {
      const prediction = await scorer.predictSuccess(
        'test-mcp',
        'Test MCP',
        0.8,
        'test query'
      );

      expect(prediction.successProbability).toBeGreaterThanOrEqual(0);
      expect(prediction.successProbability).toBeLessThanOrEqual(1);
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
      expect(prediction.factors).toBeDefined();
    });
  });

  describe('Configuration Management', () => {
    it('should use custom configuration', () => {
      const customScorer = new ConfidenceScorer({
        enableAdvancedScoring: false,
        enableAdaptiveLearning: false,
        enableExternalMetrics: false,
        weights: {
          contentQuality: 0.5,
          urlReliability: 0.3,
          contentCompleteness: 0.2,
          sourceCredibility: 0.0,
          technicalValidity: 0.0,
          contextRelevance: 0.0,
          repositoryHealth: 0.0,
          npmPackageHealth: 0.0,
          documentationQuality: 0.0,
          communityAdoption: 0.0,
          maintenanceStatus: 0.0,
          technicalQuality: 0.0,
          securityScore: 0.0,
          performanceScore: 0.0
        }
      });

      expect(customScorer).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing repository URLs', async () => {
      const result: MCPDiscoveryResult = {
        mcp_name: 'test-mcp',
        repository_url: '',
        documentation_url: 'https://test.com',
        setup_instructions: 'test',
        required_credentials: [],
        confidence_score: 0
      };

      const scoredResult = await scorer.scoreResults([result], 'test');
      expect(scoredResult[0].confidence_score).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing documentation URLs', async () => {
      const result: MCPDiscoveryResult = {
        mcp_name: 'test-mcp',
        repository_url: 'https://github.com/test/test',
        documentation_url: '',
        setup_instructions: 'test',
        required_credentials: [],
        confidence_score: 0
      };

      const scoredResult = await scorer.scoreResults([result], 'test');
      expect(scoredResult[0].confidence_score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large result sets efficiently', async () => {
      const largeResultSet: MCPDiscoveryResult[] = Array.from({ length: 100 }, (_, i) => ({
        mcp_name: `test-mcp-${i}`,
        repository_url: `https://github.com/test/mcp-${i}`,
        documentation_url: `https://test-${i}.com`,
        setup_instructions: `npm install mcp-${i}`,
        required_credentials: ['API_KEY'],
        confidence_score: 0
      }));

      const startTime = Date.now();
      const results = await scorer.scoreResults(largeResultSet, 'test query');
      const endTime = Date.now();

      expect(results).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});

describe('Confidence Scorer Integration', () => {
  let scorer: ConfidenceScorer;

  beforeEach(async () => {
    scorer = new ConfidenceScorer({
      enableAdvancedScoring: true,
      enableAdaptiveLearning: true,
      enableExternalMetrics: true
    });
    await scorer.initialize();
  });

  it('should integrate with discovery engine workflow', async () => {
    // Simulate discovery engine workflow
    const mockResults: MCPDiscoveryResult[] = [
      {
        mcp_name: 'filesystem-mcp',
        repository_url: 'https://github.com/modelcontextprotocol/server-filesystem',
        npm_package: '@modelcontextprotocol/server-filesystem',
        documentation_url: 'https://github.com/modelcontextprotocol/server-filesystem#readme',
        setup_instructions: 'npm install @modelcontextprotocol/server-filesystem',
        required_credentials: ['API_KEY'],
        confidence_score: 0
      }
    ];

    // Score results
    const scoredResults = await scorer.scoreResults(mockResults, 'filesystem operations');
    
    // Generate explanations
    const explanation = await scorer.generateConfidenceExplanation(scoredResults[0], 'filesystem operations');
    
    // Record feedback (simulating user interaction)
    await scorer.recordFeedback({
      mcpId: 'filesystem-mcp',
      mcpName: 'filesystem-mcp',
      originalQuery: 'filesystem operations',
      predictedScore: explanation.overallScore,
      actualScore: 0.9,
      success: true,
      usageDuration: 45,
      feedback: 'repositoryHealth:0.9,documentationQuality:0.8,communityAdoption:0.7'
    });

    // Get learning insights
    const learningStats = scorer.getLearningStats();
    expect(learningStats.totalFeedback).toBeGreaterThan(0);
  });

  it('should provide comprehensive scoring for real-world scenarios', async () => {
    const realWorldResults: MCPDiscoveryResult[] = [
      {
        mcp_name: 'github-mcp',
        repository_url: 'https://github.com/modelcontextprotocol/server-github',
        npm_package: '@modelcontextprotocol/server-github',
        documentation_url: 'https://github.com/modelcontextprotocol/server-github#readme',
        setup_instructions: 'npm install @modelcontextprotocol/server-github\nConfigure with GITHUB_TOKEN',
        required_credentials: ['GITHUB_TOKEN'],
        confidence_score: 0
      },
      {
        mcp_name: 'database-mcp',
        repository_url: 'https://github.com/example/database-mcp',
        documentation_url: 'https://example.com/database-mcp/docs',
        setup_instructions: 'pip install database-mcp\nSet DB_URL environment variable',
        required_credentials: ['DB_URL', 'DB_PASSWORD'],
        confidence_score: 0
      }
    ];

    const scoredResults = await scorer.scoreResults(realWorldResults, 'database and github integration');

    // Verify scoring worked
    expect(scoredResults).toHaveLength(2);
    expect(scoredResults[0].confidence_score).toBeGreaterThan(0);
    expect(scoredResults[1].confidence_score).toBeGreaterThan(0);

    // Verify results are sorted by confidence
    expect(scoredResults[0].confidence_score).toBeGreaterThanOrEqual(scoredResults[1].confidence_score);

    // Generate explanations for both results
    for (const result of scoredResults) {
      const explanation = await scorer.generateConfidenceExplanation(result, 'database and github integration');
      expect(explanation.overallScore).toBeGreaterThan(0);
      expect(explanation.explanation).toBeTruthy();
    }
  });
});

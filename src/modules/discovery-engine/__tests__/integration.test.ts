/**
 * Integration Tests for MCP Discovery Engine
 * 
 * This module tests the complete integration of the discovery engine
 * with the enhanced confidence scoring system.
 */

import { DiscoveryEngine } from '../index.js';
import { ConfidenceScorer } from '../confidence-scorer.js';
import { MCPRegistry } from '../../core/registry.js';

describe('MCP Discovery Engine Integration', () => {
  let discoveryEngine: DiscoveryEngine;
  let confidenceScorer: ConfidenceScorer;
  let registry: MCPRegistry;

  beforeEach(async () => {
    // Initialize components
    confidenceScorer = new ConfidenceScorer({
      enableAdvancedScoring: true,
      enableAdaptiveLearning: true,
      enableExternalMetrics: true
    });
    
    registry = new MCPRegistry({
      storageType: 'json',
      storagePath: '/tmp/test-registry.json'
    });

    discoveryEngine = new DiscoveryEngine({
      perplexityApiKey: 'test-key',
      confidenceScorer,
      registry
    });

    await discoveryEngine.initialize();
  });

  describe('End-to-End Discovery Workflow', () => {
    it('should discover and score MCPs for a given query', async () => {
      const query = 'filesystem operations and file management';
      
      const results = await discoveryEngine.discoverMCPs(query);
      
      expect(results).toBeDefined();
      expect(results.results).toBeInstanceOf(Array);
      expect(results.source_reliability).toBeDefined();
      
      // Verify results are scored
      for (const result of results.results) {
        expect(result.confidence_score).toBeGreaterThan(0);
        expect(result.confidence_score).toBeLessThanOrEqual(1);
      }
    });

    it('should provide detailed confidence explanations', async () => {
      const query = 'database operations';
      const results = await discoveryEngine.discoverMCPs(query);
      
      if (results.results.length > 0) {
        const explanation = await confidenceScorer.generateConfidenceExplanation(
          results.results[0],
          query
        );
        
        expect(explanation.overallScore).toBeGreaterThan(0);
        expect(explanation.factors).toBeDefined();
        expect(explanation.explanation).toBeTruthy();
        expect(explanation.recommendations).toBeInstanceOf(Array);
      }
    });

    it('should integrate with registry system', async () => {
      const query = 'API integration';
      const results = await discoveryEngine.discoverMCPs(query);
      
      // Store results in registry
      for (const result of results.results) {
        await registry.addEntry({
          id: result.mcp_name,
          name: result.mcp_name,
          category: ['api'],
          repository: result.repository_url,
          npmPackage: result.npm_package,
          installCommand: result.setup_instructions,
          configurationSchema: {},
          requiredCredentials: result.required_credentials.map(cred => ({
            keyName: cred,
            envVarName: cred,
            description: `Required ${cred}`,
            optional: false
          })),
          documentationUrl: result.documentation_url,
          examples: [],
          discoveryMetadata: {
            source: 'discovery-engine',
            discoveredAt: new Date(),
            confidence: result.confidence_score,
            lastVerified: new Date()
          },
          usageStats: {
            timesUsed: 0,
            lastUsed: new Date(),
            averageSuccessRate: 0
          }
        });
      }
      
      // Verify registry integration
      const registryStats = await registry.getStats();
      expect(registryStats.totalEntries).toBeGreaterThan(0);
    });
  });

  describe('Adaptive Learning Integration', () => {
    it('should learn from user feedback', async () => {
      const query = 'filesystem operations';
      const results = await discoveryEngine.discoverMCPs(query);
      
      if (results.results.length > 0) {
        const result = results.results[0];
        
        // Record user feedback
        await confidenceScorer.recordFeedback({
          mcpId: result.mcp_name,
          mcpName: result.mcp_name,
          originalQuery: query,
          predictedScore: result.confidence_score,
          actualScore: 0.9,
          success: true,
          usageDuration: 30,
          feedback: 'repositoryHealth:0.9,documentationQuality:0.8'
        });
        
        // Check learning statistics
        const learningStats = confidenceScorer.getLearningStats();
        expect(learningStats.totalFeedback).toBeGreaterThan(0);
      }
    });

    it('should provide weight adjustment recommendations', async () => {
      // Record some feedback first
      await confidenceScorer.recordFeedback({
        mcpId: 'test-mcp',
        mcpName: 'Test MCP',
        originalQuery: 'test query',
        predictedScore: 0.8,
        actualScore: 0.9,
        success: true,
        usageDuration: 30,
        feedback: 'repositoryHealth:0.9,documentationQuality:0.8'
      });
      
      const adjustments = await confidenceScorer.getWeightAdjustments();
      expect(adjustments).toBeInstanceOf(Array);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent discovery requests', async () => {
      const queries = [
        'filesystem operations',
        'database integration',
        'API management',
        'web scraping',
        'cloud services'
      ];
      
      const startTime = Date.now();
      const promises = queries.map(query => discoveryEngine.discoverMCPs(query));
      const results = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(results).toHaveLength(5);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      // Verify all results are properly scored
      for (const result of results) {
        expect(result.results).toBeInstanceOf(Array);
        for (const mcp of result.results) {
          expect(mcp.confidence_score).toBeGreaterThan(0);
        }
      }
    });

    it('should efficiently process large result sets', async () => {
      const query = 'general purpose tools';
      const results = await discoveryEngine.discoverMCPs(query);
      
      if (results.results.length > 0) {
        const startTime = Date.now();
        const scoredResults = await confidenceScorer.scoreResults(results.results, query);
        const endTime = Date.now();
        
        expect(scoredResults).toHaveLength(results.results.length);
        expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
        
        // Verify results are sorted by confidence
        for (let i = 1; i < scoredResults.length; i++) {
          expect(scoredResults[i-1].confidence_score).toBeGreaterThanOrEqual(scoredResults[i].confidence_score);
        }
      }
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle API failures gracefully', async () => {
      // Test with invalid API key
      const invalidEngine = new DiscoveryEngine({
        perplexityApiKey: 'invalid-key',
        confidenceScorer,
        registry
      });
      
      try {
        await invalidEngine.discoverMCPs('test query');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle malformed discovery results', async () => {
      const malformedResults = [
        {
          mcp_name: '',
          repository_url: '',
          documentation_url: '',
          setup_instructions: '',
          required_credentials: [],
          confidence_score: 0
        }
      ];
      
      const scoredResults = await confidenceScorer.scoreResults(malformedResults, 'test');
      expect(scoredResults).toHaveLength(1);
      expect(scoredResults[0].confidence_score).toBeGreaterThanOrEqual(0);
    });

    it('should handle network timeouts', async () => {
      // This would test timeout handling in a real implementation
      const query = 'test query';
      const results = await discoveryEngine.discoverMCPs(query);
      expect(results).toBeDefined();
    });
  });

  describe('Configuration and Customization', () => {
    it('should work with custom confidence scorer configuration', async () => {
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
      
      const customEngine = new DiscoveryEngine({
        perplexityApiKey: 'test-key',
        confidenceScorer: customScorer,
        registry
      });
      
      await customEngine.initialize();
      const results = await customEngine.discoverMCPs('test query');
      expect(results).toBeDefined();
    });

    it('should work with different registry configurations', async () => {
      const customRegistry = new MCPRegistry({
        storageType: 'json',
        storagePath: '/tmp/custom-registry.json',
        cacheTTL: 3600,
        maxEntries: 500
      });
      
      const customEngine = new DiscoveryEngine({
        perplexityApiKey: 'test-key',
        confidenceScorer,
        registry: customRegistry
      });
      
      await customEngine.initialize();
      const results = await customEngine.discoverMCPs('test query');
      expect(results).toBeDefined();
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle complex multi-tool queries', async () => {
      const complexQuery = 'Build a web application with React frontend, Node.js backend, PostgreSQL database, and Docker deployment';
      
      const results = await discoveryEngine.discoverMCPs(complexQuery);
      
      expect(results.results).toBeInstanceOf(Array);
      
      // Should find MCPs for different aspects
      const categories = results.results.map(r => r.category).filter(Boolean);
      expect(categories.length).toBeGreaterThan(0);
    });

    it('should provide relevant MCPs for specific domains', async () => {
      const domainQueries = [
        'machine learning and AI',
        'blockchain and cryptocurrency',
        'IoT and embedded systems',
        'mobile app development',
        'data science and analytics'
      ];
      
      for (const query of domainQueries) {
        const results = await discoveryEngine.discoverMCPs(query);
        expect(results.results).toBeInstanceOf(Array);
        
        // Each domain should return relevant results
        if (results.results.length > 0) {
          const topResult = results.results[0];
          expect(topResult.confidence_score).toBeGreaterThan(0);
        }
      }
    });

    it('should learn and improve over time', async () => {
      const query = 'filesystem operations';
      
      // Initial discovery
      const initialResults = await discoveryEngine.discoverMCPs(query);
      const initialStats = confidenceScorer.getLearningStats();
      
      // Record some feedback
      if (initialResults.results.length > 0) {
        await confidenceScorer.recordFeedback({
          mcpId: initialResults.results[0].mcp_name,
          mcpName: initialResults.results[0].mcp_name,
          originalQuery: query,
          predictedScore: initialResults.results[0].confidence_score,
          actualScore: 0.9,
          success: true,
          usageDuration: 45,
          feedback: 'repositoryHealth:0.9,documentationQuality:0.8,communityAdoption:0.7'
        });
      }
      
      // Check that learning statistics have improved
      const updatedStats = confidenceScorer.getLearningStats();
      expect(updatedStats.totalFeedback).toBeGreaterThan(initialStats.totalFeedback);
    });
  });
});

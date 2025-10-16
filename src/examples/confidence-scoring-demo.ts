/**
 * Confidence Scoring System Demo
 * 
 * This example demonstrates the comprehensive confidence scoring system
 * with adaptive learning, detailed explanations, and real-world usage.
 */

import { ConfidenceScorer } from '../modules/discovery-engine/confidence-scorer.js';
import type { MCPDiscoveryResult } from '../types/mcp.js';

async function demonstrateConfidenceScoring() {
  console.log('🚀 MCP Meta-Orchestrator - Confidence Scoring Demo\n');

  // Initialize the enhanced confidence scorer
  const scorer = new ConfidenceScorer({
    enableAdvancedScoring: true,
    enableAdaptiveLearning: true,
    enableExternalMetrics: true,
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
    }
  });

  await scorer.initialize();
  console.log('✅ Enhanced confidence scorer initialized with adaptive learning\n');

  // Sample MCP discovery results
  const sampleResults: MCPDiscoveryResult[] = [
    {
      mcp_name: 'filesystem-mcp',
      repository_url: 'https://github.com/modelcontextprotocol/server-filesystem',
      npm_package: '@modelcontextprotocol/server-filesystem',
      documentation_url: 'https://github.com/modelcontextprotocol/server-filesystem#readme',
      setup_instructions: 'npm install @modelcontextprotocol/server-filesystem\nConfigure with file system permissions',
      required_credentials: ['FILE_SYSTEM_PATH'],
      confidence_score: 0
    },
    {
      mcp_name: 'github-mcp',
      repository_url: 'https://github.com/modelcontextprotocol/server-github',
      npm_package: '@modelcontextprotocol/server-github',
      documentation_url: 'https://github.com/modelcontextprotocol/server-github#readme',
      setup_instructions: 'npm install @modelcontextprotocol/server-github\nSet GITHUB_TOKEN environment variable',
      required_credentials: ['GITHUB_TOKEN'],
      confidence_score: 0
    },
    {
      mcp_name: 'database-mcp',
      repository_url: 'https://github.com/example/database-mcp',
      documentation_url: 'https://example.com/database-mcp/docs',
      setup_instructions: 'pip install database-mcp\nConfigure database connection',
      required_credentials: ['DB_URL', 'DB_PASSWORD'],
      confidence_score: 0
    },
    {
      mcp_name: 'experimental-mcp',
      repository_url: 'https://github.com/experimental/experimental-mcp',
      documentation_url: 'https://experimental.com/docs',
      setup_instructions: 'git clone and build from source',
      required_credentials: ['API_KEY'],
      confidence_score: 0
    }
  ];

  console.log('📊 Scoring MCP discovery results...\n');

  // Score the results
  const scoredResults = await scorer.scoreResults(sampleResults, 'filesystem and database operations');

  console.log('🎯 Confidence Scoring Results:\n');
  console.log('=' .repeat(80));

  for (let i = 0; i < scoredResults.length; i++) {
    const result = scoredResults[i];
    if (!result) continue;
    
    const level = scorer.getConfidenceLevel(result.confidence_score);
    
    console.log(`\n${i + 1}. ${result.mcp_name}`);
    console.log(`   Repository: ${result.repository_url}`);
    console.log(`   NPM Package: ${result.npm_package || 'N/A'}`);
    console.log(`   Confidence Score: ${result.confidence_score.toFixed(3)} (${level})`);
    console.log(`   Required Credentials: ${result.required_credentials.join(', ')}`);
  }

  console.log('\n' + '=' .repeat(80));

  // Generate detailed explanations for top results
  console.log('\n🔍 Detailed Confidence Explanations:\n');

  for (let i = 0; i < Math.min(2, scoredResults.length); i++) {
    const result = scoredResults[i];
    if (!result) continue;
    
    console.log(`\n📋 Analysis for ${result.mcp_name}:`);
    console.log('-'.repeat(50));

    const explanation = await scorer.generateConfidenceExplanation(result, 'filesystem and database operations');
    
    console.log(`Overall Score: ${explanation.overallScore.toFixed(3)}`);
    console.log(`Explanation: ${explanation.explanation}`);
    
    console.log('\nFactor Breakdown:');
    Object.entries(explanation.factors).forEach(([factor, score]) => {
      console.log(`  ${factor}: ${score.toFixed(3)}`);
    });

    if (explanation.strengths.length > 0) {
      console.log('\n✅ Strengths:');
      explanation.strengths.forEach(strength => console.log(`  • ${strength}`));
    }

    if (explanation.weaknesses.length > 0) {
      console.log('\n⚠️  Weaknesses:');
      explanation.weaknesses.forEach(weakness => console.log(`  • ${weakness}`));
    }

    if (explanation.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      explanation.recommendations.forEach(rec => console.log(`  • ${rec}`));
    }

    if (explanation.riskFactors.length > 0) {
      console.log('\n🚨 Risk Factors:');
      explanation.riskFactors.forEach(risk => console.log(`  • ${risk}`));
    }
  }

  // Demonstrate adaptive learning
  console.log('\n🧠 Adaptive Learning Demonstration:\n');

  // Record some user feedback
  console.log('Recording user feedback...');
  await scorer.recordFeedback({
    mcpId: 'filesystem-mcp',
    mcpName: 'filesystem-mcp',
    originalQuery: 'filesystem and database operations',
    predictedScore: scoredResults[0]?.confidence_score || 0.5,
    actualScore: 0.9,
    success: true,
    usageDuration: 45,
    feedback: 'repositoryHealth:0.9,documentationQuality:0.8,communityAdoption:0.7'
  });

  await scorer.recordFeedback({
    mcpId: 'database-mcp',
    mcpName: 'database-mcp',
    originalQuery: 'filesystem and database operations',
    predictedScore: scoredResults.find(r => r.mcp_name === 'database-mcp')?.confidence_score || 0.5,
    actualScore: 0.6,
    success: false,
    usageDuration: 15,
    errorType: 'configuration_error',
    feedback: 'repositoryHealth:0.4,documentationQuality:0.3,communityAdoption:0.2'
  });

  // Get learning statistics
  const learningStats = scorer.getLearningStats();
  console.log('📈 Learning Statistics:');
  console.log(`  Total Feedback: ${learningStats.totalFeedback}`);
  console.log(`  Accuracy: ${(learningStats.accuracy * 100).toFixed(1)}%`);
  console.log(`  Bias: ${learningStats.bias.toFixed(3)}`);
  console.log(`  Variance: ${learningStats.variance.toFixed(3)}`);
  console.log(`  Improvement Rate: ${(learningStats.improvementRate * 100).toFixed(1)}%`);

  // Get weight adjustment recommendations
  const adjustments = await scorer.getWeightAdjustments();
  if (adjustments.length > 0) {
    console.log('\n⚖️  Weight Adjustment Recommendations:');
    adjustments.forEach(adj => {
      console.log(`  ${adj.factor}: ${adj.currentWeight.toFixed(3)} → ${adj.suggestedWeight.toFixed(3)} (confidence: ${adj.confidence.toFixed(3)})`);
      console.log(`    Reason: ${adj.reason}`);
    });
  }

  // Demonstrate enhanced explanations with learning insights
  console.log('\n🔮 Enhanced Explanations with Learning Insights:\n');

  const enhancedExplanation = await scorer.getEnhancedConfidenceExplanation(
    scoredResults[0]!,
    'filesystem and database operations'
  );

  console.log(`Enhanced Analysis for ${scoredResults[0]?.mcp_name}:`);
  console.log(`  Predicted Success: ${enhancedExplanation.learningInsights.predictedSuccess.toFixed(3)}`);
  console.log(`  Confidence: ${enhancedExplanation.learningInsights.confidence.toFixed(3)}`);
  console.log(`  Similar Cases: ${enhancedExplanation.learningInsights.similarCases}`);
  
  if (enhancedExplanation.learningInsights.improvementSuggestions.length > 0) {
    console.log('  Improvement Suggestions:');
    enhancedExplanation.learningInsights.improvementSuggestions.forEach(suggestion => {
      console.log(`    • ${suggestion}`);
    });
  }

  // Get overall scoring statistics
  const stats = scorer.getScoringStats(scoredResults);
  console.log('\n📊 Overall Scoring Statistics:');
  console.log(`  Total Results: ${stats.totalResults}`);
  console.log(`  Average Score: ${stats.averageScore.toFixed(3)}`);
  console.log(`  Score Distribution:`);
  Object.entries(stats.scoreDistribution).forEach(([range, count]) => {
    console.log(`    ${range}: ${count} results`);
  });
  console.log(`  Confidence Levels:`);
  Object.entries(stats.confidenceLevels).forEach(([level, count]) => {
    console.log(`    ${level}: ${count} results`);
  });

  console.log('\n🎉 Confidence Scoring Demo Complete!');
  console.log('\nThe enhanced confidence scoring system provides:');
  console.log('✅ Comprehensive multi-factor scoring');
  console.log('✅ Detailed explanations and recommendations');
  console.log('✅ Adaptive learning from user feedback');
  console.log('✅ Weight adjustment recommendations');
  console.log('✅ Risk assessment and mitigation suggestions');
  console.log('✅ Performance and security scoring');
  console.log('✅ Community adoption analysis');
  console.log('✅ Maintenance status evaluation');
}

// Run the demo
if (require.main === module) {
  demonstrateConfidenceScoring().catch(console.error);
}

export { demonstrateConfidenceScoring };

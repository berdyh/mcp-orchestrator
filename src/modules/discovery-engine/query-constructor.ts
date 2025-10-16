/**
 * Query Constructor for MCP Searches
 * 
 * This module provides intelligent query construction for MCP server discovery,
 * analyzing tool names, categories, and technologies to generate optimized
 * search queries for the Perplexity API.
 */

import { createLogger } from '../../utils/logger.js';
import { defaultQueryRegistry, type QueryTemplate } from './query-templates.js';

const logger = createLogger('query-constructor');

/**
 * Tool analysis result
 */
export interface ToolAnalysis {
  name: string;
  category: string;
  technology: string;
  confidence: number;
  patterns: string[];
}

/**
 * Query construction context
 */
export interface QueryContext {
  toolNames: string[];
  categories: string[];
  technologies: string[];
  searchDepth: 'quick' | 'thorough';
  previousResults?: string[];
  userPreferences?: {
    preferredSources?: string[];
    excludeCategories?: string[];
    minConfidence?: number;
  };
}

/**
 * Constructed query with metadata
 */
export interface ConstructedQuery {
  query: string;
  template: string;
  confidence: number;
  expectedResults: number;
  searchStrategy: 'specific' | 'broad' | 'fallback';
  metadata: {
    toolMatches: string[];
    technologyMatches: string[];
    categoryMatches: string[];
    reasoning: string;
  };
}

/**
 * Technology pattern matcher
 */
export interface TechnologyPattern {
  name: string;
  patterns: RegExp[];
  category: string;
  priority: number;
  queryTemplate: string;
}

/**
 * Main query constructor class
 */
export class QueryConstructor {
  private technologyPatterns: TechnologyPattern[] = [];
  private toolCategoryMap: Map<string, string[]> = new Map();
  private searchHistory: Map<string, number> = new Map();

  constructor() {
    this.initializeTechnologyPatterns();
    this.initializeToolCategoryMap();
    logger.info('Query constructor initialized');
  }

  /**
   * Constructs optimized queries for MCP discovery
   */
  async constructQueries(context: QueryContext): Promise<ConstructedQuery[]> {
    logger.info('Constructing queries for MCP discovery', { 
      toolCount: context.toolNames.length,
      categories: context.categories,
      technologies: context.technologies
    });

    try {
      // Analyze tools and technologies
      const toolAnalysis = this.analyzeTools(context.toolNames);
      const technologyAnalysis = this.analyzeTechnologies(context.technologies);
      
      // Generate queries based on analysis
      const queries = await this.generateQueries({
        ...context,
        toolAnalysis,
        technologyAnalysis
      });

      // Optimize queries based on search depth
      const optimizedQueries = this.optimizeQueries(queries, context.searchDepth);

      // Update search history for future optimization
      this.updateSearchHistory(optimizedQueries);

      logger.info('Query construction completed', { 
        queryCount: optimizedQueries.length,
        averageConfidence: this.calculateAverageConfidence(optimizedQueries)
      });

      return optimizedQueries;

    } catch (error) {
      logger.error('Query construction failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      // Return fallback queries
      return this.generateFallbackQueries(context);
    }
  }

  /**
   * Analyzes tool names to extract categories and technologies
   */
  private analyzeTools(toolNames: string[]): ToolAnalysis[] {
    const analysis: ToolAnalysis[] = [];

    for (const toolName of toolNames) {
      const analysisResult = this.analyzeSingleTool(toolName);
      analysis.push(analysisResult);
    }

    return analysis;
  }

  /**
   * Analyzes a single tool name
   */
  private analyzeSingleTool(toolName: string): ToolAnalysis {
    const lowerToolName = toolName.toLowerCase();
    let category = 'general';
    let technology = 'unknown';
    let confidence = 0.5;
    const patterns: string[] = [];

    // Check against technology patterns
    for (const techPattern of this.technologyPatterns) {
      for (const pattern of techPattern.patterns) {
        if (pattern.test(lowerToolName)) {
          technology = techPattern.name;
          category = techPattern.category;
          confidence = Math.max(confidence, techPattern.priority / 100);
          patterns.push(techPattern.name);
          break;
        }
      }
    }

    // Check against tool category map
    for (const [categoryName, toolPatterns] of this.toolCategoryMap.entries()) {
      for (const toolPattern of toolPatterns) {
        if (lowerToolName.includes(toolPattern.toLowerCase())) {
          category = categoryName;
          confidence = Math.max(confidence, 0.7);
          patterns.push(categoryName);
          break;
        }
      }
    }

    // Special pattern matching for common tools
    if (this.isFileSystemTool(lowerToolName)) {
      category = 'filesystem';
      confidence = Math.max(confidence, 0.8);
      patterns.push('filesystem');
    }

    if (this.isDatabaseTool(lowerToolName)) {
      category = 'database';
      confidence = Math.max(confidence, 0.8);
      patterns.push('database');
    }

    if (this.isGitTool(lowerToolName)) {
      category = 'version-control';
      confidence = Math.max(confidence, 0.8);
      patterns.push('git');
    }

    if (this.isAPITool(lowerToolName)) {
      category = 'api';
      confidence = Math.max(confidence, 0.7);
      patterns.push('api');
    }

    return {
      name: toolName,
      category,
      technology,
      confidence,
      patterns
    };
  }

  /**
   * Analyzes technologies to determine relevant MCP servers
   */
  private analyzeTechnologies(technologies: string[]): string[] {
    const analyzedTechs: string[] = [];

    for (const tech of technologies) {
      const lowerTech = tech.toLowerCase();
      
      // Map common technology names to MCP-relevant terms
      const techMapping: Record<string, string> = {
        'node': 'nodejs',
        'node.js': 'nodejs',
        'javascript': 'nodejs',
        'js': 'nodejs',
        'typescript': 'nodejs',
        'ts': 'nodejs',
        'python': 'python',
        'py': 'python',
        'docker': 'docker',
        'container': 'docker',
        'kubernetes': 'docker',
        'k8s': 'docker',
        'react': 'nodejs',
        'vue': 'nodejs',
        'angular': 'nodejs',
        'express': 'nodejs',
        'fastapi': 'python',
        'django': 'python',
        'flask': 'python',
        'postgresql': 'database',
        'postgres': 'database',
        'mysql': 'database',
        'mongodb': 'database',
        'redis': 'database',
        'sqlite': 'database',
        'aws': 'aws',
        'amazon': 'aws',
        'gcp': 'google',
        'google': 'google',
        'azure': 'microsoft',
        'github': 'github',
        'gitlab': 'git',
        'git': 'git'
      };

      const mappedTech = techMapping[lowerTech] || lowerTech;
      if (mappedTech && !analyzedTechs.includes(mappedTech)) {
        analyzedTechs.push(mappedTech);
      }
    }

    return analyzedTechs;
  }

  /**
   * Generates queries based on analysis results
   */
  private async generateQueries(context: QueryContext & {
    toolAnalysis: ToolAnalysis[];
    technologyAnalysis: string[];
  }): Promise<ConstructedQuery[]> {
    const queries: ConstructedQuery[] = [];

    // Generate technology-specific queries
    for (const tech of context.technologyAnalysis) {
      const query = this.generateTechnologyQuery(tech, context);
      if (query) {
        queries.push(query);
      }
    }

    // Generate category-specific queries from both tool analysis and explicit categories
    const categories = new Set([
      ...context.toolAnalysis.map(t => t.category),
      ...context.categories
    ]);
    for (const category of categories) {
      const query = this.generateCategoryQuery(category, context);
      if (query) {
        queries.push(query);
      }
    }

    // Generate tool-specific queries for high-confidence tools
    const highConfidenceTools = context.toolAnalysis.filter(t => t.confidence > 0.7);
    for (const tool of highConfidenceTools) {
      const query = this.generateToolSpecificQuery(tool, context);
      if (query) {
        queries.push(query);
      }
    }

    // Generate multi-tool queries if multiple tools are detected
    if (context.toolAnalysis.length > 1) {
      const query = this.generateMultiToolQuery(context as QueryContext & { toolAnalysis: ToolAnalysis[]; technologyAnalysis: string[] });
      if (query) {
        queries.push(query);
      }
    }

    // If no queries were generated, create a general fallback query
    if (queries.length === 0) {
      const fallbackQuery = this.generateGeneralFallbackQuery(context);
      if (fallbackQuery) {
        queries.push(fallbackQuery);
      }
    }

    return queries;
  }

  /**
   * Generates a technology-specific query
   */
  private generateTechnologyQuery(technology: string, context: QueryContext): ConstructedQuery | null {
    try {
      const template = defaultQueryRegistry.getTemplate(`${technology}-mcp`);
      if (!template) {
        // Use generic technology template
        const query = `MCP server ${technology} Model Context Protocol`;
        return {
          query,
          template: 'generic-technology',
          confidence: 0.6,
          expectedResults: 5,
          searchStrategy: 'specific',
          metadata: {
            toolMatches: [],
            technologyMatches: [technology],
            categoryMatches: [],
            reasoning: `Technology-specific search for ${technology}`
          }
        };
      }

      const variables: Record<string, string> = {};
      for (const variable of template.variables) {
        variables[variable] = technology;
      }

      const query = defaultQueryRegistry.generateQuery(template.name, variables);
      
      return {
        query,
        template: template.name,
        confidence: 0.8,
        expectedResults: 8,
        searchStrategy: 'specific',
        metadata: {
          toolMatches: [],
          technologyMatches: [technology],
          categoryMatches: [template.category],
          reasoning: `Using ${template.name} template for ${technology}`
        }
      };
    } catch (error) {
      logger.warn('Failed to generate technology query', { technology, error });
      return null;
    }
  }

  /**
   * Generates a category-specific query
   */
  private generateCategoryQuery(category: string, context: QueryContext): ConstructedQuery | null {
    try {
      const template = defaultQueryRegistry.getTemplate(`${category}-mcp`);
      if (!template) {
        const query = `MCP server ${category} tools Model Context Protocol`;
        return {
          query,
          template: 'generic-category',
          confidence: 0.6,
          expectedResults: 6,
          searchStrategy: 'broad',
          metadata: {
            toolMatches: [],
            technologyMatches: [],
            categoryMatches: [category],
            reasoning: `Category-specific search for ${category}`
          }
        };
      }

      const variables: Record<string, string> = {};
      for (const variable of template.variables) {
        variables[variable] = category;
      }

      const query = defaultQueryRegistry.generateQuery(template.name, variables);
      
      return {
        query,
        template: template.name,
        confidence: 0.7,
        expectedResults: 7,
        searchStrategy: 'broad',
        metadata: {
          toolMatches: [],
          technologyMatches: [],
          categoryMatches: [category],
          reasoning: `Using ${template.name} template for ${category}`
        }
      };
    } catch (error) {
      logger.warn('Failed to generate category query', { category, error });
      return null;
    }
  }

  /**
   * Generates a tool-specific query
   */
  private generateToolSpecificQuery(tool: ToolAnalysis, context: QueryContext): ConstructedQuery | null {
    const query = `MCP server ${tool.name} ${tool.technology} Model Context Protocol`;
    
    return {
      query,
      template: 'tool-specific',
      confidence: tool.confidence,
      expectedResults: 4,
      searchStrategy: 'specific',
      metadata: {
        toolMatches: [tool.name],
        technologyMatches: [tool.technology],
        categoryMatches: [tool.category],
        reasoning: `Direct tool search for ${tool.name} with ${tool.technology}`
      }
    };
  }

  /**
   * Generates a multi-tool query
   */
  private generateMultiToolQuery(context: QueryContext & { toolAnalysis: ToolAnalysis[]; technologyAnalysis: string[] }): ConstructedQuery | null {
    const toolNames = context.toolAnalysis.map((t: ToolAnalysis) => t.name).slice(0, 3); // Limit to 3 tools
    const query = `MCP server multiple tools ${toolNames.join(' ')} Model Context Protocol`;
    
    return {
      query,
      template: 'multi-tool',
      confidence: 0.5,
      expectedResults: 3,
      searchStrategy: 'broad',
      metadata: {
        toolMatches: toolNames,
        technologyMatches: context.technologyAnalysis,
        categoryMatches: Array.from(new Set(context.toolAnalysis.map((t: ToolAnalysis) => t.category))),
        reasoning: `Multi-tool search for ${toolNames.length} tools`
      }
    };
  }

  /**
   * Generates a general fallback query when no specific queries can be constructed
   */
  private generateGeneralFallbackQuery(context: QueryContext): ConstructedQuery | null {
    const query = 'Model Context Protocol MCP servers development tools';
    
    return {
      query,
      template: 'general-fallback',
      confidence: 0.3,
      expectedResults: 10,
      searchStrategy: 'fallback',
      metadata: {
        toolMatches: [],
        technologyMatches: [],
        categoryMatches: ['general'],
        reasoning: 'General fallback query when no specific patterns detected'
      }
    };
  }

  /**
   * Optimizes queries based on search depth
   */
  private optimizeQueries(queries: ConstructedQuery[], searchDepth: 'quick' | 'thorough'): ConstructedQuery[] {
    if (searchDepth === 'quick') {
      // Return top 3 highest confidence queries
      return queries
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);
    } else {
      // Return all queries, sorted by confidence
      return queries.sort((a, b) => b.confidence - a.confidence);
    }
  }

  /**
   * Generates fallback queries when main construction fails
   */
  private generateFallbackQueries(context: QueryContext): ConstructedQuery[] {
    const fallbackQueries: ConstructedQuery[] = [];

    // General MCP search
    fallbackQueries.push({
      query: 'Model Context Protocol MCP servers development tools',
      template: 'fallback-general',
      confidence: 0.3,
      expectedResults: 10,
      searchStrategy: 'fallback',
      metadata: {
        toolMatches: [],
        technologyMatches: [],
        categoryMatches: ['general'],
        reasoning: 'Fallback general MCP search'
      }
    });

    // Technology-specific fallback
    if (context.technologies.length > 0) {
      const primaryTech = context.technologies[0];
      if (primaryTech) {
        fallbackQueries.push({
          query: `MCP server ${primaryTech} Model Context Protocol`,
          template: 'fallback-technology',
          confidence: 0.4,
          expectedResults: 8,
          searchStrategy: 'fallback',
          metadata: {
            toolMatches: [],
            technologyMatches: [primaryTech],
            categoryMatches: [],
            reasoning: `Fallback technology search for ${primaryTech}`
          }
        });
      }
    }

    return fallbackQueries;
  }

  /**
   * Updates search history for optimization
   */
  private updateSearchHistory(queries: ConstructedQuery[]): void {
    for (const query of queries) {
      const key = query.template;
      const currentCount = this.searchHistory.get(key) || 0;
      this.searchHistory.set(key, currentCount + 1);
    }
  }

  /**
   * Calculates average confidence of queries
   */
  private calculateAverageConfidence(queries: ConstructedQuery[]): number {
    if (queries.length === 0) return 0;
    const totalConfidence = queries.reduce((sum, q) => sum + q.confidence, 0);
    return totalConfidence / queries.length;
  }

  /**
   * Tool pattern matching methods
   */
  private isFileSystemTool(toolName: string): boolean {
    const fsPatterns = ['file', 'dir', 'folder', 'path', 'read', 'write', 'copy', 'move', 'delete'];
    return fsPatterns.some(pattern => toolName.includes(pattern));
  }

  private isDatabaseTool(toolName: string): boolean {
    const dbPatterns = ['db', 'database', 'sql', 'query', 'table', 'record', 'data'];
    return dbPatterns.some(pattern => toolName.includes(pattern));
  }

  private isGitTool(toolName: string): boolean {
    const gitPatterns = ['git', 'commit', 'branch', 'merge', 'pull', 'push', 'repo'];
    return gitPatterns.some(pattern => toolName.includes(pattern));
  }

  private isAPITool(toolName: string): boolean {
    const apiPatterns = ['api', 'http', 'request', 'response', 'endpoint', 'rest', 'graphql'];
    return apiPatterns.some(pattern => toolName.includes(pattern));
  }

  /**
   * Initializes technology patterns
   */
  private initializeTechnologyPatterns(): void {
    this.technologyPatterns = [
      {
        name: 'nodejs',
        patterns: [/node/, /npm/, /javascript/, /typescript/, /js/, /ts/],
        category: 'runtime',
        priority: 90,
        queryTemplate: 'nodejs-mcp'
      },
      {
        name: 'python',
        patterns: [/python/, /pip/, /py/, /django/, /flask/, /fastapi/],
        category: 'runtime',
        priority: 90,
        queryTemplate: 'python-mcp'
      },
      {
        name: 'docker',
        patterns: [/docker/, /container/, /kubernetes/, /k8s/],
        category: 'deployment',
        priority: 85,
        queryTemplate: 'docker-mcp'
      },
      {
        name: 'database',
        patterns: [/postgres/, /mysql/, /mongodb/, /redis/, /sqlite/],
        category: 'data',
        priority: 80,
        queryTemplate: 'database-mcp'
      },
      {
        name: 'aws',
        patterns: [/aws/, /amazon/, /s3/, /ec2/, /lambda/],
        category: 'cloud',
        priority: 75,
        queryTemplate: 'aws-mcp'
      },
      {
        name: 'github',
        patterns: [/github/, /git/, /repo/, /repository/],
        category: 'version-control',
        priority: 80,
        queryTemplate: 'github-mcp'
      }
    ];
  }

  /**
   * Initializes tool category mapping
   */
  private initializeToolCategoryMap(): void {
    this.toolCategoryMap.set('filesystem', [
      'file', 'directory', 'folder', 'path', 'read', 'write', 'copy', 'move', 'delete'
    ]);
    
    this.toolCategoryMap.set('database', [
      'db', 'database', 'sql', 'query', 'table', 'record', 'data', 'store'
    ]);
    
    this.toolCategoryMap.set('version-control', [
      'git', 'commit', 'branch', 'merge', 'pull', 'push', 'repo', 'repository'
    ]);
    
    this.toolCategoryMap.set('api', [
      'api', 'http', 'request', 'response', 'endpoint', 'rest', 'graphql', 'webhook'
    ]);
    
    this.toolCategoryMap.set('testing', [
      'test', 'spec', 'mock', 'stub', 'assert', 'expect', 'coverage'
    ]);
    
    this.toolCategoryMap.set('deployment', [
      'deploy', 'build', 'release', 'publish', 'package', 'bundle'
    ]);
    
    this.toolCategoryMap.set('monitoring', [
      'log', 'metric', 'monitor', 'alert', 'trace', 'debug', 'profile'
    ]);
  }

  /**
   * Gets query construction statistics
   */
  getStats(): {
    totalQueriesConstructed: number;
    averageConfidence: number;
    mostUsedTemplates: Array<{ template: string; count: number }>;
    technologyPatterns: number;
  } {
    const totalQueries = Array.from(this.searchHistory.values()).reduce((sum, count) => sum + count, 0);
    const mostUsedTemplates = Array.from(this.searchHistory.entries())
      .map(([template, count]) => ({ template, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalQueriesConstructed: totalQueries,
      averageConfidence: 0.7, // This would be calculated from actual query results
      mostUsedTemplates,
      technologyPatterns: this.technologyPatterns?.length || 0
    };
  }
}

/**
 * Default query constructor instance
 */
export const defaultQueryConstructor = new QueryConstructor();

/**
 * Utility functions for query construction
 */
export const queryConstructorUtils = {
  /**
   * Quick query construction for simple use cases
   */
  async constructQuickQuery(toolNames: string[], technologies: string[]): Promise<string> {
    const context: QueryContext = {
      toolNames,
      categories: [],
      technologies,
      searchDepth: 'quick'
    };

    const queries = await defaultQueryConstructor.constructQueries(context);
    return queries.length > 0 && queries[0] ? queries[0].query : 'Model Context Protocol MCP servers';
  },

  /**
   * Constructs queries for a specific technology
   */
  async constructTechnologyQuery(technology: string): Promise<ConstructedQuery[]> {
    const context: QueryContext = {
      toolNames: [],
      categories: [],
      technologies: [technology],
      searchDepth: 'thorough'
    };

    return await defaultQueryConstructor.constructQueries(context);
  },

  /**
   * Constructs queries for a specific category
   */
  async constructCategoryQuery(category: string): Promise<ConstructedQuery[]> {
    const context: QueryContext = {
      toolNames: [],
      categories: [category],
      technologies: [],
      searchDepth: 'thorough'
    };

    return await defaultQueryConstructor.constructQueries(context);
  }
};

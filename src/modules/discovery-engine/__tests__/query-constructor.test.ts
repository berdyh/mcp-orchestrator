/**
 * Query Constructor Tests
 * 
 * Comprehensive tests for the QueryConstructor class and its functionality.
 */

import { QueryConstructor, queryConstructorUtils } from '../query-constructor';
import type { QueryContext, ConstructedQuery } from '../query-constructor';

describe('QueryConstructor', () => {
  let queryConstructor: QueryConstructor;

  beforeEach(() => {
    queryConstructor = new QueryConstructor();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(queryConstructor).toBeInstanceOf(QueryConstructor);
    });

    it('should have initialized technology patterns', () => {
      const stats = queryConstructor.getStats();
      expect(stats.technologyPatterns).toBeGreaterThan(0);
    });
  });

  describe('constructQueries', () => {
    it('should construct queries for basic tool names', async () => {
      const context: QueryContext = {
        toolNames: ['file-reader', 'database-query'],
        categories: ['filesystem', 'database'],
        technologies: ['nodejs'],
        searchDepth: 'quick'
      };

      const queries = await queryConstructor.constructQueries(context);
      
      expect(queries).toBeDefined();
      expect(queries.length).toBeGreaterThan(0);
      expect(queries[0]).toHaveProperty('query');
      expect(queries[0]).toHaveProperty('confidence');
      expect(queries[0]).toHaveProperty('metadata');
    });

    it('should handle empty tool names gracefully', async () => {
      const context: QueryContext = {
        toolNames: [],
        categories: [],
        technologies: ['nodejs'],
        searchDepth: 'quick'
      };

      const queries = await queryConstructor.constructQueries(context);
      
      expect(queries).toBeDefined();
      expect(queries.length).toBeGreaterThan(0);
    });

    it('should generate technology-specific queries', async () => {
      const context: QueryContext = {
        toolNames: [],
        categories: [],
        technologies: ['python', 'docker'],
        searchDepth: 'thorough'
      };

      const queries = await queryConstructor.constructQueries(context);
      
      expect(queries).toBeDefined();
      expect(queries.length).toBeGreaterThan(0);
      
      // Should have queries for both technologies
      const hasPythonQuery = queries.some(q => 
        q.metadata.technologyMatches.includes('python')
      );
      const hasDockerQuery = queries.some(q => 
        q.metadata.technologyMatches.includes('docker')
      );
      
      expect(hasPythonQuery).toBe(true);
      expect(hasDockerQuery).toBe(true);
    });

    it('should generate category-specific queries', async () => {
      const context: QueryContext = {
        toolNames: [],
        categories: ['filesystem', 'database'],
        technologies: [],
        searchDepth: 'thorough'
      };

      const queries = await queryConstructor.constructQueries(context);
      
      expect(queries).toBeDefined();
      expect(queries.length).toBeGreaterThan(0);
      
      // Should have queries for both categories
      const hasFilesystemQuery = queries.some(q => 
        q.metadata.categoryMatches.includes('filesystem')
      );
      const hasDatabaseQuery = queries.some(q => 
        q.metadata.categoryMatches.includes('database')
      );
      
      expect(hasFilesystemQuery).toBe(true);
      expect(hasDatabaseQuery).toBe(true);
    });

    it('should generate multi-tool queries when multiple tools are provided', async () => {
      const context: QueryContext = {
        toolNames: ['file-reader', 'database-query', 'api-caller'],
        categories: [],
        technologies: [],
        searchDepth: 'thorough'
      };

      const queries = await queryConstructor.constructQueries(context);
      
      expect(queries).toBeDefined();
      expect(queries.length).toBeGreaterThan(0);
      
      // Should have a multi-tool query
      const hasMultiToolQuery = queries.some(q => 
        q.template === 'multi-tool'
      );
      
      expect(hasMultiToolQuery).toBe(true);
    });

    it('should respect search depth for quick searches', async () => {
      const context: QueryContext = {
        toolNames: ['file-reader', 'database-query', 'api-caller', 'git-ops'],
        categories: ['filesystem', 'database', 'api', 'version-control'],
        technologies: ['nodejs', 'python', 'docker'],
        searchDepth: 'quick'
      };

      const queries = await queryConstructor.constructQueries(context);
      
      expect(queries).toBeDefined();
      expect(queries.length).toBeLessThanOrEqual(3); // Quick search should limit results
    });

    it('should handle user preferences', async () => {
      const context: QueryContext = {
        toolNames: ['file-reader'],
        categories: ['filesystem'],
        technologies: ['nodejs'],
        searchDepth: 'thorough',
        userPreferences: {
          excludeCategories: ['testing'],
          minConfidence: 0.7
        }
      };

      const queries = await queryConstructor.constructQueries(context);
      
      expect(queries).toBeDefined();
      expect(queries.length).toBeGreaterThan(0);
    });

    it('should generate fallback queries when construction fails', async () => {
      // Mock a scenario that would cause construction to fail
      const context: QueryContext = {
        toolNames: [],
        categories: [],
        technologies: [],
        searchDepth: 'quick'
      };

      const queries = await queryConstructor.constructQueries(context);
      
      expect(queries).toBeDefined();
      expect(queries.length).toBeGreaterThan(0);
      
      // Should have at least one fallback query
      const hasFallbackQuery = queries.some(q => 
        q.searchStrategy === 'fallback'
      );
      
      expect(hasFallbackQuery).toBe(true);
    });
  });

  describe('tool analysis', () => {
    it('should correctly identify filesystem tools', async () => {
      const context: QueryContext = {
        toolNames: ['file-reader', 'directory-lister', 'path-resolver'],
        categories: [],
        technologies: [],
        searchDepth: 'quick'
      };

      const queries = await queryConstructor.constructQueries(context);
      
      expect(queries).toBeDefined();
      
      // Should have filesystem-related queries
      const hasFilesystemQuery = queries.some(q => 
        q.metadata.categoryMatches.includes('filesystem') ||
        q.query.toLowerCase().includes('file')
      );
      
      expect(hasFilesystemQuery).toBe(true);
    });

    it('should correctly identify database tools', async () => {
      const context: QueryContext = {
        toolNames: ['sql-query', 'database-connection', 'table-reader'],
        categories: [],
        technologies: [],
        searchDepth: 'quick'
      };

      const queries = await queryConstructor.constructQueries(context);
      
      expect(queries).toBeDefined();
      
      // Should have database-related queries
      const hasDatabaseQuery = queries.some(q => 
        q.metadata.categoryMatches.includes('database') ||
        q.query.toLowerCase().includes('database')
      );
      
      expect(hasDatabaseQuery).toBe(true);
    });

    it('should correctly identify git tools', async () => {
      const context: QueryContext = {
        toolNames: ['git-commit', 'branch-manager', 'repo-cloner'],
        categories: [],
        technologies: [],
        searchDepth: 'quick'
      };

      const queries = await queryConstructor.constructQueries(context);
      
      expect(queries).toBeDefined();
      
      // Should have git-related queries
      const hasGitQuery = queries.some(q => 
        q.metadata.categoryMatches.includes('version-control') ||
        q.query.toLowerCase().includes('git')
      );
      
      expect(hasGitQuery).toBe(true);
    });

    it('should correctly identify API tools', async () => {
      const context: QueryContext = {
        toolNames: ['http-client', 'rest-api', 'endpoint-tester'],
        categories: [],
        technologies: [],
        searchDepth: 'quick'
      };

      const queries = await queryConstructor.constructQueries(context);
      
      expect(queries).toBeDefined();
      
      // Should have API-related queries
      const hasApiQuery = queries.some(q => 
        q.metadata.categoryMatches.includes('api') ||
        q.query.toLowerCase().includes('api')
      );
      
      expect(hasApiQuery).toBe(true);
    });
  });

  describe('technology analysis', () => {
    it('should map common technology names correctly', async () => {
      const context: QueryContext = {
        toolNames: [],
        categories: [],
        technologies: ['node', 'javascript', 'typescript'],
        searchDepth: 'quick'
      };

      const queries = await queryConstructor.constructQueries(context);
      
      expect(queries).toBeDefined();
      
      // Should have nodejs-related queries
      const hasNodejsQuery = queries.some(q => 
        q.metadata.technologyMatches.includes('nodejs')
      );
      
      expect(hasNodejsQuery).toBe(true);
    });

    it('should handle Python technologies', async () => {
      const context: QueryContext = {
        toolNames: [],
        categories: [],
        technologies: ['python', 'django', 'flask'],
        searchDepth: 'quick'
      };

      const queries = await queryConstructor.constructQueries(context);
      
      expect(queries).toBeDefined();
      
      // Should have python-related queries
      const hasPythonQuery = queries.some(q => 
        q.metadata.technologyMatches.includes('python')
      );
      
      expect(hasPythonQuery).toBe(true);
    });

    it('should handle Docker technologies', async () => {
      const context: QueryContext = {
        toolNames: [],
        categories: [],
        technologies: ['docker', 'kubernetes', 'container'],
        searchDepth: 'quick'
      };

      const queries = await queryConstructor.constructQueries(context);
      
      expect(queries).toBeDefined();
      
      // Should have docker-related queries
      const hasDockerQuery = queries.some(q => 
        q.metadata.technologyMatches.includes('docker')
      );
      
      expect(hasDockerQuery).toBe(true);
    });
  });

  describe('query optimization', () => {
    it('should sort queries by confidence', async () => {
      const context: QueryContext = {
        toolNames: ['file-reader', 'database-query'],
        categories: ['filesystem', 'database'],
        technologies: ['nodejs'],
        searchDepth: 'thorough'
      };

      const queries = await queryConstructor.constructQueries(context);
      
      expect(queries).toBeDefined();
      expect(queries.length).toBeGreaterThan(1);
      
      // Should be sorted by confidence (highest first)
      for (let i = 0; i < queries.length - 1; i++) {
        expect(queries[i].confidence).toBeGreaterThanOrEqual(queries[i + 1].confidence);
      }
    });

    it('should limit results for quick search', async () => {
      const context: QueryContext = {
        toolNames: ['file-reader', 'database-query', 'api-caller', 'git-ops', 'test-runner'],
        categories: ['filesystem', 'database', 'api', 'version-control', 'testing'],
        technologies: ['nodejs', 'python', 'docker'],
        searchDepth: 'quick'
      };

      const queries = await queryConstructor.constructQueries(context);
      
      expect(queries).toBeDefined();
      expect(queries.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getStats', () => {
    it('should return statistics', () => {
      const stats = queryConstructor.getStats();
      
      expect(stats).toHaveProperty('totalQueriesConstructed');
      expect(stats).toHaveProperty('averageConfidence');
      expect(stats).toHaveProperty('mostUsedTemplates');
      expect(stats).toHaveProperty('technologyPatterns');
      
      expect(typeof stats.totalQueriesConstructed).toBe('number');
      expect(typeof stats.averageConfidence).toBe('number');
      expect(Array.isArray(stats.mostUsedTemplates)).toBe(true);
      expect(typeof stats.technologyPatterns).toBe('number');
    });
  });
});

describe('queryConstructorUtils', () => {
  describe('constructQuickQuery', () => {
    it('should construct a quick query for simple use cases', async () => {
      const query = await queryConstructorUtils.constructQuickQuery(
        ['file-reader'],
        ['nodejs']
      );
      
      expect(query).toBeDefined();
      expect(typeof query).toBe('string');
      expect(query.length).toBeGreaterThan(0);
    });

    it('should handle empty inputs gracefully', async () => {
      const query = await queryConstructorUtils.constructQuickQuery([], []);
      
      expect(query).toBeDefined();
      expect(typeof query).toBe('string');
      expect(query.length).toBeGreaterThan(0);
    });
  });

  describe('constructTechnologyQuery', () => {
    it('should construct queries for a specific technology', async () => {
      const queries = await queryConstructorUtils.constructTechnologyQuery('nodejs');
      
      expect(queries).toBeDefined();
      expect(Array.isArray(queries)).toBe(true);
      expect(queries.length).toBeGreaterThan(0);
      
      // Should have nodejs-related queries
      const hasNodejsQuery = queries.some(q => 
        q.metadata.technologyMatches.includes('nodejs')
      );
      
      expect(hasNodejsQuery).toBe(true);
    });
  });

  describe('constructCategoryQuery', () => {
    it('should construct queries for a specific category', async () => {
      const queries = await queryConstructorUtils.constructCategoryQuery('filesystem');
      
      expect(queries).toBeDefined();
      expect(Array.isArray(queries)).toBe(true);
      expect(queries.length).toBeGreaterThan(0);
      
      // Should have filesystem-related queries
      const hasFilesystemQuery = queries.some(q => 
        q.metadata.categoryMatches.includes('filesystem')
      );
      
      expect(hasFilesystemQuery).toBe(true);
    });
  });
});

describe('QueryConstructor Integration', () => {
  let queryConstructor: QueryConstructor;

  beforeEach(() => {
    queryConstructor = new QueryConstructor();
  });

  it('should handle complex real-world scenarios', async () => {
    const context: QueryContext = {
      toolNames: [
        'file-reader',
        'sql-query-executor',
        'git-commit-hook',
        'http-api-client',
        'docker-container-manager'
      ],
      categories: [
        'filesystem',
        'database',
        'version-control',
        'api',
        'deployment'
      ],
      technologies: [
        'nodejs',
        'python',
        'docker',
        'postgresql'
      ],
      searchDepth: 'thorough',
      userPreferences: {
        excludeCategories: ['testing'],
        minConfidence: 0.5
      }
    };

    const queries = await queryConstructor.constructQueries(context);
    
    expect(queries).toBeDefined();
    expect(queries.length).toBeGreaterThan(0);
    
    // Should have queries for multiple categories
    const categories = new Set<string>();
    queries.forEach(q => {
      q.metadata.categoryMatches.forEach(cat => categories.add(cat));
    });
    
    expect(categories.size).toBeGreaterThan(1);
    
    // Should have queries for multiple technologies
    const technologies = new Set<string>();
    queries.forEach(q => {
      q.metadata.technologyMatches.forEach(tech => technologies.add(tech));
    });
    
    expect(technologies.size).toBeGreaterThan(1);
    
    // All queries should have reasonable confidence scores
    queries.forEach(q => {
      expect(q.confidence).toBeGreaterThanOrEqual(0);
      expect(q.confidence).toBeLessThanOrEqual(1);
    });
  });

  it('should maintain query quality across different search depths', async () => {
    const baseContext: QueryContext = {
      toolNames: ['file-reader', 'database-query', 'api-caller'],
      categories: ['filesystem', 'database', 'api'],
      technologies: ['nodejs', 'python'],
      searchDepth: 'quick'
    };

    const quickQueries = await queryConstructor.constructQueries(baseContext);
    
    const thoroughContext = { ...baseContext, searchDepth: 'thorough' as const };
    const thoroughQueries = await queryConstructor.constructQueries(thoroughContext);
    
    expect(quickQueries.length).toBeLessThanOrEqual(thoroughQueries.length);
    
    // Quick queries should be a subset of thorough queries (or at least not exceed them)
    expect(quickQueries.length).toBeLessThanOrEqual(3);
    expect(thoroughQueries.length).toBeGreaterThanOrEqual(quickQueries.length);
  });
});

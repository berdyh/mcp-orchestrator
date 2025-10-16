/**
 * Unit tests for MCP Registry module
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { MCPRegistry, createRegistry, createRegistryEntry, MCPRegistryEntrySchema } from '../registry';
import { MCPRegistryEntry } from '../../types/mcp';

// Mock the logger to avoid console output during tests
jest.mock('../../utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('MCPRegistry', () => {
  let registry: MCPRegistry;
  let tempDir: string;
  let tempFile: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `mcp-registry-test-${Date.now()}`);
    tempFile = join(tempDir, 'registry.json');
    
    registry = new MCPRegistry({
      storageType: 'json',
      storagePath: tempFile,
      cacheTTL: 1, // 1 second for testing
      maxEntries: 100
    });
    
    await registry.initialize();
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Registry Initialization', () => {
    it('should initialize with empty cache when no storage file exists', async () => {
      const stats = await registry.getStats();
      expect(stats.totalEntries).toBe(0);
    });

    it('should load existing entries from storage file', async () => {
      // Create a test entry
      const testEntry = createRegistryEntry({
        id: 'test-mcp-1',
        name: 'Test MCP',
        category: ['testing'],
        repository: 'https://github.com/test/mcp',
        installCommand: 'npm install test-mcp',
        configurationSchema: {},
        requiredCredentials: [],
        documentationUrl: 'https://docs.test.com',
        examples: ['example1'],
        source: 'test',
        confidence: 0.9
      });

      await registry.addEntry(testEntry);
      
      // Create a new registry instance to test loading
      const newRegistry = new MCPRegistry({
        storageType: 'json',
        storagePath: tempFile,
        cacheTTL: 1,
        maxEntries: 100
      });
      
      await newRegistry.initialize();
      const stats = await newRegistry.getStats();
      expect(stats.totalEntries).toBe(1);
    });
  });

  describe('Entry Management', () => {
    it('should add and retrieve entries', async () => {
      const testEntry = createRegistryEntry({
        id: 'test-mcp-1',
        name: 'Test MCP',
        category: ['testing'],
        repository: 'https://github.com/test/mcp',
        installCommand: 'npm install test-mcp',
        configurationSchema: {},
        requiredCredentials: [],
        documentationUrl: 'https://docs.test.com',
        examples: ['example1'],
        source: 'test',
        confidence: 0.9
      });

      await registry.addEntry(testEntry);
      
      const retrieved = await registry.getEntry('test-mcp-1');
      expect(retrieved).toBeDefined();
      expect(retrieved!.name).toBe('Test MCP');
      expect(retrieved!.id).toBe('test-mcp-1');
    });

    it('should update existing entries', async () => {
      const testEntry = createRegistryEntry({
        id: 'test-mcp-1',
        name: 'Test MCP',
        category: ['testing'],
        repository: 'https://github.com/test/mcp',
        installCommand: 'npm install test-mcp',
        configurationSchema: {},
        requiredCredentials: [],
        documentationUrl: 'https://docs.test.com',
        examples: ['example1'],
        source: 'test',
        confidence: 0.9
      });

      await registry.addEntry(testEntry);
      
      // Update the entry
      const updatedEntry = {
        ...testEntry,
        name: 'Updated Test MCP',
        category: ['testing', 'updated']
      };
      
      await registry.addEntry(updatedEntry);
      
      const retrieved = await registry.getEntry('test-mcp-1');
      expect(retrieved!.name).toBe('Updated Test MCP');
      expect(retrieved!.category).toEqual(['testing', 'updated']);
    });

    it('should remove entries', async () => {
      const testEntry = createRegistryEntry({
        id: 'test-mcp-1',
        name: 'Test MCP',
        category: ['testing'],
        repository: 'https://github.com/test/mcp',
        installCommand: 'npm install test-mcp',
        configurationSchema: {},
        requiredCredentials: [],
        documentationUrl: 'https://docs.test.com',
        examples: ['example1'],
        source: 'test',
        confidence: 0.9
      });

      await registry.addEntry(testEntry);
      
      const removed = await registry.removeEntry('test-mcp-1');
      expect(removed).toBe(true);
      
      const retrieved = await registry.getEntry('test-mcp-1');
      expect(retrieved).toBeNull();
    });

    it('should return false when removing non-existent entry', async () => {
      const removed = await registry.removeEntry('non-existent');
      expect(removed).toBe(false);
    });

    it('should clear all entries', async () => {
      // Add multiple entries
      for (let i = 1; i <= 3; i++) {
        const testEntry = createRegistryEntry({
          id: `test-mcp-${i}`,
          name: `Test MCP ${i}`,
          category: ['testing'],
          repository: `https://github.com/test/mcp${i}`,
          installCommand: `npm install test-mcp${i}`,
          configurationSchema: {},
          requiredCredentials: [],
          documentationUrl: `https://docs.test${i}.com`,
          examples: [`example${i}`],
          source: 'test',
          confidence: 0.9
        });
        await registry.addEntry(testEntry);
      }
      
      await registry.clear();
      
      const stats = await registry.getStats();
      expect(stats.totalEntries).toBe(0);
    });
  });

  describe('Search Functionality', () => {
    beforeEach(async () => {
      // Add test entries
      const entries = [
        createRegistryEntry({
          id: 'npm-mcp',
          name: 'NPM MCP',
          category: ['package-management', 'javascript'],
          repository: 'https://github.com/npm/mcp',
          installCommand: 'npm install npm-mcp',
          configurationSchema: {},
          requiredCredentials: [],
          documentationUrl: 'https://docs.npm.com',
          examples: ['npm install'],
          source: 'npm',
          confidence: 0.95
        }),
        createRegistryEntry({
          id: 'git-mcp',
          name: 'Git MCP',
          category: ['version-control', 'git'],
          repository: 'https://github.com/git/mcp',
          installCommand: 'npm install git-mcp',
          configurationSchema: {},
          requiredCredentials: [],
          documentationUrl: 'https://docs.git.com',
          examples: ['git clone'],
          source: 'git',
          confidence: 0.9
        }),
        createRegistryEntry({
          id: 'python-mcp',
          name: 'Python MCP',
          category: ['python', 'package-management'],
          repository: 'https://github.com/python/mcp',
          installCommand: 'pip install python-mcp',
          configurationSchema: {},
          requiredCredentials: [],
          documentationUrl: 'https://docs.python.com',
          examples: ['pip install'],
          source: 'python',
          confidence: 0.85
        })
      ];

      for (const entry of entries) {
        await registry.addEntry(entry);
      }
    });

    it('should search by category', async () => {
      const results = await registry.searchEntries({ category: 'package-management' });
      expect(results).toHaveLength(2);
      expect(results.map(r => r.name)).toContain('NPM MCP');
      expect(results.map(r => r.name)).toContain('Python MCP');
    });

    it('should search by name', async () => {
      const results = await registry.searchEntries({ name: 'git' });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Git MCP');
    });

    it('should search by repository', async () => {
      const results = await registry.searchEntries({ repository: 'github.com/npm' });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('NPM MCP');
    });

    it('should filter by minimum confidence', async () => {
      const results = await registry.searchEntries({ minConfidence: 0.9 });
      expect(results).toHaveLength(2);
      expect(results.map(r => r.name)).toContain('NPM MCP');
      expect(results.map(r => r.name)).toContain('Git MCP');
    });

    it('should limit results', async () => {
      const results = await registry.searchEntries({ limit: 2 });
      expect(results).toHaveLength(2);
    });

    it('should sort results by confidence and success rate', async () => {
      const results = await registry.searchEntries({});
      expect(results).toHaveLength(3);
      // Should be sorted by combined score (confidence * 0.7 + successRate * 0.3)
      expect(results[0].name).toBe('NPM MCP'); // Highest confidence
    });
  });

  describe('Usage Statistics', () => {
    it('should update usage statistics', async () => {
      const testEntry = createRegistryEntry({
        id: 'test-mcp-1',
        name: 'Test MCP',
        category: ['testing'],
        repository: 'https://github.com/test/mcp',
        installCommand: 'npm install test-mcp',
        configurationSchema: {},
        requiredCredentials: [],
        documentationUrl: 'https://docs.test.com',
        examples: ['example1'],
        source: 'test',
        confidence: 0.9
      });

      await registry.addEntry(testEntry);
      
      // Update usage stats with success
      await registry.updateUsageStats('test-mcp-1', true);
      
      const entry = await registry.getEntry('test-mcp-1');
      expect(entry!.usageStats.timesUsed).toBe(1);
      expect(entry!.usageStats.averageSuccessRate).toBe(1.0);
      
      // Update usage stats with failure
      await registry.updateUsageStats('test-mcp-1', false);
      
      const updatedEntry = await registry.getEntry('test-mcp-1');
      expect(updatedEntry!.usageStats.timesUsed).toBe(2);
      expect(updatedEntry!.usageStats.averageSuccessRate).toBe(0.5);
    });

    it('should handle updating stats for non-existent entry', async () => {
      // Should not throw error
      await expect(registry.updateUsageStats('non-existent', true)).resolves.not.toThrow();
    });
  });

  describe('Statistics', () => {
    it('should return correct statistics', async () => {
      const entries = [
        createRegistryEntry({
          id: 'mcp-1',
          name: 'MCP 1',
          category: ['category1', 'category2'],
          repository: 'https://github.com/test/mcp1',
          installCommand: 'npm install mcp1',
          configurationSchema: {},
          requiredCredentials: [],
          documentationUrl: 'https://docs.test.com',
          examples: ['example1'],
          source: 'test',
          confidence: 0.8
        }),
        createRegistryEntry({
          id: 'mcp-2',
          name: 'MCP 2',
          category: ['category2', 'category3'],
          repository: 'https://github.com/test/mcp2',
          installCommand: 'npm install mcp2',
          configurationSchema: {},
          requiredCredentials: [],
          documentationUrl: 'https://docs.test.com',
          examples: ['example2'],
          source: 'test',
          confidence: 0.9
        })
      ];

      for (const entry of entries) {
        await registry.addEntry(entry);
      }

      const stats = await registry.getStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.categories).toEqual({
        category1: 1,
        category2: 2,
        category3: 1
      });
      expect(stats.averageConfidence).toBeCloseTo(0.85, 2);
      expect(stats.averageSuccessRate).toBe(0);
    });
  });

  describe('Cache Management', () => {
    it('should refresh cache when TTL expires', async () => {
      const testEntry = createRegistryEntry({
        id: 'test-mcp-1',
        name: 'Test MCP',
        category: ['testing'],
        repository: 'https://github.com/test/mcp',
        installCommand: 'npm install test-mcp',
        configurationSchema: {},
        requiredCredentials: [],
        documentationUrl: 'https://docs.test.com',
        examples: ['example1'],
        source: 'test',
        confidence: 0.9
      });

      await registry.addEntry(testEntry);
      
      // Wait for TTL to expire (1 second)
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Access should trigger cache refresh
      const entry = await registry.getEntry('test-mcp-1');
      expect(entry).toBeDefined();
    });
  });

  describe('Data Validation', () => {
    it('should validate entry data when adding', async () => {
      const invalidEntry = {
        id: '', // Invalid: empty string
        name: 'Test MCP',
        category: ['testing'],
        repository: 'not-a-url', // Invalid: not a URL
        installCommand: 'npm install test-mcp',
        configurationSchema: {},
        requiredCredentials: [],
        documentationUrl: 'https://docs.test.com',
        examples: ['example1'],
        discoveryMetadata: {
          source: 'test',
          discoveredAt: new Date().toISOString(),
          confidence: 0.9,
          lastVerified: new Date().toISOString()
        },
        usageStats: {
          timesUsed: 0,
          lastUsed: new Date().toISOString(),
          averageSuccessRate: 0
        }
      };

      await expect(registry.addEntry(invalidEntry as any)).rejects.toThrow();
    });

    it('should skip invalid entries when loading from storage', async () => {
      // Create invalid JSON data
      const invalidData = [
        {
          id: 'valid-entry',
          name: 'Valid Entry',
          category: ['testing'],
          repository: 'https://github.com/test/valid',
          installCommand: 'npm install valid',
          configurationSchema: {},
          requiredCredentials: [],
          documentationUrl: 'https://docs.test.com',
          examples: ['example1'],
          discoveryMetadata: {
            source: 'test',
            discoveredAt: new Date().toISOString(),
            confidence: 0.9,
            lastVerified: new Date().toISOString()
          },
          usageStats: {
            timesUsed: 0,
            lastUsed: new Date().toISOString(),
            averageSuccessRate: 0
          }
        },
        {
          id: '', // Invalid entry
          name: 'Invalid Entry',
          // Missing required fields
        }
      ];

      await fs.writeFile(tempFile, JSON.stringify(invalidData, null, 2));
      
      // Create new registry instance to test loading
      const newRegistry = new MCPRegistry({
        storageType: 'json',
        storagePath: tempFile,
        cacheTTL: 1,
        maxEntries: 100
      });
      
      await newRegistry.initialize();
      const stats = await newRegistry.getStats();
      expect(stats.totalEntries).toBe(1); // Only valid entry should be loaded
    });
  });
});

describe('createRegistry', () => {
  it('should create registry with default config', () => {
    const registry = createRegistry();
    expect(registry).toBeInstanceOf(MCPRegistry);
  });

  it('should create registry with custom config', () => {
    const registry = createRegistry({
      storageType: 'json',
      storagePath: '/custom/path.json',
      cacheTTL: 3600
    });
    expect(registry).toBeInstanceOf(MCPRegistry);
  });
});

describe('createRegistryEntry', () => {
  it('should create valid registry entry', () => {
    const entry = createRegistryEntry({
      id: 'test-mcp',
      name: 'Test MCP',
      category: ['testing'],
      repository: 'https://github.com/test/mcp',
      installCommand: 'npm install test-mcp',
      configurationSchema: { port: { type: 'number' } },
      requiredCredentials: [
        {
          keyName: 'API_KEY',
          envVarName: 'TEST_API_KEY',
          description: 'Test API key',
          optional: false
        }
      ],
      documentationUrl: 'https://docs.test.com',
      examples: ['example1', 'example2'],
      source: 'test',
      confidence: 0.9
    });

    expect(entry.id).toBe('test-mcp');
    expect(entry.name).toBe('Test MCP');
    expect(entry.category).toEqual(['testing']);
    expect(entry.repository).toBe('https://github.com/test/mcp');
    expect(entry.installCommand).toBe('npm install test-mcp');
    expect(entry.configurationSchema).toEqual({ port: { type: 'number' } });
    expect(entry.requiredCredentials).toHaveLength(1);
    expect(entry.documentationUrl).toBe('https://docs.test.com');
    expect(entry.examples).toEqual(['example1', 'example2']);
    expect(entry.discoveryMetadata.source).toBe('test');
    expect(entry.discoveryMetadata.confidence).toBe(0.9);
    expect(entry.usageStats.timesUsed).toBe(0);
    expect(entry.usageStats.averageSuccessRate).toBe(0);
  });

  it('should set timestamps correctly', () => {
    const before = new Date();
    const entry = createRegistryEntry({
      id: 'test-mcp',
      name: 'Test MCP',
      category: ['testing'],
      repository: 'https://github.com/test/mcp',
      installCommand: 'npm install test-mcp',
      configurationSchema: {},
      requiredCredentials: [],
      documentationUrl: 'https://docs.test.com',
      examples: ['example1'],
      source: 'test',
      confidence: 0.9
    });
    const after = new Date();

    const discoveredAt = new Date(entry.discoveryMetadata.discoveredAt);
    const lastVerified = new Date(entry.discoveryMetadata.lastVerified);
    const lastUsed = new Date(entry.usageStats.lastUsed);

    expect(discoveredAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(discoveredAt.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(lastVerified.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(lastVerified.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(lastUsed.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(lastUsed.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

describe('MCPRegistryEntrySchema', () => {
  it('should validate correct registry entry', () => {
    const validEntry = {
      id: 'test-mcp',
      name: 'Test MCP',
      category: ['testing'],
      repository: 'https://github.com/test/mcp',
      installCommand: 'npm install test-mcp',
      configurationSchema: {},
      requiredCredentials: [],
      documentationUrl: 'https://docs.test.com',
      examples: ['example1'],
      discoveryMetadata: {
        source: 'test',
        discoveredAt: new Date().toISOString(),
        confidence: 0.9,
        lastVerified: new Date().toISOString()
      },
      usageStats: {
        timesUsed: 0,
        lastUsed: new Date().toISOString(),
        averageSuccessRate: 0
      }
    };

    expect(() => MCPRegistryEntrySchema.parse(validEntry)).not.toThrow();
  });

  it('should reject invalid registry entry', () => {
    const invalidEntry = {
      id: '', // Invalid: empty string
      name: 'Test MCP',
      category: ['testing'],
      repository: 'not-a-url', // Invalid: not a URL
      installCommand: 'npm install test-mcp',
      configurationSchema: {},
      requiredCredentials: [],
      documentationUrl: 'https://docs.test.com',
      examples: ['example1'],
      discoveryMetadata: {
        source: 'test',
        discoveredAt: new Date().toISOString(),
        confidence: 0.9,
        lastVerified: new Date().toISOString()
      },
      usageStats: {
        timesUsed: 0,
        lastUsed: new Date().toISOString(),
        averageSuccessRate: 0
      }
    };

    expect(() => MCPRegistryEntrySchema.parse(invalidEntry)).toThrow();
  });
});

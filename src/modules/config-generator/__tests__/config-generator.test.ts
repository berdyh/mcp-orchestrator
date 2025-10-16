/**
 * Configuration Generator Tests
 * 
 * Tests for the MCP configuration generator module.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MCPConfigGenerator } from '../index.js';
import { FileSystemManager } from '../file-system-manager.js';
import { TemplateEngine } from '../template-engine.js';
import { EnvironmentManager } from '../environment-manager.js';
import { ConfigGenerator } from '../config-generator.js';
import type { MCPConfigGenerationRequest } from '../types.js';

// Simple test without complex mocks for now

describe('MCPConfigGenerator', () => {
  let configGenerator: MCPConfigGenerator;

  beforeEach(() => {
    configGenerator = new MCPConfigGenerator();
  });

  describe('listTemplates', () => {
    it('should list available templates', async () => {
      const result = await configGenerator.listTemplates();

      expect(result.templates).toBeDefined();
      expect(Array.isArray(result.templates)).toBe(true);
      expect(result.environments).toBeDefined();
      expect(Array.isArray(result.environments)).toBe(true);
    });
  });
});

describe('FileSystemManager', () => {
  let fsManager: FileSystemManager;

  beforeEach(() => {
    fsManager = new FileSystemManager();
  });

  describe('generateConfigFilePath', () => {
    it('should generate valid file path', async () => {
      const path = await fsManager.generateConfigFilePath('test-task', 'custom');

      expect(path).toContain('test-task');
      expect(path).toContain('custom');
      expect(path).toContain('.json');
    });
  });
});

describe('TemplateEngine', () => {
  let templateEngine: TemplateEngine;

  beforeEach(() => {
    templateEngine = new TemplateEngine();
  });

  describe('listAvailableTemplates', () => {
    it('should list available templates', async () => {
      const templates = await templateEngine.listAvailableTemplates();

      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
    });
  });
});

describe('EnvironmentManager', () => {
  let envManager: EnvironmentManager;

  beforeEach(() => {
    envManager = new EnvironmentManager();
  });

  describe('getSupportedEnvironments', () => {
    it('should return supported environments', () => {
      const environments = envManager.getSupportedEnvironments();

      expect(Array.isArray(environments)).toBe(true);
      expect(environments).toContain('claude-desktop');
      expect(environments).toContain('cursor');
      expect(environments).toContain('custom');
    });
  });

  describe('isEnvironmentSupported', () => {
    it('should check if environment is supported', () => {
      expect(envManager.isEnvironmentSupported('claude-desktop')).toBe(true);
      expect(envManager.isEnvironmentSupported('cursor')).toBe(true);
      expect(envManager.isEnvironmentSupported('custom')).toBe(true);
      expect(envManager.isEnvironmentSupported('unsupported')).toBe(false);
    });
  });
});

describe('ConfigGenerator', () => {
  let configGen: ConfigGenerator;

  beforeEach(() => {
    configGen = new ConfigGenerator();
  });

  describe('determineMCPType', () => {
    it('should determine MCP type from metadata', () => {
      const metadata = {
        id: 'test-mcp',
        name: 'Filesystem MCP',
        category: ['filesystem'],
        repository: 'https://github.com/test/mcp',
        installCommand: 'npm install test-mcp',
        configurationSchema: {},
        requiredCredentials: [],
        documentationUrl: 'https://docs.test.com/mcp',
        examples: ['test example'],
        discoveryMetadata: {
          source: 'test',
          discoveredAt: '2024-01-01T00:00:00.000Z',
          confidence: 0.9,
          lastVerified: '2024-01-01T00:00:00.000Z'
        },
        usageStats: {
          timesUsed: 0,
          lastUsed: '2024-01-01T00:00:00.000Z',
          averageSuccessRate: 1.0
        }
      };

      const type = configGen.determineMCPType(metadata);

      expect(type).toBe('filesystem');
    });
  });
});

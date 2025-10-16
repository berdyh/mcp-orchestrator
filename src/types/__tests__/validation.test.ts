/**
 * Unit tests for data validation schemas
 */

import { describe, it, expect } from '@jest/globals';
import {
  // MCP schemas
  CredentialRequirementSchema,
  DiscoveryMetadataSchema,
  UsageStatsSchema,
  MCPRegistryEntrySchema,
  AttachedMCPSchema,
  MCPDiscoveryResultSchema,
  MCPIntegrationCodeSchema
} from '../mcp';

import {
  // Credential schemas
  CredentialStorageMethodSchema,
  CredentialStorageConfigSchema,
  StoredCredentialSchema,
  CredentialRequestSchema,
  CredentialStorageResultSchema,
  CredentialValidationResultSchema,
  EncryptionConfigSchema,
  SecurityAuditEntrySchema
} from '../credential';

import {
  // Task schemas
  DetectedToolSchema,
  TaskAnalysisResultSchema,
  SubtaskSchema,
  TaskSchema,
  SubtaskMCPMappingSchema,
  TaskPlanInputSchema,
  MCPAttachmentResultSchema
} from '../task';

describe('MCP Validation Schemas', () => {
  describe('CredentialRequirementSchema', () => {
    it('should validate correct credential requirement', () => {
      const validCredential = {
        keyName: 'API_KEY',
        envVarName: 'MY_API_KEY',
        description: 'API key for external service',
        optional: false,
        obtainUrl: 'https://example.com/api-key',
        validationPattern: /^[A-Z0-9]{32}$/
      };

      expect(() => CredentialRequirementSchema.parse(validCredential)).not.toThrow();
    });

    it('should validate credential requirement without optional fields', () => {
      const validCredential = {
        keyName: 'API_KEY',
        envVarName: 'MY_API_KEY',
        description: 'API key for external service',
        optional: true
      };

      expect(() => CredentialRequirementSchema.parse(validCredential)).not.toThrow();
    });

    it('should reject invalid credential requirement', () => {
      const invalidCredential = {
        keyName: '', // Invalid: empty string
        envVarName: 'MY_API_KEY',
        description: 'API key for external service',
        optional: false
      };

      expect(() => CredentialRequirementSchema.parse(invalidCredential)).toThrow();
    });
  });

  describe('DiscoveryMetadataSchema', () => {
    it('should validate correct discovery metadata', () => {
      const validMetadata = {
        source: 'github',
        discoveredAt: new Date(),
        confidence: 0.8,
        lastVerified: new Date()
      };

      expect(() => DiscoveryMetadataSchema.parse(validMetadata)).not.toThrow();
    });

    it('should reject invalid confidence values', () => {
      const invalidMetadata = {
        source: 'github',
        discoveredAt: new Date(),
        confidence: 1.5, // Invalid: > 1
        lastVerified: new Date()
      };

      expect(() => DiscoveryMetadataSchema.parse(invalidMetadata)).toThrow();
    });
  });

  describe('UsageStatsSchema', () => {
    it('should validate correct usage stats', () => {
      const validStats = {
        timesUsed: 10,
        lastUsed: new Date(),
        averageSuccessRate: 0.85
      };

      expect(() => UsageStatsSchema.parse(validStats)).not.toThrow();
    });

    it('should reject negative values', () => {
      const invalidStats = {
        timesUsed: -1, // Invalid: negative
        lastUsed: new Date(),
        averageSuccessRate: 0.85
      };

      expect(() => UsageStatsSchema.parse(invalidStats)).toThrow();
    });
  });

  describe('MCPRegistryEntrySchema', () => {
    it('should validate correct registry entry', () => {
      const validEntry = {
        id: 'test-mcp',
        name: 'Test MCP',
        category: ['testing'],
        repository: 'https://github.com/test/mcp',
        npmPackage: 'test-mcp',
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
        discoveryMetadata: {
          source: 'github',
          discoveredAt: new Date(),
          confidence: 0.9,
          lastVerified: new Date()
        },
        usageStats: {
          timesUsed: 5,
          lastUsed: new Date(),
          averageSuccessRate: 0.8
        }
      };

      expect(() => MCPRegistryEntrySchema.parse(validEntry)).not.toThrow();
    });

    it('should reject invalid URLs', () => {
      const invalidEntry = {
        id: 'test-mcp',
        name: 'Test MCP',
        category: ['testing'],
        repository: 'not-a-url', // Invalid URL
        installCommand: 'npm install test-mcp',
        configurationSchema: {},
        requiredCredentials: [],
        documentationUrl: 'https://docs.test.com',
        examples: ['example1'],
        discoveryMetadata: {
          source: 'github',
          discoveredAt: new Date(),
          confidence: 0.9,
          lastVerified: new Date()
        },
        usageStats: {
          timesUsed: 0,
          lastUsed: new Date(),
          averageSuccessRate: 0
        }
      };

      expect(() => MCPRegistryEntrySchema.parse(invalidEntry)).toThrow();
    });
  });

  describe('AttachedMCPSchema', () => {
    it('should validate correct attached MCP', () => {
      const validAttachedMCP = {
        mcpId: 'test-mcp',
        mcpName: 'Test MCP',
        reason: 'Required for task execution',
        status: 'active',
        configPath: '/path/to/config.json',
        availableTools: ['tool1', 'tool2']
      };

      expect(() => AttachedMCPSchema.parse(validAttachedMCP)).not.toThrow();
    });

    it('should validate all status values', () => {
      const statuses = ['pending', 'installing', 'active', 'error', 'inactive'];
      
      for (const status of statuses) {
        const validAttachedMCP = {
          mcpId: 'test-mcp',
          mcpName: 'Test MCP',
          reason: 'Required for task execution',
          status: status,
          configPath: '/path/to/config.json',
          availableTools: ['tool1']
        };

        expect(() => AttachedMCPSchema.parse(validAttachedMCP)).not.toThrow();
      }
    });
  });
});

describe('Credential Validation Schemas', () => {
  describe('CredentialStorageMethodSchema', () => {
    it('should validate all storage methods', () => {
      const methods = ['system-keychain', 'encrypted-config', 'env-file'];
      
      for (const method of methods) {
        expect(() => CredentialStorageMethodSchema.parse(method)).not.toThrow();
      }
    });

    it('should reject invalid storage method', () => {
      expect(() => CredentialStorageMethodSchema.parse('invalid-method')).toThrow();
    });
  });

  describe('CredentialStorageConfigSchema', () => {
    it('should validate correct storage config', () => {
      const validConfig = {
        method: 'encrypted-config',
        encryption: {
          algorithm: 'AES-256',
          keyDerivation: 'PBKDF2'
        },
        location: '/path/to/config',
        permissions: '0600',
        securityLevel: 'high'
      };

      expect(() => CredentialStorageConfigSchema.parse(validConfig)).not.toThrow();
    });

    it('should validate all security levels', () => {
      const levels = ['high', 'medium-high', 'medium'];
      
      for (const level of levels) {
        const validConfig = {
          method: 'system-keychain',
          securityLevel: level
        };

        expect(() => CredentialStorageConfigSchema.parse(validConfig)).not.toThrow();
      }
    });
  });

  describe('StoredCredentialSchema', () => {
    it('should validate correct stored credential', () => {
      const validCredential = {
        keyName: 'API_KEY',
        value: 'encrypted-value',
        encrypted: true,
        storedAt: new Date(),
        lastAccessed: new Date(),
        accessCount: 5
      };

      expect(() => StoredCredentialSchema.parse(validCredential)).not.toThrow();
    });

    it('should reject negative access count', () => {
      const invalidCredential = {
        keyName: 'API_KEY',
        value: 'encrypted-value',
        encrypted: true,
        storedAt: new Date(),
        lastAccessed: new Date(),
        accessCount: -1 // Invalid: negative
      };

      expect(() => StoredCredentialSchema.parse(invalidCredential)).toThrow();
    });
  });

  describe('EncryptionConfigSchema', () => {
    it('should validate correct encryption config', () => {
      const validConfig = {
        algorithm: 'aes-256-gcm',
        keyDerivation: 'pbkdf2',
        saltLength: 32,
        iterations: 100000
      };

      expect(() => EncryptionConfigSchema.parse(validConfig)).not.toThrow();
    });

    it('should reject invalid numeric values', () => {
      const invalidConfig = {
        algorithm: 'aes-256-gcm',
        keyDerivation: 'pbkdf2',
        saltLength: 0, // Invalid: zero
        iterations: 100000
      };

      expect(() => EncryptionConfigSchema.parse(invalidConfig)).toThrow();
    });
  });
});

describe('Task Validation Schemas', () => {
  describe('DetectedToolSchema', () => {
    it('should validate correct detected tool', () => {
      const validTool = {
        tool_name: 'npm',
        category: 'npm',
        confidence: 0.9,
        relevant_subtasks: ['task-1', 'task-2']
      };

      expect(() => DetectedToolSchema.parse(validTool)).not.toThrow();
    });

    it('should validate all tool categories', () => {
      const categories = ['npm', 'python', 'git', 'database', 'docker', 'api', 'other'];
      
      for (const category of categories) {
        const validTool = {
          tool_name: 'test-tool',
          category: category,
          confidence: 0.5,
          relevant_subtasks: ['task-1']
        };

        expect(() => DetectedToolSchema.parse(validTool)).not.toThrow();
      }
    });

    it('should reject invalid confidence values', () => {
      const invalidTool = {
        tool_name: 'npm',
        category: 'npm',
        confidence: 1.5, // Invalid: > 1
        relevant_subtasks: ['task-1']
      };

      expect(() => DetectedToolSchema.parse(invalidTool)).toThrow();
    });
  });

  describe('SubtaskSchema', () => {
    it('should validate correct subtask', () => {
      const validSubtask = {
        id: 'subtask-1',
        description: 'Install dependencies',
        dependencies: ['subtask-0'],
        tools: ['npm'],
        status: 'pending'
      };

      expect(() => SubtaskSchema.parse(validSubtask)).not.toThrow();
    });

    it('should validate all status values', () => {
      const statuses = ['pending', 'in_progress', 'completed', 'failed'];
      
      for (const status of statuses) {
        const validSubtask = {
          id: 'subtask-1',
          description: 'Install dependencies',
          dependencies: [],
          status: status
        };

        expect(() => SubtaskSchema.parse(validSubtask)).not.toThrow();
      }
    });
  });

  describe('TaskSchema', () => {
    it('should validate correct task', () => {
      const validTask = {
        id: 'task-1',
        description: 'Set up project',
        subtasks: [
          {
            id: 'subtask-1',
            description: 'Install dependencies',
            dependencies: []
          }
        ],
        project_context: 'Web development project',
        status: 'in_progress'
      };

      expect(() => TaskSchema.parse(validTask)).not.toThrow();
    });

    it('should validate task without optional fields', () => {
      const validTask = {
        id: 'task-1',
        description: 'Set up project',
        subtasks: []
      };

      expect(() => TaskSchema.parse(validTask)).not.toThrow();
    });
  });

  describe('SubtaskMCPMappingSchema', () => {
    it('should validate correct subtask MCP mapping', () => {
      const validMapping = {
        subtaskId: 'subtask-1',
        taskDescription: 'Install dependencies',
        requiredTools: ['npm'],
        attachedMCPs: [
          {
            mcpId: 'npm-mcp',
            mcpName: 'NPM MCP',
            reason: 'Required for package management',
            status: 'active',
            configPath: '/path/to/config.json',
            availableTools: ['install', 'run']
          }
        ],
        credentialsReady: true,
        executionReady: true
      };

      expect(() => SubtaskMCPMappingSchema.parse(validMapping)).not.toThrow();
    });

    it('should validate all MCP status values', () => {
      const statuses = ['pending', 'installing', 'active', 'error'];
      
      for (const status of statuses) {
        const validMapping = {
          subtaskId: 'subtask-1',
          taskDescription: 'Install dependencies',
          requiredTools: ['npm'],
          attachedMCPs: [
            {
              mcpId: 'npm-mcp',
              mcpName: 'NPM MCP',
              reason: 'Required for package management',
              status: status,
              configPath: '/path/to/config.json',
              availableTools: ['install']
            }
          ],
          credentialsReady: true,
          executionReady: true
        };

        expect(() => SubtaskMCPMappingSchema.parse(validMapping)).not.toThrow();
      }
    });
  });

  describe('TaskPlanInputSchema', () => {
    it('should validate correct task plan input', () => {
      const validInput = {
        task_description: 'Set up a new project',
        task_list: [
          {
            id: 'task-1',
            description: 'Initialize project',
            dependencies: []
          },
          {
            id: 'task-2',
            description: 'Install dependencies',
            dependencies: ['task-1']
          }
        ],
        project_context: 'Web development project'
      };

      expect(() => TaskPlanInputSchema.parse(validInput)).not.toThrow();
    });

    it('should validate task plan input without project context', () => {
      const validInput = {
        task_description: 'Set up a new project',
        task_list: [
          {
            id: 'task-1',
            description: 'Initialize project',
            dependencies: []
          }
        ]
      };

      expect(() => TaskPlanInputSchema.parse(validInput)).not.toThrow();
    });

    it('should reject empty task description', () => {
      const invalidInput = {
        task_description: '', // Invalid: empty string
        task_list: [
          {
            id: 'task-1',
            description: 'Initialize project',
            dependencies: []
          }
        ]
      };

      expect(() => TaskPlanInputSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('MCPAttachmentResultSchema', () => {
    it('should validate correct MCP attachment result', () => {
      const validResult = {
        attached_mcps: [
          {
            name: 'npm-mcp',
            status: 'active',
            available_tools: ['install', 'run', 'test']
          },
          {
            name: 'git-mcp',
            status: 'installing',
            available_tools: []
          }
        ],
        ready_to_execute: false
      };

      expect(() => MCPAttachmentResultSchema.parse(validResult)).not.toThrow();
    });

    it('should validate all MCP status values', () => {
      const statuses = ['active', 'installing', 'error'];
      
      for (const status of statuses) {
        const validResult = {
          attached_mcps: [
            {
              name: 'test-mcp',
              status: status,
              available_tools: ['tool1']
            }
          ],
          ready_to_execute: status === 'active'
        };

        expect(() => MCPAttachmentResultSchema.parse(validResult)).not.toThrow();
      }
    });
  });
});

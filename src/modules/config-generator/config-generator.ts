/**
 * Core Configuration Generator
 * 
 * This module handles the core logic for generating MCP configurations,
 * combining multiple MCP configs, and validating configurations.
 */

import { createLogger } from '../../utils/logger';
import { createRegistry } from '../../core/registry';
import type { MCPRegistryEntry } from '../../types/mcp';
import type { 
  MCPConfigTemplate,
  ConfigValidationResult,
  MCPType
} from './types';

const logger = createLogger('config-generator-core');

/**
 * Core configuration generator class
 */
export class ConfigGenerator {
  private registry: ReturnType<typeof createRegistry> | null = null;

  constructor() {
    this.initializeRegistry();
  }

  /**
   * Initialize the MCP registry
   */
  private async initializeRegistry(): Promise<void> {
    try {
      this.registry = createRegistry();
      await this.registry.initialize();
      logger.debug('Registry initialized for config generator');
    } catch (error) {
      logger.error('Failed to initialize registry', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get MCP metadata from registry
   */
  async getMCPMetadata(mcpId: string): Promise<MCPRegistryEntry> {
    if (!this.registry) {
      throw new Error('Registry not initialized');
    }

    const entries = await this.registry.searchEntries({ name: mcpId, limit: 1 });
    
    if (entries.length === 0) {
      throw new Error(`MCP '${mcpId}' not found in registry`);
    }

    const entry = entries[0];
    if (!entry) {
      throw new Error(`MCP '${mcpId}' not found in registry`);
    }

    return entry as unknown as MCPRegistryEntry;
  }

  /**
   * Check if MCP exists in registry
   */
  async mcpExists(mcpId: string): Promise<boolean> {
    try {
      await this.getMCPMetadata(mcpId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Determine MCP type from metadata
   */
  determineMCPType(metadata: MCPRegistryEntry): MCPType {
    const categories = metadata.category.map(cat => cat.toLowerCase());
    const name = metadata.name.toLowerCase();
    const description = metadata.documentationUrl.toLowerCase();

    // Filesystem MCPs
    if (categories.includes('filesystem') || 
        categories.includes('file') || 
        name.includes('file') || 
        name.includes('fs')) {
      return 'filesystem';
    }

    // Database MCPs
    if (categories.includes('database') || 
        categories.includes('db') || 
        name.includes('database') || 
        name.includes('sql') || 
        name.includes('postgres') || 
        name.includes('mysql')) {
      return 'database';
    }

    // API MCPs
    if (categories.includes('api') || 
        categories.includes('http') || 
        categories.includes('rest') || 
        name.includes('api') || 
        name.includes('http')) {
      return 'api';
    }

    // Web scraper MCPs
    if (categories.includes('scraper') || 
        categories.includes('web') || 
        categories.includes('crawler') || 
        name.includes('scraper') || 
        name.includes('crawl')) {
      return 'web-scraper';
    }

    // Code analyzer MCPs
    if (categories.includes('code') || 
        categories.includes('analysis') || 
        categories.includes('linter') || 
        name.includes('code') || 
        name.includes('analyze') || 
        name.includes('lint')) {
      return 'code-analyzer';
    }

    // Package manager MCPs
    if (categories.includes('package') || 
        categories.includes('npm') || 
        categories.includes('yarn') || 
        name.includes('npm') || 
        name.includes('package') || 
        name.includes('yarn')) {
      return 'package-manager';
    }

    // Cloud service MCPs
    if (categories.includes('cloud') || 
        categories.includes('aws') || 
        categories.includes('azure') || 
        categories.includes('gcp') || 
        name.includes('cloud') || 
        name.includes('aws') || 
        name.includes('azure')) {
      return 'cloud-service';
    }

    // Development tool MCPs
    if (categories.includes('development') || 
        categories.includes('dev') || 
        categories.includes('tool') || 
        name.includes('dev') || 
        name.includes('tool')) {
      return 'development-tool';
    }

    // Default to custom
    return 'custom';
  }

  /**
   * Generate base configuration for an MCP
   */
  generateBaseConfig(metadata: MCPRegistryEntry, environment: string): Record<string, any> {
    const mcpType = this.determineMCPType(metadata);
    
    const baseConfig = {
      name: metadata.name,
      type: mcpType,
      repository: metadata.repository,
      installCommand: metadata.installCommand,
      environment,
      configuration: {},
      credentials: {},
      metadata: {
        id: metadata.id,
        category: metadata.category,
        documentation: metadata.documentationUrl,
        examples: metadata.examples,
        discoveredAt: metadata.discoveryMetadata.discoveredAt,
        confidence: metadata.discoveryMetadata.confidence
      }
    };

    // Add type-specific configuration
    switch (mcpType) {
      case 'filesystem':
        baseConfig.configuration = {
          rootPath: process.cwd(),
          allowWrite: true,
          allowDelete: false,
          maxFileSize: '10MB',
          allowedExtensions: ['.txt', '.md', '.json', '.js', '.ts', '.py']
        };
        break;

      case 'database':
        baseConfig.configuration = {
          connectionString: '${DATABASE_URL}',
          maxConnections: 10,
          timeout: 30000,
          ssl: true
        };
        break;

      case 'api':
        baseConfig.configuration = {
          baseUrl: '${API_BASE_URL}',
          timeout: 30000,
          retries: 3,
          rateLimit: 100
        };
        break;

      case 'web-scraper':
        baseConfig.configuration = {
          userAgent: 'MCP-WebScraper/1.0',
          timeout: 30000,
          maxDepth: 3,
          respectRobots: true,
          delay: 1000
        };
        break;

      case 'code-analyzer':
        baseConfig.configuration = {
          languages: ['javascript', 'typescript', 'python'],
          maxFileSize: '1MB',
          includeTests: false,
          strictMode: true
        };
        break;

      case 'package-manager':
        baseConfig.configuration = {
          registry: 'https://registry.npmjs.org/',
          scope: '',
          timeout: 30000,
          cache: true
        };
        break;

      case 'cloud-service':
        baseConfig.configuration = {
          region: 'us-east-1',
          timeout: 30000,
          retries: 3
        };
        break;

      case 'development-tool':
        baseConfig.configuration = {
          workspace: process.cwd(),
          timeout: 30000,
          verbose: false
        };
        break;

      default:
        baseConfig.configuration = {
          timeout: 30000,
          retries: 3
        };
    }

    return baseConfig;
  }

  /**
   * Combine multiple MCP configurations
   */
  combineConfigurations(configs: MCPConfigTemplate[]): Record<string, any> {
    const combined = {
      version: '1.0.0',
      generated_at: new Date().toISOString(),
      environment: configs[0]?.environment || 'custom',
      mcpServers: {} as Record<string, any>,
      metadata: {
        total_mcps: configs.length,
        mcp_types: [...new Set(configs.map(c => c.type))],
        generated_by: 'mcp-meta-orchestrator'
      }
    };

    // Add each MCP configuration
    for (const config of configs) {
      combined.mcpServers[config.mcpId] = {
        name: config.mcpName,
        type: config.type,
        configuration: config.configuration,
        credentials: config.credentials,
        metadata: config.metadata
      };
    }

    return combined;
  }

  /**
   * Validate a configuration
   */
  async validateConfiguration(config: Record<string, any>): Promise<ConfigValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      // Check required fields
      if (!config.version) {
        errors.push('Missing required field: version');
      }

      if (!config.mcpServers || typeof config.mcpServers !== 'object') {
        errors.push('Missing or invalid mcpServers field');
      } else {
        // Validate each MCP server configuration
        for (const [mcpId, mcpConfig] of Object.entries(config.mcpServers)) {
          if (!mcpConfig || typeof mcpConfig !== 'object') {
            errors.push(`Invalid configuration for MCP: ${mcpId}`);
            continue;
          }

        // Check required MCP fields
        if (!(mcpConfig as any).name) {
          errors.push(`Missing name for MCP: ${mcpId}`);
        }

        if (!(mcpConfig as any).type) {
          errors.push(`Missing type for MCP: ${mcpId}`);
        }

        if (!(mcpConfig as any).configuration) {
          warnings.push(`Missing configuration for MCP: ${mcpId}`);
        }

        // Validate credentials
        if ((mcpConfig as any).credentials) {
          for (const [credKey, credValue] of Object.entries((mcpConfig as any).credentials)) {
              if (typeof credValue === 'string' && credValue.startsWith('${') && credValue.endsWith('}')) {
                // Environment variable reference
                const envVar = credValue.slice(2, -1);
                if (!process.env[envVar]) {
                  warnings.push(`Environment variable ${envVar} not set for MCP: ${mcpId}`);
                }
              }
            }
          }
        }
      }

      // Check for common issues
      if (config.metadata?.total_mcps === 0) {
        warnings.push('No MCP servers configured');
      }

      if (config.metadata?.total_mcps > 10) {
        suggestions.push('Consider reducing the number of MCP servers for better performance');
      }

      // Validate JSON structure
      JSON.stringify(config); // This will throw if config is not serializable

    } catch (error) {
      errors.push(`Configuration validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      valid: errors.length === 0,
      ...(errors.length > 0 && { errors }),
      ...(warnings.length > 0 && { warnings }),
      ...(suggestions.length > 0 && { suggestions })
    };
  }

  /**
   * Get configuration schema for an MCP type
   */
  getConfigurationSchema(mcpType: MCPType): Record<string, any> {
    const schemas = {
      filesystem: {
        type: 'object',
        properties: {
          rootPath: { type: 'string', description: 'Root directory path' },
          allowWrite: { type: 'boolean', description: 'Allow write operations' },
          allowDelete: { type: 'boolean', description: 'Allow delete operations' },
          maxFileSize: { type: 'string', description: 'Maximum file size' },
          allowedExtensions: { type: 'array', items: { type: 'string' } }
        },
        required: ['rootPath']
      },
      database: {
        type: 'object',
        properties: {
          connectionString: { type: 'string', description: 'Database connection string' },
          maxConnections: { type: 'number', description: 'Maximum connections' },
          timeout: { type: 'number', description: 'Connection timeout' },
          ssl: { type: 'boolean', description: 'Use SSL' }
        },
        required: ['connectionString']
      },
      api: {
        type: 'object',
        properties: {
          baseUrl: { type: 'string', description: 'API base URL' },
          timeout: { type: 'number', description: 'Request timeout' },
          retries: { type: 'number', description: 'Number of retries' },
          rateLimit: { type: 'number', description: 'Rate limit per minute' }
        },
        required: ['baseUrl']
      },
      'web-scraper': {
        type: 'object',
        properties: {
          userAgent: { type: 'string', description: 'User agent string' },
          timeout: { type: 'number', description: 'Request timeout' },
          maxDepth: { type: 'number', description: 'Maximum crawl depth' },
          respectRobots: { type: 'boolean', description: 'Respect robots.txt' },
          delay: { type: 'number', description: 'Delay between requests' }
        }
      },
      'code-analyzer': {
        type: 'object',
        properties: {
          languages: { type: 'array', items: { type: 'string' }, description: 'Supported languages' },
          maxFileSize: { type: 'string', description: 'Maximum file size' },
          includeTests: { type: 'boolean', description: 'Include test files' },
          strictMode: { type: 'boolean', description: 'Enable strict mode' }
        }
      },
      'package-manager': {
        type: 'object',
        properties: {
          registry: { type: 'string', description: 'Package registry URL' },
          scope: { type: 'string', description: 'Package scope' },
          timeout: { type: 'number', description: 'Request timeout' },
          cache: { type: 'boolean', description: 'Enable caching' }
        }
      },
      'cloud-service': {
        type: 'object',
        properties: {
          region: { type: 'string', description: 'Cloud region' },
          timeout: { type: 'number', description: 'Request timeout' },
          retries: { type: 'number', description: 'Number of retries' }
        }
      },
      'development-tool': {
        type: 'object',
        properties: {
          workspace: { type: 'string', description: 'Workspace path' },
          timeout: { type: 'number', description: 'Operation timeout' },
          verbose: { type: 'boolean', description: 'Verbose logging' }
        }
      },
      custom: {
        type: 'object',
        properties: {
          timeout: { type: 'number', description: 'Default timeout' },
          retries: { type: 'number', description: 'Default retries' }
        }
      }
    };

    return schemas[mcpType] || schemas.custom;
  }
}

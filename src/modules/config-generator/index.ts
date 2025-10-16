/**
 * MCP Configuration Generator Module
 * 
 * This module provides comprehensive file system operations for generating
 * MCP configuration files for different environments and MCP types.
 */

import { createLogger } from '../../utils/logger';
import { ConfigGenerator } from './config-generator';
import { FileSystemManager } from './file-system-manager';
import { TemplateEngine } from './template-engine';
import { EnvironmentManager } from './environment-manager';
import type { 
  MCPConfigGenerationRequest,
  MCPConfigGenerationResult,
  MCPConfigTemplate,
  EnvironmentConfig
} from './types.js';

const logger = createLogger('config-generator');

/**
 * Main configuration generator class
 */
export class MCPConfigGenerator {
  private configGenerator: ConfigGenerator;
  private fileSystemManager: FileSystemManager;
  private templateEngine: TemplateEngine;
  private environmentManager: EnvironmentManager;

  constructor() {
    this.configGenerator = new ConfigGenerator();
    this.fileSystemManager = new FileSystemManager();
    this.templateEngine = new TemplateEngine();
    this.environmentManager = new EnvironmentManager();
    
    logger.info('MCP Configuration Generator initialized');
  }

  /**
   * Generates MCP configuration for a specific subtask
   */
  async generateConfig(request: MCPConfigGenerationRequest): Promise<MCPConfigGenerationResult> {
    try {
      logger.info('Generating MCP configuration', { 
        subtaskId: request.subtask_id,
        environment: request.environment,
        mcpCount: request.required_mcps.length
      });

      // Validate request
      const validation = await this.validateRequest(request);
      if (!validation.valid) {
      return {
        success: false,
        error: validation.error || 'Validation failed',
        config_content: {},
        file_path: '',
        activation_command: ''
      };
      }

      // Get environment configuration
      const envConfig = await this.environmentManager.getEnvironmentConfig(request.environment);
      
      // Generate configuration for each MCP
      const configs = await Promise.all(
        request.required_mcps.map(mcpId => 
          this.generateMCPConfig(mcpId, envConfig, request)
        )
      );

      // Combine configurations
      const combinedConfig = this.configGenerator.combineConfigurations(configs);
      
      // Generate file path
      const filePath = await this.fileSystemManager.generateConfigFilePath(
        request.subtask_id,
        request.environment
      );

      // Write configuration file
      const writeResult = await this.fileSystemManager.writeConfigFile(
        filePath,
        combinedConfig,
        envConfig
      );

      if (!writeResult.success) {
      return {
        success: false,
        error: writeResult.error || 'Failed to write config file',
        config_content: combinedConfig,
        file_path: filePath,
        activation_command: ''
      };
      }

      // Generate activation command
      const activationCommand = this.environmentManager.generateActivationCommand(
        request.environment,
        filePath
      );

      logger.info('MCP configuration generated successfully', { 
        subtaskId: request.subtask_id,
        filePath,
        mcpCount: configs.length
      });

      return {
        success: true,
        config_content: combinedConfig,
        file_path: filePath,
        activation_command: activationCommand,
        metadata: {
          generated_at: new Date().toISOString(),
          environment: request.environment,
          mcp_count: configs.length,
          file_size: JSON.stringify(combinedConfig).length
        }
      };

    } catch (error) {
      logger.error('Failed to generate MCP configuration', { 
        subtaskId: request.subtask_id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        config_content: {},
        file_path: '',
        activation_command: ''
      };
    }
  }

  /**
   * Generates configuration for a single MCP
   */
  private async generateMCPConfig(
    mcpId: string, 
    envConfig: EnvironmentConfig, 
    request: MCPConfigGenerationRequest
  ): Promise<MCPConfigTemplate> {
    // Get MCP metadata from registry
    const mcpMetadata = await this.configGenerator.getMCPMetadata(mcpId);
    
    // Get template for MCP type
    const mcpType = this.configGenerator.determineMCPType(mcpMetadata);
    const template = await this.templateEngine.getTemplate(
      mcpType,
      request.environment
    );

    // Generate configuration using template
    const config = await this.templateEngine.renderTemplate(template, {
      mcpId,
      mcpMetadata,
      environment: request.environment,
      envConfig,
      subtaskId: request.subtask_id
    });

    return config;
  }

  /**
   * Validates the configuration generation request
   */
  private async validateRequest(request: MCPConfigGenerationRequest): Promise<{ valid: boolean; error?: string }> {
    if (!request.subtask_id || typeof request.subtask_id !== 'string') {
      return { valid: false, error: 'Invalid subtask_id' };
    }

    if (!request.required_mcps || !Array.isArray(request.required_mcps) || request.required_mcps.length === 0) {
      return { valid: false, error: 'Invalid or empty required_mcps array' };
    }

    if (!request.environment || !['claude-desktop', 'cursor', 'custom'].includes(request.environment)) {
      return { valid: false, error: 'Invalid environment. Must be claude-desktop, cursor, or custom' };
    }

    // Validate that all MCPs exist in registry
    for (const mcpId of request.required_mcps) {
      const exists = await this.configGenerator.mcpExists(mcpId);
      if (!exists) {
        return { valid: false, error: `MCP '${mcpId}' not found in registry` };
      }
    }

    return { valid: true };
  }

  /**
   * Lists available configuration templates
   */
  async listTemplates(): Promise<{ templates: string[]; environments: string[] }> {
    const templates = await this.templateEngine.listAvailableTemplates();
    const environments = this.environmentManager.getSupportedEnvironments();
    
    return { templates, environments };
  }

  /**
   * Validates an existing configuration file
   */
  async validateConfigFile(filePath: string): Promise<{ valid: boolean; errors: string[] }> {
    try {
      const config = await this.fileSystemManager.readConfigFile(filePath);
      const validation = await this.configGenerator.validateConfiguration(config);
      
      return {
        valid: validation.valid,
        errors: validation.errors || []
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Backs up an existing configuration file
   */
  async backupConfigFile(filePath: string): Promise<{ success: boolean; backupPath?: string; error?: string }> {
    try {
      const backupPath = await this.fileSystemManager.backupConfigFile(filePath);
      return { success: true, backupPath };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * Default configuration generator instance
 */
export const defaultConfigGenerator = new MCPConfigGenerator();

// Export all types and classes
export * from './config-generator';
export * from './file-system-manager';
export * from './template-engine';
export * from './environment-manager';
export * from './types';

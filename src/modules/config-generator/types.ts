/**
 * Configuration Generator Types
 * 
 * Type definitions for MCP configuration generation and file system operations.
 */

import type { MCPRegistryEntry } from '../../types/mcp.js';

/**
 * MCP Configuration Generation Request
 */
export interface MCPConfigGenerationRequest {
  subtask_id: string;
  required_mcps: string[];
  environment: 'claude-desktop' | 'cursor' | 'custom';
  options?: {
    backup_existing?: boolean;
    validate_credentials?: boolean;
    include_examples?: boolean;
    custom_config_path?: string;
  };
}

/**
 * MCP Configuration Generation Result
 */
export interface MCPConfigGenerationResult {
  success: boolean;
  config_content: Record<string, any>;
  file_path: string;
  activation_command: string;
  error?: string;
  metadata?: {
    generated_at: string;
    environment: string;
    mcp_count: number;
    file_size: number;
  };
}

/**
 * MCP Configuration Template
 */
export interface MCPConfigTemplate {
  mcpId: string;
  mcpName: string;
  type: MCPType;
  configuration: Record<string, any>;
  credentials: Record<string, string>;
  environment: string;
  metadata: {
    template_version: string;
    generated_at: string;
    source: string;
  };
}

/**
 * MCP Types
 */
export type MCPType = 
  | 'filesystem'
  | 'database'
  | 'api'
  | 'web-scraper'
  | 'code-analyzer'
  | 'package-manager'
  | 'cloud-service'
  | 'development-tool'
  | 'custom';

/**
 * Environment Configuration
 */
export interface EnvironmentConfig {
  name: string;
  configFormat: 'json' | 'yaml' | 'toml';
  configPath: string;
  activationMethod: 'restart' | 'reload' | 'hot-reload';
  supportedFeatures: string[];
  limitations: string[];
  templateVariables: Record<string, string>;
}

/**
 * File System Operation Result
 */
export interface FileSystemResult {
  success: boolean;
  error?: string;
  data?: any;
  metadata?: {
    file_size?: number;
    created_at?: string;
    modified_at?: string;
    permissions?: string;
  };
}

/**
 * Template Rendering Context
 */
export interface TemplateContext {
  mcpId: string;
  mcpMetadata: MCPRegistryEntry;
  environment: string;
  envConfig: EnvironmentConfig;
  subtaskId: string;
  credentials?: Record<string, string>;
  customVariables?: Record<string, any>;
}

/**
 * Configuration Validation Result
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
  suggestions?: string[];
}

/**
 * Template Metadata
 */
export interface TemplateMetadata {
  name: string;
  version: string;
  description: string;
  mcpTypes: MCPType[];
  environments: string[];
  requiredVariables: string[];
  optionalVariables: string[];
  examples: string[];
}

/**
 * Backup Information
 */
export interface BackupInfo {
  originalPath: string;
  backupPath: string;
  timestamp: string;
  size: number;
  checksum: string;
}

/**
 * Configuration File Metadata
 */
export interface ConfigFileMetadata {
  path: string;
  size: number;
  created: string;
  modified: string;
  environment: string;
  mcpCount: number;
  isValid: boolean;
  backupAvailable: boolean;
}

/**
 * Environment-specific Configuration
 */
export interface EnvironmentSpecificConfig {
  claude_desktop: {
    configPath: string;
    format: 'json';
    structure: {
      mcpServers: Record<string, any>;
    };
  };
  cursor: {
    configPath: string;
    format: 'json';
    structure: {
      mcp: {
        servers: Record<string, any>;
      };
    };
  };
  custom: {
    configPath: string;
    format: 'json' | 'yaml' | 'toml';
    structure: Record<string, any>;
  };
}

/**
 * Credential Integration Options
 */
export interface CredentialIntegrationOptions {
  includeCredentials: boolean;
  credentialSource: 'env' | 'config' | 'prompt';
  encryptionEnabled: boolean;
  validationRequired: boolean;
}

/**
 * Template Engine Options
 */
export interface TemplateEngineOptions {
  strictMode: boolean;
  allowUndefinedVariables: boolean;
  customFilters: Record<string, Function>;
  customHelpers: Record<string, Function>;
}

/**
 * File System Manager Options
 */
export interface FileSystemManagerOptions {
  createDirectories: boolean;
  backupBeforeWrite: boolean;
  validateAfterWrite: boolean;
  setPermissions: boolean;
  defaultPermissions: string;
}

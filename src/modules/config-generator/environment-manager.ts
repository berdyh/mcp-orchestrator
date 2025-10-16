/**
 * Environment Manager
 * 
 * This module manages different MCP environments (Claude Desktop, Cursor, custom)
 * and provides environment-specific configuration and activation commands.
 */

import { createLogger } from '../../utils/logger';
import { join } from 'path';
import { homedir } from 'os';
import type { 
  EnvironmentConfig,
  EnvironmentSpecificConfig
} from './types';

const logger = createLogger('environment-manager');

/**
 * Environment manager class
 */
export class EnvironmentManager {
  private environments: Map<string, EnvironmentConfig> = new Map();
  private environmentSpecificConfigs!: EnvironmentSpecificConfig;

  constructor() {
    this.initializeEnvironments();
    this.initializeEnvironmentSpecificConfigs();
  }

  /**
   * Initialize supported environments
   */
  private initializeEnvironments(): void {
    const environments: EnvironmentConfig[] = [
      {
        name: 'claude-desktop',
        configFormat: 'json',
        configPath: join(homedir(), '.config', 'claude-desktop', 'claude_desktop_config.json'),
        activationMethod: 'restart',
        supportedFeatures: [
          'mcp-servers',
          'credentials',
          'environment-variables',
          'custom-configs'
        ],
        limitations: [
          'Requires Claude Desktop restart',
          'Limited to JSON format',
          'No hot-reload support'
        ],
        templateVariables: {
          configDir: join(homedir(), '.config', 'claude-desktop'),
          dataDir: join(homedir(), '.local', 'share', 'claude-desktop'),
          cacheDir: join(homedir(), '.cache', 'claude-desktop')
        }
      },
      {
        name: 'cursor',
        configFormat: 'json',
        configPath: join(homedir(), '.cursor', 'mcp-config.json'),
        activationMethod: 'reload',
        supportedFeatures: [
          'mcp-servers',
          'credentials',
          'environment-variables',
          'hot-reload',
          'custom-configs'
        ],
        limitations: [
          'Requires Cursor reload',
          'Limited to JSON format'
        ],
        templateVariables: {
          configDir: join(homedir(), '.cursor'),
          dataDir: join(homedir(), '.local', 'share', 'cursor'),
          cacheDir: join(homedir(), '.cache', 'cursor'),
          workspaceDir: process.cwd()
        }
      },
      {
        name: 'custom',
        configFormat: 'json',
        configPath: join(homedir(), '.mcp-hub', 'custom-config.json'),
        activationMethod: 'hot-reload',
        supportedFeatures: [
          'mcp-servers',
          'credentials',
          'environment-variables',
          'hot-reload',
          'custom-configs',
          'multiple-formats',
          'custom-activation'
        ],
        limitations: [
          'Requires custom MCP client',
          'No built-in support'
        ],
        templateVariables: {
          configDir: join(homedir(), '.mcp-hub'),
          dataDir: join(homedir(), '.local', 'share', 'mcp-hub'),
          cacheDir: join(homedir(), '.cache', 'mcp-hub'),
          workspaceDir: process.cwd(),
          customDir: process.env.MCP_CUSTOM_DIR || join(homedir(), '.mcp-hub', 'custom')
        }
      }
    ];

    for (const env of environments) {
      this.environments.set(env.name, env);
    }

    logger.debug('Environments initialized', { count: environments.length });
  }

  /**
   * Initialize environment-specific configurations
   */
  private initializeEnvironmentSpecificConfigs(): void {
    this.environmentSpecificConfigs = {
      claude_desktop: {
        configPath: join(homedir(), '.config', 'claude-desktop', 'claude_desktop_config.json'),
        format: 'json',
        structure: {
          mcpServers: {}
        }
      },
      cursor: {
        configPath: join(homedir(), '.cursor', 'mcp-config.json'),
        format: 'json',
        structure: {
          mcp: {
            servers: {}
          }
        }
      },
      custom: {
        configPath: join(homedir(), '.mcp-hub', 'custom-config.json'),
        format: 'json',
        structure: {}
      }
    };
  }

  /**
   * Get environment configuration
   */
  async getEnvironmentConfig(environment: string): Promise<EnvironmentConfig> {
    const config = this.environments.get(environment);
    
    if (!config) {
      throw new Error(`Unsupported environment: ${environment}`);
    }

    return config;
  }

  /**
   * Get supported environments
   */
  getSupportedEnvironments(): string[] {
    return Array.from(this.environments.keys());
  }

  /**
   * Generate activation command for environment
   */
  generateActivationCommand(environment: string, configPath: string): string {
    const envConfig = this.environments.get(environment);
    
    if (!envConfig) {
      throw new Error(`Unsupported environment: ${environment}`);
    }

    switch (environment) {
      case 'claude-desktop':
        return this.generateClaudeDesktopActivationCommand(configPath);
      
      case 'cursor':
        return this.generateCursorActivationCommand(configPath);
      
      case 'custom':
        return this.generateCustomActivationCommand(configPath);
      
      default:
        throw new Error(`Unknown environment: ${environment}`);
    }
  }

  /**
   * Generate Claude Desktop activation command
   */
  private generateClaudeDesktopActivationCommand(configPath: string): string {
    return `# Claude Desktop Configuration
# 1. Copy the configuration to Claude Desktop config directory:
cp "${configPath}" "${this.environmentSpecificConfigs.claude_desktop.configPath}"

# 2. Restart Claude Desktop to load the new configuration
# Note: You may need to quit and restart the application

# 3. Verify the configuration is loaded:
# Check the MCP servers section in Claude Desktop settings

echo "Claude Desktop configuration updated. Please restart the application."`;
  }

  /**
   * Generate Cursor activation command
   */
  private generateCursorActivationCommand(configPath: string): string {
    return `# Cursor Configuration
# 1. Copy the configuration to Cursor config directory:
cp "${configPath}" "${this.environmentSpecificConfigs.cursor.configPath}"

# 2. Reload Cursor to load the new configuration
# Use Cmd/Ctrl + Shift + P and run "Developer: Reload Window"

# 3. Verify the configuration is loaded:
# Check the MCP servers section in Cursor settings

echo "Cursor configuration updated. Please reload the window."`;
  }

  /**
   * Generate custom activation command
   */
  private generateCustomActivationCommand(configPath: string): string {
    return `# Custom MCP Configuration
# 1. Copy the configuration to your custom MCP client:
cp "${configPath}" "${this.environmentSpecificConfigs.custom.configPath}"

# 2. Configure your MCP client to use this configuration file
# The configuration format is JSON and can be customized

# 3. Start your MCP client with the new configuration:
# Example: mcp-client --config "${this.environmentSpecificConfigs.custom.configPath}"

echo "Custom MCP configuration ready at: ${this.environmentSpecificConfigs.custom.configPath}"`;
  }

  /**
   * Get environment-specific configuration structure
   */
  getEnvironmentSpecificStructure(environment: string): Record<string, any> {
    switch (environment) {
      case 'claude-desktop':
        return this.environmentSpecificConfigs.claude_desktop.structure;
      
      case 'cursor':
        return this.environmentSpecificConfigs.cursor.structure;
      
      case 'custom':
        return this.environmentSpecificConfigs.custom.structure;
      
      default:
        throw new Error(`Unsupported environment: ${environment}`);
    }
  }

  /**
   * Transform configuration for specific environment
   */
  transformConfigurationForEnvironment(
    config: Record<string, any>, 
    environment: string
  ): Record<string, any> {
    const structure = this.getEnvironmentSpecificStructure(environment);
    
    switch (environment) {
      case 'claude-desktop':
        return {
          ...structure,
          mcpServers: config.mcpServers || {}
        };
      
      case 'cursor':
        return {
          ...structure,
          mcp: {
            ...structure.mcp,
            servers: config.mcpServers || {}
          }
        };
      
      case 'custom':
        return {
          ...structure,
          ...config
        };
      
      default:
        return config;
    }
  }

  /**
   * Validate environment configuration
   */
  async validateEnvironmentConfiguration(
    environment: string, 
    config: Record<string, any>
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const envConfig = this.environments.get(environment);
    
    if (!envConfig) {
      errors.push(`Unsupported environment: ${environment}`);
      return { valid: false, errors };
    }

    // Check required structure for environment
    const structure = this.getEnvironmentSpecificStructure(environment);
    
    switch (environment) {
      case 'claude-desktop':
        if (!config.mcpServers || typeof config.mcpServers !== 'object') {
          errors.push('Claude Desktop requires mcpServers object');
        }
        break;
      
      case 'cursor':
        if (!config.mcp || !config.mcp.servers || typeof config.mcp.servers !== 'object') {
          errors.push('Cursor requires mcp.servers object');
        }
        break;
      
      case 'custom':
        // Custom environment is more flexible
        break;
    }

    // Check for required fields
    if (!config.version) {
      errors.push('Missing version field');
    }

    if (!config.generated_at) {
      errors.push('Missing generated_at field');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get environment capabilities
   */
  getEnvironmentCapabilities(environment: string): {
    features: string[];
    limitations: string[];
    activationMethod: string;
  } {
    const envConfig = this.environments.get(environment);
    
    if (!envConfig) {
      throw new Error(`Unsupported environment: ${environment}`);
    }

    return {
      features: envConfig.supportedFeatures,
      limitations: envConfig.limitations,
      activationMethod: envConfig.activationMethod
    };
  }

  /**
   * Get template variables for environment
   */
  getTemplateVariables(environment: string): Record<string, string> {
    const envConfig = this.environments.get(environment);
    
    if (!envConfig) {
      throw new Error(`Unsupported environment: ${environment}`);
    }

    return envConfig.templateVariables;
  }

  /**
   * Check if environment is supported
   */
  isEnvironmentSupported(environment: string): boolean {
    return this.environments.has(environment);
  }

  /**
   * Get environment information
   */
  getEnvironmentInfo(environment: string): {
    name: string;
    configFormat: string;
    configPath: string;
    activationMethod: string;
    features: string[];
    limitations: string[];
  } | null {
    const envConfig = this.environments.get(environment);
    
    if (!envConfig) {
      return null;
    }

    return {
      name: envConfig.name,
      configFormat: envConfig.configFormat,
      configPath: envConfig.configPath,
      activationMethod: envConfig.activationMethod,
      features: envConfig.supportedFeatures,
      limitations: envConfig.limitations
    };
  }

  /**
   * Detect current environment
   */
  detectCurrentEnvironment(): string {
    // Check for Claude Desktop
    if (process.env.CLAUDE_DESKTOP_CONFIG_DIR || 
        process.env.CLAUDE_DESKTOP_DATA_DIR) {
      return 'claude-desktop';
    }

    // Check for Cursor
    if (process.env.CURSOR_CONFIG_DIR || 
        process.env.CURSOR_DATA_DIR ||
        process.env.VSCODE_PID) {
      return 'cursor';
    }

    // Default to custom
    return 'custom';
  }

  /**
   * Get recommended environment for current context
   */
  getRecommendedEnvironment(): string {
    const currentEnv = this.detectCurrentEnvironment();
    
    // If we can detect the environment, use it
    if (currentEnv !== 'custom') {
      return currentEnv;
    }

    // Otherwise, recommend based on available tools
    if (process.env.CLAUDE_DESKTOP_CONFIG_DIR) {
      return 'claude-desktop';
    }

    if (process.env.CURSOR_CONFIG_DIR) {
      return 'cursor';
    }

    return 'custom';
  }
}

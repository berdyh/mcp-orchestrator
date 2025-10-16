/**
 * MCP Server Core Configuration
 * 
 * This module contains the core MCP server setup and configuration.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('mcp-server');

export interface MCPServerConfig {
  name: string;
  version: string;
  capabilities: {
    tools: Record<string, any>;
  };
}

export const DEFAULT_SERVER_CONFIG: MCPServerConfig = {
  name: 'mcp-meta-orchestrator',
  version: '0.1.0',
  capabilities: {
    tools: {},
  },
};

/**
 * Creates a new MCP server instance with the given configuration
 */
export function createMCPServer(config: MCPServerConfig = DEFAULT_SERVER_CONFIG): Server {
  logger.info(`Creating MCP server: ${config.name} v${config.version}`);
  
  const server = new Server({
    name: config.name,
    version: config.version,
  });
  
  logger.debug('MCP server created successfully');
  return server;
}

/**
 * Validates server configuration
 */
export function validateServerConfig(config: MCPServerConfig): boolean {
  if (!config.name || typeof config.name !== 'string') {
    logger.error('Invalid server name');
    return false;
  }
  
  if (!config.version || typeof config.version !== 'string') {
    logger.error('Invalid server version');
    return false;
  }
  
  if (!config.capabilities || typeof config.capabilities !== 'object') {
    logger.error('Invalid server capabilities');
    return false;
  }
  
  return true;
}

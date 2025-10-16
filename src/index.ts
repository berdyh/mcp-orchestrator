#!/usr/bin/env node

/**
 * MCP Meta-Orchestrator Server Entry Point
 * 
 * This is the main entry point for the MCP Meta-Orchestrator server.
 * It initializes the MCP server and registers all available tools.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';
import { createLogger } from './utils/logger.js';
import { registerTools } from './core/tools.js';

const logger = createLogger('mcp-meta-orchestrator');

async function main() {
  try {
    logger.info('Starting MCP Meta-Orchestrator Server...');

    // Create MCP server
    const server = new Server({
      name: 'mcp-meta-orchestrator',
      version: '0.1.0',
    });

    // Register all tools
    await registerTools(server);

    // Set up transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info('MCP Meta-Orchestrator Server started successfully');
    logger.info('MCP Meta-Orchestrator Server ready');

  } catch (error) {
    logger.error('Failed to start MCP Meta-Orchestrator Server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  logger.error('Unhandled error in main:', error);
  process.exit(1);
});

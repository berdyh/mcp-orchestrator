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

// Disable logging to avoid interfering with MCP protocol
process.env.LOG_LEVEL = 'error';

// Create logger that outputs to stderr to avoid interfering with MCP protocol
const logger = createLogger('mcp-meta-orchestrator', { 
  output: process.stderr 
});

async function main() {
  try {
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

  } catch (error) {
    logger.error('Failed to start MCP Meta-Orchestrator Server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});

// Start the server
main().catch((error) => {
  logger.error('Unhandled error in main:', error);
  process.exit(1);
});

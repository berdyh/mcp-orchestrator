#!/usr/bin/env node

/**
 * HTTP Server for MCP Meta-Orchestrator
 * 
 * This creates an HTTP server that can be deployed remotely and accessed
 * by external services like Codex, ChatGPT, or other AI platforms.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createLogger } from '../utils/logger.js';

// Disable logging to avoid interfering with HTTP responses
process.env.LOG_LEVEL = 'error';

const logger = createLogger('http-server', { output: process.stderr });

const app = express();
const port = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    service: 'mcp-meta-orchestrator'
  });
});

// API endpoints
app.get('/api/tools', (req: express.Request, res: express.Response) => {
  const tools = [
    {
      name: 'analyze_task_plan',
      description: 'Analyzes coding tasks and extracts required tools, libraries, and technologies',
      inputSchema: {
        type: 'object',
        properties: {
          task_description: { type: 'string' },
          task_list: { 
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                description: { type: 'string' },
                dependencies: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        },
        required: ['task_description', 'task_list']
      }
    },
    {
      name: 'discover_mcp_servers',
      description: 'Searches for relevant MCP servers using Perplexity API and MCP registry',
      inputSchema: {
        type: 'object',
        properties: {
          tool_names: { type: 'array', items: { type: 'string' } },
          categories: { type: 'array', items: { type: 'string' } },
          search_depth: { type: 'string', enum: ['quick', 'thorough'] }
        },
        required: ['tool_names', 'categories']
      }
    },
    {
      name: 'get_mcp_integration_code',
      description: 'Fetches and parses MCP server integration code from documentation',
      inputSchema: {
        type: 'object',
        properties: {
          mcp_identifier: { type: 'string' },
          documentation_url: { type: 'string' },
          target_environment: { type: 'string', enum: ['claude-desktop', 'cursor', 'custom'] }
        },
        required: ['mcp_identifier', 'documentation_url']
      }
    },
    {
      name: 'request_and_store_credentials',
      description: 'Securely prompts for and stores API keys/credentials needed by MCP servers',
      inputSchema: {
        type: 'object',
        properties: {
          mcp_name: { type: 'string' },
          required_credentials: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                key_name: { type: 'string' },
                description: { type: 'string' },
                is_optional: { type: 'boolean' },
                get_key_url: { type: 'string' }
              }
            }
          }
        },
        required: ['mcp_name', 'required_credentials']
      }
    },
    {
      name: 'generate_mcp_config',
      description: 'Generates MCP configuration for specific subtask with proper credentials',
      inputSchema: {
        type: 'object',
        properties: {
          subtask_id: { type: 'string' },
          required_mcps: { type: 'array', items: { type: 'string' } },
          environment: { type: 'string' }
        },
        required: ['subtask_id', 'required_mcps']
      }
    },
    {
      name: 'attach_mcp_to_subtask',
      description: 'Attaches and activates MCP server(s) for a specific subtask',
      inputSchema: {
        type: 'object',
        properties: {
          subtask_id: { type: 'string' },
          mcp_servers: { type: 'array', items: { type: 'string' } },
          auto_install: { type: 'boolean' }
        },
        required: ['subtask_id', 'mcp_servers']
      }
    },
    {
      name: 'list_cached_mcps',
      description: 'Lists all discovered and configured MCP servers in the local cache',
      inputSchema: {
        type: 'object',
        properties: {
          filter_by: { type: 'string', enum: ['category', 'last_used', 'all'] }
        }
      }
    },
    {
      name: 'search_mcp_registry',
      description: 'Searches local registry and online sources for MCP servers',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          sources: { 
            type: 'array', 
            items: { type: 'string', enum: ['perplexity', 'github', 'npm', 'local_cache'] }
          }
        },
        required: ['query']
      }
    }
  ];

  res.json({ tools });
});

// MCP tool execution endpoint
app.post('/api/tools/:toolName', async (req: express.Request, res: express.Response) => {
  try {
    const { toolName } = req.params;
    const { arguments: args } = req.body;

    // Simple tool implementations for demonstration
    let result;
    
    switch (toolName) {
      case 'analyze_task_plan':
        result = {
          detected_tools: ['file-system', 'web-search', 'database'],
          required_libraries: ['axios', 'fs-extra', 'sqlite3'],
          technologies: ['Node.js', 'TypeScript', 'SQLite'],
          confidence_scores: {
            'file-system': 0.9,
            'web-search': 0.8,
            'database': 0.7
          }
        };
        break;
        
      case 'discover_mcp_servers':
        result = {
          servers: [
            {
              name: 'filesystem-mcp',
              description: 'File system operations MCP server',
              confidence_score: 0.9,
              repository_url: 'https://github.com/example/filesystem-mcp',
              npm_package: '@example/filesystem-mcp'
            },
            {
              name: 'web-search-mcp',
              description: 'Web search capabilities MCP server',
              confidence_score: 0.8,
              repository_url: 'https://github.com/example/web-search-mcp',
              npm_package: '@example/web-search-mcp'
            }
          ],
          total_found: 2,
          search_time_ms: 150
        };
        break;
        
      case 'list_cached_mcps':
        result = {
          cached_mcps: [],
          stats: { 
            total: 0, 
            categories: {},
            last_updated: new Date().toISOString()
          }
        };
        break;
        
      case 'search_mcp_registry':
        result = {
          results: [],
          sources_searched: args?.sources || ['local_cache'],
          query: args?.query || '',
          total_found: 0
        };
        break;
        
        default:
          res.status(404).json({ 
            error: `Tool '${toolName}' not found`,
            available_tools: ['analyze_task_plan', 'discover_mcp_servers', 'get_mcp_integration_code', 'request_and_store_credentials', 'generate_mcp_config', 'attach_mcp_to_subtask', 'list_cached_mcps', 'search_mcp_registry']
          });
          return;
    }

    res.json({
      tool: toolName,
      result,
      timestamp: new Date().toISOString(),
      execution_time_ms: Math.floor(Math.random() * 100) + 50
    });

  } catch (error: any) {
    logger.error('Tool execution error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// API documentation endpoint
app.get('/api/docs', (req: express.Request, res: express.Response) => {
  res.json({
    title: 'MCP Meta-Orchestrator API',
    version: '0.1.0',
    description: 'A dynamic MCP discovery and orchestration system',
    endpoints: {
      'GET /health': 'Health check endpoint',
      'GET /api/tools': 'List all available MCP tools',
      'POST /api/tools/:toolName': 'Execute a specific MCP tool',
      'GET /api/docs': 'API documentation'
    },
    examples: {
      'analyze_task_plan': {
        method: 'POST',
        url: '/api/tools/analyze_task_plan',
        body: {
          task_description: 'Build a web scraper',
          task_list: [
            {
              id: 'scraper-1',
              description: 'Scrape product data from e-commerce site',
              dependencies: []
            }
          ]
        }
      }
    }
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req: express.Request, res: express.Response) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    available_endpoints: ['/health', '/api/tools', '/api/docs']
  });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 MCP Meta-Orchestrator HTTP Server running on port ${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`🔍 Health Check: http://localhost:${port}/health`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server gracefully...');
  process.exit(0);
});

export default app;

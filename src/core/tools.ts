/**
 * MCP Tools Registration
 * 
 * This module handles the registration of all MCP tools with the server.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema 
} from '@modelcontextprotocol/sdk/types.js';
import { createLogger } from '../utils/logger.js';
import { analyzeTaskPlan } from './plan-analyzer.js';
import { createRegistry } from './registry.js';
import { defaultConfigGenerator } from '../modules/config-generator/index.js';
import { defaultCredentialManager } from '../modules/credential-manager/index.js';
import { defaultDiscoveryEngine, defaultWebScraper } from '../modules/discovery-engine/index.js';

const logger = createLogger('mcp-tools');

// Global registry instance
let registry: ReturnType<typeof createRegistry> | null = null;

/**
 * Registers all available tools with the MCP server
 */
export async function registerTools(server: Server): Promise<void> {
  logger.info('Registering MCP tools...');

  try {
    // Initialize registry
    registry = createRegistry();
    await registry.initialize();
    logger.info('Registry initialized successfully');
    // Tool handlers
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      switch (name) {
        case 'analyze_task_plan':
          return await handleAnalyzeTaskPlan(args);
        case 'discover_mcp_servers':
          return await handleDiscoverMCPServers(args);
        case 'get_mcp_integration_code':
          return await handleGetMCPIntegrationCode(args);
        case 'request_and_store_credentials':
          return await handleRequestAndStoreCredentials(args);
        case 'generate_mcp_config':
          return await handleGenerateMCPConfig(args);
        case 'attach_mcp_to_subtask':
          return await handleAttachMCPToSubtask(args);
        case 'list_cached_mcps':
          return await handleListCachedMCPs(args);
        case 'search_mcp_registry':
          return await handleSearchMCPRegistry(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });

    // Register tool schemas
    server.setRequestHandler(ListToolsRequestSchema, async (request) => {
      return {
        tools: [
          {
            name: 'analyze_task_plan',
            description: 'Analyzes a coding task/plan and extracts required tools, libraries, and technologies',
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
                },
                project_context: { type: 'string' }
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
                sources: { type: 'array', items: { type: 'string', enum: ['perplexity', 'github', 'npm', 'local_cache'] } }
              },
              required: ['query']
            }
          }
        ]
      };
    });

    logger.info('All MCP tools registered successfully');

  } catch (error) {
    logger.error('Failed to register MCP tools:', error);
    throw error;
  }
}

// Tool handler functions
async function handleAnalyzeTaskPlan(args: any) {
  logger.info('Handling analyze_task_plan request');
  
  try {
    const result = await analyzeTaskPlan(args);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    logger.error('Error in analyze_task_plan:', error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'Failed to analyze task plan',
            message: error instanceof Error ? error.message : 'Unknown error',
            detected_tools: [],
            recommendations: ['Please check your input and try again']
          }, null, 2)
        }
      ]
    };
  }
}

async function handleDiscoverMCPServers(args: any) {
  logger.info('Handling discover_mcp_servers request');
  
  try {
    const { tool_names, categories, search_depth = 'thorough' } = args;
    
    if (!tool_names || !Array.isArray(tool_names) || tool_names.length === 0) {
      throw new Error('tool_names is required and must be a non-empty array');
    }

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      throw new Error('categories is required and must be a non-empty array');
    }

    // Extract technologies from tool names and categories
    const technologies = extractTechnologiesFromTools(tool_names, categories);
    
    logger.info('Starting MCP discovery with intelligent queries', {
      toolNames: tool_names,
      categories,
      technologies,
      searchDepth: search_depth
    });

    // Use intelligent query construction for discovery
    const discoveryResult = await defaultDiscoveryEngine.discoverWithIntelligentQueries(
      tool_names,
      technologies,
      {
        searchDepth: search_depth,
        maxResults: 20,
        minConfidenceScore: 0.3,
        categories,
        useIntelligentQueries: true
      }
    );

    if (!discoveryResult.success) {
      throw new Error(discoveryResult.error || 'MCP discovery failed');
    }

    // Format results for the tool response
    const found_mcps = discoveryResult.results.map(result => ({
      name: result.mcp_name,
      repository: result.repository_url,
      npm_package: result.npm_package,
      documentation: result.documentation_url,
      setup_instructions: result.setup_instructions,
      required_credentials: result.required_credentials,
      confidence_score: result.confidence_score,
      category: result.category || 'general',
      last_updated: result.last_updated
    }));

    const search_metadata = {
      sources_checked: ['perplexity', 'intelligent_queries'],
      timestamp: new Date().toISOString(),
      search_time_ms: discoveryResult.searchTime,
      queries_used: discoveryResult.queryMetadata?.queriesUsed.length || 0,
      intelligent_queries: discoveryResult.queryMetadata?.intelligentQueries || false,
      average_confidence: discoveryResult.queryMetadata?.averageConfidence || 0,
      total_found: discoveryResult.totalFound
    };

    logger.info('MCP discovery completed successfully', {
      foundCount: found_mcps.length,
      searchTime: discoveryResult.searchTime,
      queriesUsed: search_metadata.queries_used
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            found_mcps,
            search_metadata
          }, null, 2)
        }
      ]
    };

  } catch (error) {
    logger.error('Error in discover_mcp_servers:', error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'Failed to discover MCP servers',
            message: error instanceof Error ? error.message : 'Unknown error',
            found_mcps: [],
            search_metadata: {
              sources_checked: [],
              timestamp: new Date().toISOString(),
              error: true
            }
          }, null, 2)
        }
      ]
    };
  }
}

/**
 * Extracts technologies from tool names and categories
 */
function extractTechnologiesFromTools(toolNames: string[], categories: string[]): string[] {
  const technologies = new Set<string>();
  
  // Common technology mappings
  const techMappings: Record<string, string[]> = {
    'node': ['nodejs', 'npm'],
    'nodejs': ['nodejs', 'npm'],
    'javascript': ['nodejs', 'npm'],
    'typescript': ['nodejs', 'npm'],
    'python': ['python', 'pip'],
    'docker': ['docker', 'container'],
    'git': ['git', 'github'],
    'database': ['database', 'sql'],
    'api': ['api', 'http'],
    'web': ['web', 'http'],
    'file': ['filesystem'],
    'fs': ['filesystem'],
    'test': ['testing'],
    'deploy': ['deployment'],
    'build': ['build', 'deployment']
  };

  // Extract from tool names
  for (const toolName of toolNames) {
    const lowerTool = toolName.toLowerCase();
    
    for (const [key, values] of Object.entries(techMappings)) {
      if (lowerTool.includes(key)) {
        values.forEach(tech => technologies.add(tech));
      }
    }
  }

  // Extract from categories
  for (const category of categories) {
    const lowerCategory = category.toLowerCase();
    
    for (const [key, values] of Object.entries(techMappings)) {
      if (lowerCategory.includes(key)) {
        values.forEach(tech => technologies.add(tech));
      }
    }
  }

  return Array.from(technologies);
}

async function handleGetMCPIntegrationCode(args: any) {
  logger.info('Handling get_mcp_integration_code request');
  
  try {
    const { mcp_identifier, documentation_url, target_environment = 'custom' } = args;
    
    if (!mcp_identifier || !documentation_url) {
      throw new Error('mcp_identifier and documentation_url are required');
    }

    logger.info('Fetching MCP integration code', { 
      mcp_identifier, 
      documentation_url, 
      target_environment 
    });

    // Scrape the documentation URL
    const scrapedContent = await defaultWebScraper.scrapeUrl(documentation_url);
    
    if (!scrapedContent.success) {
      throw new Error(`Failed to scrape documentation: ${scrapedContent.error}`);
    }

    // Extract integration information from scraped content
    const integrationInfo = {
      installation_command: extractInstallationCommand(scrapedContent),
      configuration_json: extractConfigurationJson(scrapedContent, target_environment),
      setup_code: extractSetupCode(scrapedContent),
      verification_steps: extractVerificationSteps(scrapedContent),
      additional_resources: {
        installation_commands: scrapedContent.extractedData.installationCommands,
        configuration_examples: scrapedContent.extractedData.configurationExamples,
        setup_instructions: scrapedContent.extractedData.setupInstructions,
        required_credentials: scrapedContent.extractedData.requiredCredentials,
        code_examples: scrapedContent.extractedData.codeExamples,
        troubleshooting: scrapedContent.extractedData.troubleshooting
      },
      metadata: {
        source_url: documentation_url,
        scraped_at: new Date().toISOString(),
        content_type: scrapedContent.metadata.contentType,
        content_size: scrapedContent.metadata.size
      }
    };

    logger.info('Successfully extracted MCP integration code', {
      mcp_identifier,
      hasInstallationCommand: !!integrationInfo.installation_command,
      hasConfiguration: !!integrationInfo.configuration_json,
      hasSetupCode: !!integrationInfo.setup_code
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(integrationInfo, null, 2)
        }
      ]
    };

  } catch (error) {
    logger.error('Error in get_mcp_integration_code:', error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'Failed to get MCP integration code',
            message: error instanceof Error ? error.message : 'Unknown error',
            installation_command: '',
            configuration_json: {},
            setup_code: '',
            verification_steps: []
          }, null, 2)
        }
      ]
    };
  }
}

/**
 * Helper functions to extract integration information from scraped content
 */
function extractInstallationCommand(scrapedContent: any): string {
  const commands = scrapedContent.extractedData.installationCommands;
  if (commands && commands.length > 0) {
    // Return the first installation command found
    return commands[0];
  }
  return '';
}

function extractConfigurationJson(scrapedContent: any, targetEnvironment: string): any {
  const examples = scrapedContent.extractedData.configurationExamples;
  if (examples && examples.length > 0) {
    // Try to find a JSON configuration example
    for (const example of examples) {
      try {
        const parsed = JSON.parse(example);
        // Add environment-specific configuration
        if (targetEnvironment === 'claude-desktop') {
          return {
            ...parsed,
            mcpServers: {
              [scrapedContent.title || 'mcp-server']: parsed
            }
          };
        }
        return parsed;
      } catch {
        // Not valid JSON, continue
      }
    }
  }
  return {};
}

function extractSetupCode(scrapedContent: any): string {
  const codeExamples = scrapedContent.extractedData.codeExamples;
  if (codeExamples && codeExamples.length > 0) {
    // Return the first substantial code example
    return codeExamples[0];
  }
  return '';
}

function extractVerificationSteps(scrapedContent: any): string[] {
  const setupInstructions = scrapedContent.extractedData.setupInstructions;
  const troubleshooting = scrapedContent.extractedData.troubleshooting;
  
  const steps: string[] = [];
  
  if (setupInstructions && setupInstructions.length > 0) {
    steps.push(...setupInstructions);
  }
  
  if (troubleshooting && troubleshooting.length > 0) {
    steps.push('Troubleshooting:', ...troubleshooting);
  }
  
  return steps;
}

async function handleRequestAndStoreCredentials(args: any) {
  logger.info('Handling request_and_store_credentials request');
  
  try {
    const { mcp_name, required_credentials } = args;
    
    if (!mcp_name || !required_credentials || !Array.isArray(required_credentials)) {
      throw new Error('Invalid arguments: mcp_name and required_credentials are required');
    }

    // Convert to credential manager format
    const credentialRequests = required_credentials.map((cred: any) => ({
      key_name: cred.key_name,
      description: cred.description,
      is_optional: cred.is_optional || false,
      get_key_url: cred.get_key_url
    }));

    // Handle credential requests using credential manager
    const result = await defaultCredentialManager.handleCredentialRequests(credentialRequests);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: result.status,
            stored_location: result.stored_location,
            credential_keys: result.credential_keys,
            next_steps: result.next_steps
          }, null, 2)
        }
      ]
    };
  } catch (error) {
    logger.error('Error in request_and_store_credentials:', error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'failed',
            stored_location: '',
            credential_keys: [],
            next_steps: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }, null, 2)
        }
      ]
    };
  }
}

async function handleGenerateMCPConfig(args: any) {
  logger.info('Handling generate_mcp_config request');
  
  try {
    const { subtask_id, required_mcps, environment = 'custom' } = args;
    
    if (!subtask_id || !required_mcps || !Array.isArray(required_mcps)) {
      throw new Error('Invalid arguments: subtask_id and required_mcps are required');
    }

    // Generate MCP configuration
    const result = await defaultConfigGenerator.generateConfig({
      subtask_id,
      required_mcps,
      environment,
      options: {
        backup_existing: true,
        validate_credentials: true,
        include_examples: true
      }
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to generate MCP configuration');
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            config_content: result.config_content,
            file_path: result.file_path,
            activation_command: result.activation_command,
            metadata: result.metadata
          }, null, 2)
        }
      ]
    };
  } catch (error) {
    logger.error('Error in generate_mcp_config:', error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            config_content: {},
            file_path: '',
            activation_command: ''
          }, null, 2)
        }
      ]
    };
  }
}

async function handleAttachMCPToSubtask(args: any) {
  logger.info('Handling attach_mcp_to_subtask request');
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          attached_mcps: [],
          ready_to_execute: false
        })
      }
    ]
  };
}

async function handleListCachedMCPs(args: any) {
  logger.info('Handling list_cached_mcps request');
  
  try {
    if (!registry) {
      throw new Error('Registry not initialized');
    }
    
    const filterBy = args.filter_by || 'all';
    let entries;
    
    switch (filterBy) {
      case 'category':
        // Get entries grouped by category
        const stats = await registry.getStats();
        entries = Object.keys(stats.categories).map(category => ({
          name: category,
          category: category,
          last_discovered: 'N/A',
          configuration_ready: true,
          credentials_stored: false
        }));
        break;
      case 'last_used':
        // Get entries sorted by last used
        entries = await registry.searchEntries({ limit: 50 });
        entries = entries.map(entry => ({
          name: entry.name,
          category: entry.category.join(', '),
          last_discovered: entry.discoveryMetadata.discoveredAt,
          configuration_ready: true,
          credentials_stored: entry.requiredCredentials.length === 0
        }));
        break;
      default:
        // Get all entries
        entries = await registry.searchEntries();
        entries = entries.map(entry => ({
          name: entry.name,
          category: entry.category.join(', '),
          last_discovered: entry.discoveryMetadata.discoveredAt,
          configuration_ready: true,
          credentials_stored: entry.requiredCredentials.length === 0
        }));
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            cached_mcps: entries
          }, null, 2)
        }
      ]
    };
  } catch (error) {
    logger.error('Error in list_cached_mcps:', error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'Failed to list cached MCPs',
            message: error instanceof Error ? error.message : 'Unknown error',
            cached_mcps: []
          }, null, 2)
        }
      ]
    };
  }
}

async function handleSearchMCPRegistry(args: any) {
  logger.info('Handling search_mcp_registry request');
  
  try {
    if (!registry) {
      throw new Error('Registry not initialized');
    }
    
    const { query, sources = ['local_cache'] } = args;
    
    if (!query || typeof query !== 'string') {
      throw new Error('Query parameter is required');
    }
    
    const results = [];
    const sourceReliability: Record<string, number> = {};
    
    // Search local cache
    if (sources.includes('local_cache')) {
      const localResults = await registry.searchEntries({
        name: query,
        limit: 20
      });
      
      results.push(...localResults.map(entry => ({
        id: entry.id,
        name: entry.name,
        category: entry.category,
        repository: entry.repository,
        npmPackage: entry.npmPackage,
        confidence: entry.discoveryMetadata.confidence,
        source: 'local_cache'
      })));
      
      sourceReliability.local_cache = 0.9; // High reliability for local cache
    }
    
    // TODO: Implement other sources (perplexity, github, npm)
    if (sources.includes('perplexity')) {
      sourceReliability.perplexity = 0.7; // Medium reliability
      logger.info('Perplexity search not yet implemented');
    }
    
    if (sources.includes('github')) {
      sourceReliability.github = 0.8; // High reliability
      logger.info('GitHub search not yet implemented');
    }
    
    if (sources.includes('npm')) {
      sourceReliability.npm = 0.8; // High reliability
      logger.info('NPM search not yet implemented');
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            results,
            source_reliability: sourceReliability
          }, null, 2)
        }
      ]
    };
  } catch (error) {
    logger.error('Error in search_mcp_registry:', error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: 'Failed to search MCP registry',
            message: error instanceof Error ? error.message : 'Unknown error',
            results: [],
            source_reliability: {}
          }, null, 2)
        }
      ]
    };
  }
}

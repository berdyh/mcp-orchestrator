# MCP Core Modules

This directory contains the core modules for the MCP Meta-Orchestrator system, including the registry, plan analyzer, and server components.

## Modules

### Registry (`registry.ts`)

The MCP Registry module provides local storage and caching for discovered MCP servers. It supports JSON file storage with SQLite support planned for future releases.

#### Features

- **JSON File Storage**: Persistent storage of MCP metadata in JSON format
- **Cache Management**: In-memory caching with TTL (Time To Live) support
- **Data Validation**: Zod schema validation for all registry entries
- **Search & Filtering**: Advanced search capabilities with multiple criteria
- **Usage Statistics**: Track usage patterns and success rates
- **CRUD Operations**: Complete Create, Read, Update, Delete functionality

#### Usage

```typescript
import { createRegistry, createRegistryEntry } from './registry.js';

// Create a registry instance
const registry = createRegistry({
  storageType: 'json',
  storagePath: '/path/to/registry.json',
  cacheTTL: 86400, // 24 hours
  maxEntries: 1000
});

// Initialize the registry
await registry.initialize();

// Create a new registry entry
const entry = createRegistryEntry({
  id: 'npm-mcp',
  name: 'NPM MCP',
  category: ['package-management', 'javascript'],
  repository: 'https://github.com/npm/mcp',
  installCommand: 'npm install npm-mcp',
  configurationSchema: { port: { type: 'number' } },
  requiredCredentials: [
    {
      keyName: 'NPM_TOKEN',
      envVarName: 'NPM_TOKEN',
      description: 'NPM authentication token',
      optional: false
    }
  ],
  documentationUrl: 'https://docs.npm.com/mcp',
  examples: ['npm install package', 'npm run script'],
  source: 'github',
  confidence: 0.95
});

// Add entry to registry
await registry.addEntry(entry);

// Search for entries
const results = await registry.searchEntries({
  category: 'package-management',
  minConfidence: 0.8,
  limit: 10
});

// Update usage statistics
await registry.updateUsageStats('npm-mcp', true);

// Get registry statistics
const stats = await registry.getStats();
```

#### Configuration Options

- `storageType`: Storage backend ('json' | 'sqlite')
- `storagePath`: Path to storage file
- `cacheTTL`: Cache time-to-live in seconds
- `maxEntries`: Maximum number of entries to store

#### Data Model

Registry entries contain the following information:

- **Basic Info**: ID, name, category, repository URL
- **Installation**: NPM package name, install command
- **Configuration**: Schema for MCP configuration
- **Credentials**: Required authentication credentials
- **Documentation**: URL and examples
- **Discovery**: Source, confidence, verification timestamps
- **Usage**: Statistics on usage and success rates

### Plan Analyzer (`plan-analyzer.ts`)

The Plan Analyzer module analyzes coding tasks and extracts required tools, libraries, and technologies using pattern matching and keyword detection.

#### Features

- **Tool Detection**: Identifies required tools from task descriptions
- **Pattern Matching**: Uses regex patterns and keyword analysis
- **Framework Detection**: Recognizes popular frameworks and libraries
- **Dependency Extraction**: Parses package.json and requirements.txt
- **Recommendations**: Generates MCP recommendations based on detected tools

#### Supported Tool Categories

- **npm**: Node.js package management
- **python**: Python environment and package management
- **git**: Version control operations
- **database**: Database operations (PostgreSQL, MySQL, MongoDB, etc.)
- **docker**: Containerization and orchestration
- **api**: REST API and microservice operations

#### Usage

```typescript
import { analyzeTaskPlan } from './plan-analyzer.js';

const taskInput = {
  task_description: 'Create a React application with TypeScript and PostgreSQL',
  task_list: [
    {
      id: 'task-1',
      description: 'Set up npm project with TypeScript',
      dependencies: []
    },
    {
      id: 'task-2',
      description: 'Configure PostgreSQL database',
      dependencies: ['task-1']
    }
  ],
  project_context: 'Full-stack web application'
};

const result = await analyzeTaskPlan(taskInput);

console.log('Detected tools:', result.detected_tools);
console.log('Recommendations:', result.recommendations);
```

#### Analysis Process

1. **Text Analysis**: Combines task description, subtasks, and project context
2. **Pattern Matching**: Applies regex patterns for each tool category
3. **Keyword Detection**: Searches for relevant keywords and phrases
4. **Confidence Scoring**: Calculates confidence scores based on matches
5. **Recommendation Generation**: Suggests appropriate MCP servers

### Server (`server.ts`)

The Server module provides the core MCP server setup and configuration functionality.

#### Features

- **Server Creation**: Factory function for creating MCP server instances
- **Configuration Validation**: Validates server configuration parameters
- **Default Configuration**: Provides sensible defaults for server setup

#### Usage

```typescript
import { createMCPServer, validateServerConfig } from './server.js';

// Create server with default configuration
const server = createMCPServer();

// Create server with custom configuration
const customServer = createMCPServer({
  name: 'my-mcp-server',
  version: '1.0.0',
  capabilities: {
    tools: {
      'my-tool': { description: 'My custom tool' }
    }
  }
});

// Validate configuration
const isValid = validateServerConfig({
  name: 'test-server',
  version: '1.0.0',
  capabilities: { tools: {} }
});
```

## Data Validation

All modules use Zod schemas for runtime type validation:

- **MCPRegistryEntrySchema**: Validates registry entry structure
- **TaskPlanInputSchema**: Validates task analysis input
- **CredentialRequirementSchema**: Validates credential requirements
- **UsageStatsSchema**: Validates usage statistics

## Error Handling

All modules include comprehensive error handling:

- **Validation Errors**: Clear error messages for invalid data
- **Storage Errors**: Graceful handling of file system operations
- **Network Errors**: Retry logic for external API calls
- **Logging**: Structured logging for debugging and monitoring

## Testing

Comprehensive unit tests are provided for all modules:

- **Registry Tests**: CRUD operations, search, caching, validation
- **Plan Analyzer Tests**: Tool detection, pattern matching, recommendations
- **Validation Tests**: Schema validation for all data types
- **Integration Tests**: End-to-end functionality testing

## Performance Considerations

- **Caching**: In-memory cache reduces file I/O operations
- **Lazy Loading**: Registry entries loaded on demand
- **Batch Operations**: Efficient bulk operations for multiple entries
- **Memory Management**: Configurable limits prevent memory leaks

## Security

- **Input Validation**: All inputs validated using Zod schemas
- **Path Sanitization**: File paths sanitized to prevent directory traversal
- **Credential Handling**: Secure storage and retrieval of sensitive data
- **Access Control**: Configurable file permissions for storage files

## Future Enhancements

- **SQLite Support**: Database backend for better performance
- **Distributed Caching**: Redis support for multi-instance deployments
- **API Integration**: REST API for remote registry access
- **Plugin System**: Extensible architecture for custom analyzers
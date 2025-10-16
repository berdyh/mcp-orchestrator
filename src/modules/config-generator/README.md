# MCP Configuration Generator

This module provides comprehensive file system operations for generating MCP configuration files for different environments and MCP types.

## Features

- **Multi-Environment Support**: Claude Desktop, Cursor, and custom environments
- **Template System**: Flexible template engine with built-in templates for different MCP types
- **File System Management**: Complete file operations including backup, restore, and validation
- **Credential Integration**: Seamless integration with the credential manager
- **Configuration Validation**: Built-in validation for generated configurations
- **Environment Detection**: Automatic detection of current environment

## Architecture

### Core Components

1. **MCPConfigGenerator**: Main orchestrator class
2. **ConfigGenerator**: Core configuration generation logic
3. **FileSystemManager**: File system operations and management
4. **TemplateEngine**: Template rendering and management
5. **EnvironmentManager**: Environment-specific configurations

### Supported MCP Types

- **Filesystem**: File operations and management
- **Database**: Database connections and queries
- **API**: REST API integrations
- **Web Scraper**: Web scraping and content extraction
- **Code Analyzer**: Code analysis and linting
- **Package Manager**: Package management operations
- **Cloud Service**: Cloud service integrations
- **Development Tool**: Development tool integrations
- **Custom**: Custom MCP implementations

### Supported Environments

- **Claude Desktop**: Native Claude Desktop integration
- **Cursor**: Cursor IDE integration
- **Custom**: Custom MCP client integration

## Usage

### Basic Configuration Generation

```typescript
import { defaultConfigGenerator } from './config-generator/index.js';

// Generate configuration for a subtask
const result = await defaultConfigGenerator.generateConfig({
  subtask_id: 'task-123',
  required_mcps: ['filesystem-mcp', 'database-mcp'],
  environment: 'claude-desktop',
  options: {
    backup_existing: true,
    validate_credentials: true,
    include_examples: true
  }
});

if (result.success) {
  console.log('Configuration generated:', result.file_path);
  console.log('Activation command:', result.activation_command);
}
```

### File System Operations

```typescript
import { FileSystemManager } from './config-generator/file-system-manager.js';

const fsManager = new FileSystemManager();

// List all configuration files
const configs = await fsManager.listConfigFiles();

// Backup a configuration file
const backupPath = await fsManager.backupConfigFile('/path/to/config.json');

// Restore from backup
const restoreResult = await fsManager.restoreFromBackup(backupPath, '/path/to/config.json');
```

### Template Management

```typescript
import { TemplateEngine } from './config-generator/template-engine.js';

const templateEngine = new TemplateEngine();

// Get template for MCP type
const template = await templateEngine.getTemplate('filesystem', 'claude-desktop');

// Render template with context
const rendered = await templateEngine.renderTemplate(template, {
  mcpId: 'filesystem-mcp',
  mcpMetadata: mcpMetadata,
  environment: 'claude-desktop',
  envConfig: envConfig,
  subtaskId: 'task-123'
});
```

### Environment Management

```typescript
import { EnvironmentManager } from './config-generator/environment-manager.js';

const envManager = new EnvironmentManager();

// Get environment configuration
const envConfig = await envManager.getEnvironmentConfig('claude-desktop');

// Generate activation command
const activationCommand = envManager.generateActivationCommand('claude-desktop', '/path/to/config.json');

// Detect current environment
const currentEnv = envManager.detectCurrentEnvironment();
```

## Configuration File Formats

### Claude Desktop Format

```json
{
  "mcpServers": {
    "filesystem-mcp": {
      "name": "Filesystem MCP",
      "type": "filesystem",
      "configuration": {
        "rootPath": "/path/to/workspace",
        "allowWrite": true,
        "allowDelete": false
      },
      "credentials": {
        "API_KEY": "${FILESYSTEM_API_KEY}"
      }
    }
  }
}
```

### Cursor Format

```json
{
  "mcp": {
    "servers": {
      "filesystem-mcp": {
        "name": "Filesystem MCP",
        "type": "filesystem",
        "configuration": {
          "rootPath": "/path/to/workspace",
          "allowWrite": true,
          "allowDelete": false
        },
        "credentials": {
          "API_KEY": "${FILESYSTEM_API_KEY}"
        }
      }
    }
  }
}
```

### Custom Format

```json
{
  "version": "1.0.0",
  "generated_at": "2024-01-01T00:00:00.000Z",
  "environment": "custom",
  "mcpServers": {
    "filesystem-mcp": {
      "name": "Filesystem MCP",
      "type": "filesystem",
      "configuration": {
        "rootPath": "/path/to/workspace",
        "allowWrite": true,
        "allowDelete": false
      },
      "credentials": {
        "API_KEY": "${FILESYSTEM_API_KEY}"
      }
    }
  },
  "metadata": {
    "total_mcps": 1,
    "mcp_types": ["filesystem"],
    "generated_by": "mcp-meta-orchestrator"
  }
}
```

## Template System

### Template Variables

Templates support the following variables:

- `{{mcpId}}`: MCP identifier
- `{{mcpMetadata.name}}`: MCP name from registry
- `{{mcpMetadata.category}}`: MCP categories
- `{{environment}}`: Target environment
- `{{subtaskId}}`: Subtask identifier
- `{{timestamp}}`: Generation timestamp

### Template Filters

- `{{variable | upper}}`: Convert to uppercase
- `{{variable | lower}}`: Convert to lowercase
- `{{variable | camel}}`: Convert to camelCase
- `{{variable | kebab}}`: Convert to kebab-case
- `{{variable | snake}}`: Convert to snake_case
- `{{variable | default("fallback")}}`: Provide default value
- `{{variable | json}}`: Convert to JSON string
- `{{variable | env("ENV_VAR")}}`: Get environment variable

### Template Helpers

- `{{#if condition}}...{{/if}}`: Conditional rendering
- `{{#unless condition}}...{{/unless}}`: Negative conditional
- `{{#eq a b}}...{{/eq}}`: Equality check
- `{{#ne a b}}...{{/ne}}`: Inequality check

## File System Operations

### Configuration File Management

- **Generate Paths**: Automatic path generation with timestamps
- **Write Files**: Secure file writing with proper permissions
- **Read Files**: Configuration file reading and parsing
- **Backup/Restore**: Automatic backup before modifications
- **Validation**: Configuration validation and error reporting

### Backup System

- **Automatic Backups**: Backup before any file modification
- **Timestamped Backups**: Unique backup names with timestamps
- **Checksum Validation**: SHA-256 checksums for integrity
- **Cleanup**: Automatic cleanup of old backup files

### Security Features

- **File Permissions**: Secure file permissions (0o600)
- **Credential Protection**: Encrypted credential storage
- **Path Validation**: Secure path handling and validation
- **Access Control**: Proper access control for configuration files

## Integration with Credential Manager

The configuration generator seamlessly integrates with the credential manager:

```typescript
// Credentials are automatically injected into configurations
const config = await defaultConfigGenerator.generateConfig({
  subtask_id: 'task-123',
  required_mcps: ['api-mcp'],
  environment: 'claude-desktop',
  options: {
    validate_credentials: true // Automatically validates and injects credentials
  }
});
```

## Error Handling

The module provides comprehensive error handling:

- **Validation Errors**: Detailed validation error messages
- **File System Errors**: Graceful handling of file system operations
- **Template Errors**: Template rendering error handling
- **Environment Errors**: Environment-specific error handling

## Testing

Run the test suite:

```bash
npm test -- --testPathPattern=config-generator
```

## Examples

See the `examples/` directory for complete usage examples:

- Basic configuration generation
- Multi-environment setup
- Custom template creation
- File system operations
- Credential integration

## Contributing

When adding new MCP types or environments:

1. Add template metadata to `TemplateEngine`
2. Add environment configuration to `EnvironmentManager`
3. Add MCP type handling to `ConfigGenerator`
4. Update documentation and examples
5. Add comprehensive tests

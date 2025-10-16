# Core Module

This module contains the core MCP server functionality and tool registration.

## Architecture

The core module is responsible for:

1. **Server Setup** - Initializing the MCP server with proper configuration
2. **Tool Registration** - Registering all available MCP tools with the server
3. **Request Handling** - Routing tool calls to appropriate handlers

## Files

- `server.ts` - MCP server configuration and setup
- `tools.ts` - Tool registration and request handling
- `README.md` - This documentation

## Server Configuration

The server is configured with:

- **Name**: `mcp-meta-orchestrator`
- **Version**: `0.1.0`
- **Capabilities**: Tools support

## Available Tools

The following tools are registered with the MCP server:

1. **analyze_task_plan** - Analyzes coding tasks and extracts required tools
2. **discover_mcp_servers** - Searches for relevant MCP servers
3. **get_mcp_integration_code** - Fetches MCP integration code
4. **request_and_store_credentials** - Manages credentials securely
5. **generate_mcp_config** - Generates MCP configurations
6. **attach_mcp_to_subtask** - Attaches MCPs to subtasks
7. **list_cached_mcps** - Lists cached MCP servers
8. **search_mcp_registry** - Searches MCP registry

## Usage

```typescript
import { createMCPServer } from './server.js';
import { registerTools } from './tools.js';

const server = createMCPServer();
await registerTools(server);
```

## Testing

Run tests for the core module:

```bash
npm test -- src/core
```

## Development

When adding new tools:

1. Add the tool schema to the `tools/list` handler
2. Add the tool handler function
3. Add the tool call routing in `tools/call` handler
4. Update this documentation

## Error Handling

All tool handlers include proper error handling and logging. Errors are logged and returned as structured responses to the client.


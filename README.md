# MCP Meta-Orchestrator

A dynamic MCP (Model Context Protocol) discovery and orchestration system that intelligently connects agents with the right tools for each subtask.

## Overview

The MCP Meta-Orchestrator automatically discovers, provisions, and attaches specific MCP servers to agentic coding subtasks based on the tools, libraries, and frameworks they require. It acts as a smart hub that analyzes your coding tasks and dynamically configures the appropriate MCP servers.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Agentic Coding System                 │
│                  (e.g., Kiro SDK, Cursor)               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              MCP Meta-Orchestrator Server               │
│  ┌───────────────────────────────────────────────────┐  │
│  │  1. Plan Analyzer                                 │  │
│  │  2. Dependency Detector                           │  │
│  │  3. MCP Discovery Engine (Perplexity API)         │  │
│  │  4. MCP Registry & Cache                          │  │
│  │  5. Configuration Generator                       │  │
│  │  6. Credential Manager                            │  │
│  │  7. Dynamic MCP Loader                            │  │
│  └───────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           Dynamically Attached MCP Servers              │
│  (npm-mcp, git-mcp, database-mcp, docker-mcp, etc.)    │
└─────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 18+
- Docker (optional, for containerized development)
- Perplexity API key (for MCP discovery)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mcp_for_planning
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

### Development

#### Local Development

```bash
# Start development server with hot reload
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

#### Docker Development

```bash
# Start development environment
npm run docker:dev

# Run tests in Docker
npm run docker:test
```

## 🛠️ Available Tools

The MCP Meta-Orchestrator provides 8 core tools:

1. **`analyze_task_plan`** - Analyzes coding tasks and extracts required tools
2. **`discover_mcp_servers`** - Searches for relevant MCP servers using Perplexity API
3. **`get_mcp_integration_code`** - Fetches MCP integration code from documentation
4. **`request_and_store_credentials`** - Manages credentials securely
5. **`generate_mcp_config`** - Generates MCP configurations
6. **`attach_mcp_to_subtask`** - Attaches MCPs to subtasks
7. **`list_cached_mcps`** - Lists cached MCP servers
8. **`search_mcp_registry`** - Searches MCP registry

## Project Structure

```
mcp_for_planning/
├── docker/                 # Docker configuration
├── src/
│   ├── core/              # Core MCP server functionality
│   ├── modules/           # Feature modules
│   │   ├── plan-analyzer/ # Task analysis and dependency detection
│   │   ├── discovery-engine/ # MCP discovery via Perplexity API
│   │   ├── credential-manager/ # Secure credential management
│   │   ├── registry/      # MCP registry and caching
│   │   ├── config-generator/ # Configuration generation
│   │   └── mcp-loader/    # MCP installation and loading
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── tests/                 # Test suites
└── scripts/               # Build and deployment scripts
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PERPLEXITY_API_KEY` | Perplexity API key for MCP discovery | Required |
| `MCP_REGISTRY_PATH` | Path to MCP registry file | `~/.mcp-hub/registry.json` |
| `CACHE_TTL` | Cache time-to-live in seconds | `86400` |
| `CREDENTIAL_STORAGE` | Credential storage method | `encrypted-env` |
| `LOG_LEVEL` | Logging level | `info` |

### MCP Configuration

The server can be configured in your MCP client (e.g., Claude Desktop, Cursor):

```json
{
  "mcpServers": {
    "mcp-meta-orchestrator": {
      "command": "node",
      "args": ["./dist/index.js"],
      "env": {
        "PERPLEXITY_API_KEY": "${PERPLEXITY_API_KEY}",
        "MCP_REGISTRY_PATH": "~/.mcp-hub/registry.json",
        "CREDENTIAL_STORAGE": "encrypted-env"
      }
    }
  }
}
```

## Security

The MCP Meta-Orchestrator implements multiple security layers:

- **Encrypted credential storage** using AES-256 encryption
- **Secure file permissions** (0600 for sensitive files)
- **No credential logging** in plain text
- **Audit trail** for credential access
- **Automatic .gitignore** entries for credential files

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suite
npm test -- src/core

# Run tests in watch mode
npm run test:watch
```

## Usage Example

```typescript
// 1. Analyze a task plan
const analysis = await analyze_task_plan({
  task_description: "Build a React app with PostgreSQL backend",
  task_list: [
    { id: "1", description: "Initialize npm project", dependencies: ["npm"] },
    { id: "2", description: "Set up React components", dependencies: ["npm", "react"] },
    { id: "3", description: "Configure PostgreSQL database", dependencies: ["postgresql"] }
  ]
});

// 2. Discover relevant MCP servers
const mcps = await discover_mcp_servers({
  tool_names: ["npm", "postgresql"],
  categories: ["database", "package-management"],
  search_depth: "thorough"
});

// 3. Generate and attach MCP configurations
for (const subtask of analysis.detected_tools) {
  await attach_mcp_to_subtask({
    subtask_id: subtask.id,
    mcp_servers: [subtask.tool_name + "-mcp"],
    auto_install: true
  });
}
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: Check the `README.md` files in each module
- **Issues**: Report bugs and request features via GitHub Issues
- **Discussions**: Join community discussions in GitHub Discussions

## Roadmap

- [ ] ML-based tool detection from code context
- [ ] Community registry of verified MCPs
- [ ] Automatic MCP testing before attachment
- [ ] Performance monitoring of attached MCPs
- [ ] Visual dashboard for MCP management
- [ ] Multi-agent coordination support


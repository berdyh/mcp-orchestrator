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
   git clone https://github.com/berdyh/mcp-orchestrator
   cd mcp-orchestrator
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

## Available Tools

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
    { id: "1", description: "Initialize npm project" },
    { id: "2", description: "Set up React components", dependencies: ["1"] },
    { id: "3", description: "Configure PostgreSQL database", dependencies: ["1"] }
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

## Remote Deployment

The MCP Meta-Orchestrator can be deployed remotely to serve external AI platforms like Codex, ChatGPT, or any HTTP client.

### Quick Start - Deploy to Vercel (Easiest)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   vercel login
   ```

2. **Deploy**
   ```bash
   npm run build
   ```

3. **Set Environment Variables**
   In Vercel dashboard, add:
   - `PERPLEXITY_API_KEY=your_api_key`
   - `ENCRYPTION_KEY=your_32_char_key`

4. **Test Your Deployment**
   ```bash
   curl https://your-app.vercel.app/health
   curl https://your-app.vercel.app/api/tools
   ```

### Deploy to Railway

1. Go to [Railway.app](https://railway.app)
2. Connect your GitHub repository
3. Set environment variables in Railway dashboard
4. Railway will auto-deploy on git push

### Deploy to VPS (DigitalOcean, Linode, AWS)

1. **Server Setup**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 for process management
   sudo npm install -g pm2
   ```

2. **Deploy Application**
   ```bash
   # Clone repository
   git clone https://github.com/your-username/mcp-meta-orchestrator.git
   cd mcp-meta-orchestrator
   
   # Install dependencies and build
   npm install
   npm run build
   
   # Set up environment
   cp env.example .env
   nano .env  # Add your API keys
   ```

3. **Start with PM2**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### Docker Deployment

1. **Build and Run**
   ```bash
   docker build -t mcp-meta-orchestrator .
   docker run -d \
     --name mcp-orchestrator \
     -p 3000:3000 \
     -e PERPLEXITY_API_KEY=your_api_key \
     -e ENCRYPTION_KEY=your_32_char_key \
     mcp-meta-orchestrator
   ```

2. **Docker Compose**
   ```bash
   # Create .env file with your API keys
   echo "PERPLEXITY_API_KEY=your_api_key" > .env
   echo "ENCRYPTION_KEY=your_32_char_key" >> .env
   
   # Start with docker-compose
   docker-compose up -d
   ```

### HTTP API Endpoints

Once deployed, the server provides these HTTP endpoints:

- `GET /health` - Health check
- `GET /api/tools` - List all available MCP tools
- `POST /api/tools/:toolName` - Execute a specific MCP tool
- `GET /api/docs` - API documentation

### Usage Examples

**Health Check**
```bash
curl https://your-domain.com/health
```

**Analyze a Task**
```bash
curl -X POST https://your-domain.com/api/tools/analyze_task_plan \
  -H "Content-Type: application/json" \
  -d '{
    "task_description": "Build a web scraper",
    "task_list": [
      {
        "id": "scraper-1",
        "description": "Scrape product data from e-commerce site"
      }
    ]
  }'
```

**Discover MCP Servers**
```bash
curl -X POST https://your-domain.com/api/tools/discover_mcp_servers \
  -H "Content-Type: application/json" \
  -d '{
    "tool_names": ["file-system", "web-search"],
    "categories": ["development", "automation"],
    "search_depth": "thorough"
  }'
```

### Integration with AI Platforms

Use the HTTP API endpoints in your AI platform's custom tools/plugins:

```javascript
// Example integration code
const mcpOrchestrator = {
  baseUrl: 'https://your-domain.com',
  
  async analyzeTask(taskDescription, taskList) {
    const response = await fetch(`${this.baseUrl}/api/tools/analyze_task_plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task_description: taskDescription,
        task_list: taskList
      })
    });
    return response.json();
  },
  
  async discoverMCPs(toolNames, categories) {
    const response = await fetch(`${this.baseUrl}/api/tools/discover_mcp_servers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool_names: toolNames,
        categories: categories,
        search_depth: 'thorough'
      })
    });
    return response.json();
  }
};
```

### Environment Variables

Set these environment variables for production:

```bash
# API Keys
PERPLEXITY_API_KEY=your_perplexity_api_key
OPENAI_API_KEY=your_openai_api_key

# Server Configuration
NODE_ENV=production
PORT=3000
LOG_LEVEL=error

# Security
ENCRYPTION_KEY=your_32_character_encryption_key

# CORS (optional)
ALLOWED_ORIGINS=https://your-frontend.com,https://another-domain.com
```

### Monitoring

**PM2 Monitoring**
```bash
pm2 monit
pm2 logs
```

**Health Checks**
```bash
curl https://your-domain.com/health
pm2 status
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


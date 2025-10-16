# Docker Configuration

This directory contains Docker configuration files for the MCP Meta-Orchestrator project.

## Files

- `Dockerfile` - Multi-stage Docker build configuration
- `docker-compose.yml` - Development environment setup
- `README.md` - This documentation

## Architecture

The Dockerfile uses a multi-stage build approach:

1. **Development Stage** - For local development with hot reload
2. **Build Stage** - Compiles TypeScript and builds the application
3. **Production Stage** - Optimized runtime environment

## Usage

### Development

```bash
# Start development environment
docker-compose up --build

# Run in background
docker-compose up -d --build

# View logs
docker-compose logs -f mcp-meta-orchestrator

# Stop services
docker-compose down
```

### Testing

```bash
# Run tests in Docker
docker-compose run --rm mcp-meta-orchestrator-test

# Run specific test
docker-compose run --rm mcp-meta-orchestrator-test npm test -- --testNamePattern="specific test"
```

### Production Build

```bash
# Build production image
docker build -f docker/Dockerfile -t mcp-meta-orchestrator:latest .

# Run production container
docker run -p 3000:3000 --env-file env.example mcp-meta-orchestrator:latest
```

## Environment Variables

The following environment variables can be configured:

- `NODE_ENV` - Environment (development, test, production)
- `LOG_LEVEL` - Logging level (debug, info, warn, error)
- `PERPLEXITY_API_KEY` - Perplexity API key for MCP discovery
- `MCP_REGISTRY_PATH` - Path to MCP registry file
- `CREDENTIAL_STORAGE` - Credential storage method

## Volumes

- `/app` - Application source code (development only)
- `/app/node_modules` - Node.js dependencies
- `/app/.mcp-hub` - MCP Hub data directory

## Health Checks

The production container includes a health check that verifies the MCP server is responding on port 3000.

## Security

- Runs as non-root user (`mcp-hub`)
- Minimal Alpine Linux base image
- No unnecessary packages in production stage
- Proper file permissions for data directories


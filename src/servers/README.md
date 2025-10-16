# Servers

This directory contains different server implementations for the MCP Meta-Orchestrator.

## Files

- `http-server.ts` - HTTP server for remote deployment and API access
- `README.md` - This documentation

## HTTP Server

The HTTP server provides REST API endpoints for remote access to the MCP Meta-Orchestrator functionality. This allows integration with external AI platforms, web applications, and other services.

### Features

- RESTful API endpoints
- CORS support for cross-origin requests
- Rate limiting for security
- Health check endpoints
- Comprehensive error handling
- Security middleware (Helmet)
- JSON request/response format

### Usage

Start the HTTP server:

```bash
# Development
npm run start:server

# Production
npm run build
node dist/servers/http-server.js
```

### API Endpoints

- `GET /health` - Health check
- `GET /api/tools` - List all available MCP tools
- `POST /api/tools/:toolName` - Execute a specific MCP tool
- `GET /api/docs` - API documentation

### Configuration

The HTTP server can be configured using environment variables:

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)
- `PERPLEXITY_API_KEY` - Perplexity API key for MCP discovery
- `ENCRYPTION_KEY` - Encryption key for credential storage

### Security

The HTTP server includes several security features:

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configurable cross-origin resource sharing
- **Helmet**: Security headers and protection
- **Input Validation**: Request body validation
- **Error Handling**: Secure error responses

### Deployment

The HTTP server is designed for production deployment and includes:

- Docker support
- PM2 process management
- Health checks
- Graceful shutdown
- Environment-based configuration

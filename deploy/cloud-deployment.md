# Cloud Deployment Guide

## Option 1: VPS Deployment (DigitalOcean, Linode, AWS EC2)

### Prerequisites
- VPS with Ubuntu 20.04+ or similar
- Node.js 18+ installed
- Domain name (optional, for HTTPS)
- SSL certificate (Let's Encrypt recommended)

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx (for reverse proxy)
sudo apt install nginx -y
```

### Step 2: Deploy Application

```bash
# Clone repository
git clone https://github.com/your-username/mcp-meta-orchestrator.git
cd mcp-meta-orchestrator

# Install dependencies
npm install

# Build application
npm run build

# Set up environment
cp env.example .env
# Edit .env with your API keys
nano .env
```

### Step 3: Configure as HTTP Server

Create a new file `src/server.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerTools } from './core/tools.js';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// MCP tools endpoint
app.post('/mcp/tools', async (req, res) => {
  try {
    // Handle MCP tool requests
    const { method, params } = req.body;
    
    // Process MCP request and return response
    const result = await processMCPRequest(method, params);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`MCP Meta-Orchestrator running on port ${port}`);
});
```

### Step 4: Configure PM2

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'mcp-meta-orchestrator',
    script: 'dist/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

Start with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Step 5: Configure Nginx Reverse Proxy

Create `/etc/nginx/sites-available/mcp-orchestrator`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/mcp-orchestrator /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 6: SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

## Option 2: Docker Deployment

### Dockerfile for Production

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS production

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  mcp-orchestrator:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PERPLEXITY_API_KEY=${PERPLEXITY_API_KEY}
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

Deploy:
```bash
docker-compose up -d
```

## Option 3: Serverless Deployment

### Vercel Deployment

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/server.js"
    }
  ]
}
```

3. Deploy:
```bash
vercel --prod
```

### Railway Deployment

1. Connect GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Railway will automatically deploy on git push

## Environment Variables for Production

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

# Database (if using)
DATABASE_URL=your_database_url
```

## Monitoring and Logging

### PM2 Monitoring
```bash
pm2 monit
pm2 logs
```

### Health Checks
```bash
curl https://your-domain.com/health
```

### Log Rotation
```bash
pm2 install pm2-logrotate
```

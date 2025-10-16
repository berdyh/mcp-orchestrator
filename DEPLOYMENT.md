# Remote Deployment Guide

## Quick Start - Deploy to Vercel (Easiest)

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Deploy
```bash
# Build the project
npm run build

# Deploy to Vercel
vercel --prod
```

### 3. Set Environment Variables
In Vercel dashboard, add:
- `PERPLEXITY_API_KEY=your_api_key`
- `ENCRYPTION_KEY=your_32_char_key`

### 4. Test Your Deployment
```bash
curl https://your-app.vercel.app/health
curl https://your-app.vercel.app/api/tools
```

## Deploy to Railway

### 1. Connect GitHub
1. Go to [Railway.app](https://railway.app)
2. Connect your GitHub repository
3. Railway will auto-deploy

### 2. Set Environment Variables
In Railway dashboard:
- `PERPLEXITY_API_KEY=your_api_key`
- `ENCRYPTION_KEY=your_32_char_key`
- `NODE_ENV=production`

## Deploy to VPS (DigitalOcean, Linode, AWS)

### 1. Server Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2
```

### 2. Deploy Application
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
nano .env  # Add your API keys
```

### 3. Start with PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4. Configure Nginx (Optional)
```bash
sudo apt install nginx -y

# Create config file
sudo nano /etc/nginx/sites-available/mcp-orchestrator
```

Add this configuration:
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

## Docker Deployment

### 1. Build and Run
```bash
# Build Docker image
docker build -t mcp-meta-orchestrator .

# Run container
docker run -d \
  --name mcp-orchestrator \
  -p 3000:3000 \
  -e PERPLEXITY_API_KEY=your_api_key \
  -e ENCRYPTION_KEY=your_32_char_key \
  mcp-meta-orchestrator
```

### 2. Docker Compose
```bash
# Create .env file with your API keys
echo "PERPLEXITY_API_KEY=your_api_key" > .env
echo "ENCRYPTION_KEY=your_32_char_key" >> .env

# Start with docker-compose
docker-compose up -d
```

## Usage Examples

### Health Check
```bash
curl https://your-domain.com/health
```

### List Available Tools
```bash
curl https://your-domain.com/api/tools
```

### Analyze a Task
```bash
curl -X POST https://your-domain.com/api/tools/analyze_task_plan \
  -H "Content-Type: application/json" \
  -d '{
    "task_description": "Build a web scraper",
    "task_list": [
      {
        "id": "scraper-1",
        "description": "Scrape product data from e-commerce site",
        "dependencies": []
      }
    ]
  }'
```

### Discover MCP Servers
```bash
curl -X POST https://your-domain.com/api/tools/discover_mcp_servers \
  -H "Content-Type: application/json" \
  -d '{
    "tool_names": ["file-system", "web-search"],
    "categories": ["development", "automation"],
    "search_depth": "thorough"
  }'
```

## Integration with AI Platforms

### For Codex/ChatGPT Integration
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

## Monitoring

### PM2 Monitoring
```bash
pm2 monit
pm2 logs
```

### Health Checks
```bash
# Check if service is running
curl https://your-domain.com/health

# Check PM2 status
pm2 status
```

## Security Considerations

1. **API Keys**: Never commit API keys to version control
2. **HTTPS**: Use SSL certificates for production deployments
3. **Rate Limiting**: The server includes rate limiting (100 requests per 15 minutes)
4. **CORS**: Configure allowed origins in production
5. **Environment Variables**: Use secure environment variable management

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Find process using port 3000
   lsof -i :3000
   # Kill process
   kill -9 <PID>
   ```

2. **Permission Denied**
   ```bash
   # Fix file permissions
   sudo chown -R $USER:$USER /path/to/project
   ```

3. **Build Errors**
   ```bash
   # Clean and rebuild
   rm -rf node_modules dist
   npm install
   npm run build
   ```

### Logs
```bash
# PM2 logs
pm2 logs mcp-meta-orchestrator

# Docker logs
docker logs mcp-orchestrator

# Nginx logs
sudo tail -f /var/log/nginx/error.log
```

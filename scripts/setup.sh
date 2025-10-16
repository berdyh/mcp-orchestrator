#!/bin/bash

# MCP Meta-Orchestrator Setup Script
# This script sets up the development environment for the MCP Meta-Orchestrator

set -e

echo "🚀 Setting up MCP Meta-Orchestrator..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p .mcp-hub
mkdir -p .mcp-hub/logs
mkdir -p .mcp-hub/cache
mkdir -p .mcp-hub/credentials

# Set proper permissions
chmod 700 .mcp-hub
chmod 700 .mcp-hub/credentials

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📋 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your configuration"
fi

# Build the project
echo "🔨 Building the project..."
npm run build

# Run tests
echo "🧪 Running tests..."
npm test

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your configuration"
echo "2. Add your Perplexity API key to .env"
echo "3. Run 'npm run dev' to start development server"
echo "4. Run 'npm run docker:dev' to start with Docker"
echo ""
echo "For more information, see README.md"


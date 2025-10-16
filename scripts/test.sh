#!/bin/bash

# MCP Meta-Orchestrator Test Script
# This script runs the test suite with various configurations

set -e

echo "🧪 Running MCP Meta-Orchestrator Tests..."

# Parse command line arguments
COVERAGE=false
WATCH=false
DOCKER=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --coverage)
            COVERAGE=true
            shift
            ;;
        --watch)
            WATCH=true
            shift
            ;;
        --docker)
            DOCKER=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        *)
            echo "Unknown option $1"
            echo "Usage: $0 [--coverage] [--watch] [--docker] [--verbose]"
            exit 1
            ;;
    esac
done

# Set test environment
export NODE_ENV=test
export LOG_LEVEL=error

if [ "$VERBOSE" = true ]; then
    export LOG_LEVEL=debug
fi

# Run tests based on options
if [ "$DOCKER" = true ]; then
    echo "🐳 Running tests in Docker..."
    docker-compose run --rm mcp-meta-orchestrator-test
elif [ "$WATCH" = true ]; then
    echo "👀 Running tests in watch mode..."
    npm run test:watch
elif [ "$COVERAGE" = true ]; then
    echo "📊 Running tests with coverage..."
    npm run test:coverage
else
    echo "▶️  Running standard test suite..."
    npm test
fi

echo "✅ Tests completed!"


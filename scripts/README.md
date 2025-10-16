# Scripts

This directory contains utility scripts for building, testing, and deploying the MCP Meta-Orchestrator.

## Files

- `setup.sh` - Initial project setup and environment configuration
- `test.sh` - Test runner with various options
- `README.md` - This documentation

## Setup Script

The `setup.sh` script automates the initial project setup:

### Usage

```bash
# Make executable and run
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### What it does

1. **Prerequisites Check** - Verifies Node.js 18+ and npm are installed
2. **Dependencies** - Installs all npm dependencies
3. **Directory Creation** - Creates necessary directories with proper permissions
4. **Environment Setup** - Copies environment template if needed
5. **Build** - Compiles the TypeScript project
6. **Tests** - Runs the test suite to verify setup

### Requirements

- Node.js 18+
- npm
- Write permissions in project directory

## Test Script

The `test.sh` script provides flexible test execution options:

### Usage

```bash
# Make executable
chmod +x scripts/test.sh

# Run standard tests
./scripts/test.sh

# Run with coverage
./scripts/test.sh --coverage

# Run in watch mode
./scripts/test.sh --watch

# Run in Docker
./scripts/test.sh --docker

# Run with verbose output
./scripts/test.sh --verbose

# Combine options
./scripts/test.sh --coverage --verbose
```

### Options

- `--coverage` - Generate test coverage report
- `--watch` - Run tests in watch mode (re-runs on file changes)
- `--docker` - Run tests in Docker container
- `--verbose` - Enable verbose logging

### Environment

The test script automatically sets:
- `NODE_ENV=test`
- `LOG_LEVEL=error` (or `debug` with `--verbose`)

## Development Workflow

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd mcp_for_planning

# Run setup script
./scripts/setup.sh

# Edit configuration
nano .env
```

### Daily Development

```bash
# Start development server
npm run dev

# Run tests
./scripts/test.sh

# Run tests with coverage
./scripts/test.sh --coverage
```

### Docker Development

```bash
# Start Docker environment
npm run docker:dev

# Run tests in Docker
./scripts/test.sh --docker
```

## Troubleshooting

### Setup Issues

1. **Node.js version**: Ensure Node.js 18+ is installed
2. **Permissions**: Ensure write permissions in project directory
3. **Dependencies**: Run `npm install` manually if setup fails

### Test Issues

1. **Environment**: Check that `NODE_ENV=test` is set
2. **Dependencies**: Ensure all dependencies are installed
3. **Docker**: Ensure Docker is running for Docker tests

### Common Commands

```bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm install

# Reset environment
rm -rf .mcp-hub
./scripts/setup.sh

# Check project status
npm run build
npm test
```


# Utils Module

This module contains utility functions and shared functionality used throughout the MCP Meta-Orchestrator.

## Architecture

The utils module provides:

1. **Logging** - Structured logging with configurable levels
2. **Validation** - Data validation using Zod schemas
3. **Common Functions** - Reusable utility functions

## Files

- `logger.ts` - Structured logging functionality
- `validators.ts` - Data validation utilities
- `README.md` - This documentation

## Logging

The logging system provides structured JSON logging with configurable levels:

### Usage

```typescript
import { createLogger } from './utils/logger.js';

const logger = createLogger('my-module');

logger.info('Application started');
logger.debug('Debug information', { data: 'value' });
logger.warn('Warning message');
logger.error('Error occurred', { error: 'details' });
```

### Log Levels

- `debug` - Detailed debugging information
- `info` - General information messages
- `warn` - Warning messages
- `error` - Error messages

### Configuration

Log level can be configured via environment variable:

```bash
LOG_LEVEL=debug  # Show all messages
LOG_LEVEL=info   # Show info, warn, error (default)
LOG_LEVEL=warn   # Show warn, error
LOG_LEVEL=error  # Show only errors
```

## Validation

The validation system uses Zod schemas for type-safe validation:

### Usage

```typescript
import { validate, schemas } from './utils/validators.js';

// Validate a string
const result = validate(schemas.nonEmptyString, 'hello');
if (result.success) {
  console.log('Valid:', result.data);
} else {
  console.error('Invalid:', result.error);
}

// Validate with throwing
try {
  const data = validateOrThrow(schemas.mcpName, 'my-mcp-server');
  console.log('Valid MCP name:', data);
} catch (error) {
  console.error('Validation failed:', error.message);
}
```

### Available Schemas

- `nonEmptyString` - Non-empty string validation
- `url` - URL format validation
- `email` - Email format validation
- `nonEmptyArray` - Non-empty array validation
- `nonEmptyObject` - Non-empty object validation
- `mcpName` - MCP server name validation
- `taskId` - Task ID validation
- `credentialKey` - Credential key validation

### Utility Functions

- `isValidUrl(value)` - Check if string is valid URL
- `isValidEmail(value)` - Check if string is valid email
- `isValidMCPName(value)` - Check if string is valid MCP name
- `isValidTaskId(value)` - Check if string is valid task ID
- `isValidCredentialKey(value)` - Check if string is valid credential key
- `sanitizeString(value)` - Sanitize string by removing dangerous characters
- `validateAndSanitizeString(value)` - Validate and sanitize string

## Testing

Run tests for the utils module:

```bash
npm test -- src/utils
```

## Development

When adding new utilities:

1. Add the function to the appropriate file
2. Add comprehensive tests
3. Update this documentation
4. Consider if the function should be in a more specific module

## Error Handling

All utility functions include proper error handling and validation. Functions that can fail will either:

1. Return a result object with success/error information
2. Throw descriptive errors for invalid inputs
3. Log warnings for non-fatal issues


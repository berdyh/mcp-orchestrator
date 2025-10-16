/**
 * Validators Tests
 */

import { 
  validate, 
  validateOrThrow, 
  schemas,
  isValidUrl,
  isValidEmail,
  isValidMCPName,
  isValidTaskId,
  isValidCredentialKey,
  sanitizeString,
  validateAndSanitizeString
} from '../validators.js';

describe('Validators', () => {
  describe('validate', () => {
    it('should validate correct data', () => {
      const result = validate(schemas.nonEmptyString, 'hello');
      expect(result.success).toBe(true);
      expect(result.data).toBe('hello');
    });

    it('should reject invalid data', () => {
      const result = validate(schemas.nonEmptyString, '');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateOrThrow', () => {
    it('should return data for valid input', () => {
      const result = validateOrThrow(schemas.nonEmptyString, 'hello');
      expect(result).toBe('hello');
    });

    it('should throw for invalid input', () => {
      expect(() => {
        validateOrThrow(schemas.nonEmptyString, '');
      }).toThrow();
    });
  });

  describe('URL validation', () => {
    it('should validate correct URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('ftp://files.example.com')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('http://')).toBe(false);
    });
  });

  describe('Email validation', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('not-an-email')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
    });
  });

  describe('MCP name validation', () => {
    it('should validate correct MCP names', () => {
      expect(isValidMCPName('my-mcp-server')).toBe(true);
      expect(isValidMCPName('mcp_server_1')).toBe(true);
      expect(isValidMCPName('MCP-Server-123')).toBe(true);
    });

    it('should reject invalid MCP names', () => {
      expect(isValidMCPName('')).toBe(false);
      expect(isValidMCPName('mcp server')).toBe(false); // space
      expect(isValidMCPName('mcp@server')).toBe(false); // special char
      expect(isValidMCPName('a'.repeat(101))).toBe(false); // too long
    });
  });

  describe('Task ID validation', () => {
    it('should validate correct task IDs', () => {
      expect(isValidTaskId('task-1')).toBe(true);
      expect(isValidTaskId('subtask_2')).toBe(true);
      expect(isValidTaskId('Task-123')).toBe(true);
    });

    it('should reject invalid task IDs', () => {
      expect(isValidTaskId('')).toBe(false);
      expect(isValidTaskId('task 1')).toBe(false); // space
      expect(isValidTaskId('task@1')).toBe(false); // special char
      expect(isValidTaskId('a'.repeat(51))).toBe(false); // too long
    });
  });

  describe('Credential key validation', () => {
    it('should validate correct credential keys', () => {
      expect(isValidCredentialKey('API_KEY')).toBe(true);
      expect(isValidCredentialKey('DATABASE_URL')).toBe(true);
      expect(isValidCredentialKey('_PRIVATE_KEY')).toBe(true);
    });

    it('should reject invalid credential keys', () => {
      expect(isValidCredentialKey('')).toBe(false);
      expect(isValidCredentialKey('api-key')).toBe(false); // lowercase
      expect(isValidCredentialKey('API KEY')).toBe(false); // space
      expect(isValidCredentialKey('1API_KEY')).toBe(false); // starts with number
    });
  });

  describe('String sanitization', () => {
    it('should sanitize dangerous characters', () => {
      expect(sanitizeString('hello<world>')).toBe('helloworld');
      expect(sanitizeString('test"quotes"')).toBe('testquotes');
      expect(sanitizeString('line\nbreak')).toBe('line break');
    });

    it('should preserve safe characters', () => {
      expect(sanitizeString('hello-world_123')).toBe('hello-world_123');
    });
  });

  describe('validateAndSanitizeString', () => {
    it('should validate and sanitize valid strings', () => {
      const result = validateAndSanitizeString('hello<world>');
      expect(result).toBe('helloworld');
    });

    it('should throw for non-string input', () => {
      expect(() => {
        validateAndSanitizeString(123 as any);
      }).toThrow('Value must be a string');
    });

    it('should throw for empty string after sanitization', () => {
      expect(() => {
        validateAndSanitizeString('<>');
      }).toThrow('String cannot be empty after sanitization');
    });
  });
});


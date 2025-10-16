/**
 * Validation Utilities
 * 
 * Provides validation functions for various data types and structures.
 */

import { z } from 'zod';

/**
 * Common validation schemas
 */
export const schemas = {
  // String validations
  nonEmptyString: z.string().min(1, 'String cannot be empty'),
  url: z.string().url('Invalid URL format'),
  email: z.string().email('Invalid email format'),
  
  // Array validations
  nonEmptyArray: z.array(z.any()).min(1, 'Array cannot be empty'),
  
  // Object validations
  nonEmptyObject: z.object({}).refine(obj => Object.keys(obj).length > 0, 'Object cannot be empty'),
  
  // MCP specific validations
  mcpName: z.string().min(1).max(100).regex(/^[a-zA-Z0-9-_]+$/, 'Invalid MCP name format'),
  taskId: z.string().min(1).max(50).regex(/^[a-zA-Z0-9-_]+$/, 'Invalid task ID format'),
  credentialKey: z.string().min(1).max(100).regex(/^[A-Z_][A-Z0-9_]*$/, 'Invalid credential key format'),
};

/**
 * Validates a value against a schema and returns the result
 */
export function validate<T>(schema: z.ZodSchema<T>, value: unknown): {
  success: boolean;
  data?: T;
  error?: string;
} {
  try {
    const result = schema.parse(value);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      };
    }
    return { success: false, error: 'Validation failed' };
  }
}

/**
 * Validates a value against a schema and throws if invalid
 */
export function validateOrThrow<T>(schema: z.ZodSchema<T>, value: unknown): T {
  return schema.parse(value);
}

/**
 * Checks if a value is a valid URL
 */
export function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a value is a valid email
 */
export function isValidEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Checks if a value is a valid MCP name
 */
export function isValidMCPName(value: string): boolean {
  const mcpNameRegex = /^[a-zA-Z0-9-_]+$/;
  return mcpNameRegex.test(value) && value.length >= 1 && value.length <= 100;
}

/**
 * Checks if a value is a valid task ID
 */
export function isValidTaskId(value: string): boolean {
  const taskIdRegex = /^[a-zA-Z0-9-_]+$/;
  return taskIdRegex.test(value) && value.length >= 1 && value.length <= 50;
}

/**
 * Checks if a value is a valid credential key
 */
export function isValidCredentialKey(value: string): boolean {
  const credentialKeyRegex = /^[A-Z_][A-Z0-9_]*$/;
  return credentialKeyRegex.test(value) && value.length >= 1 && value.length <= 100;
}

/**
 * Sanitizes a string by removing potentially dangerous characters
 */
export function sanitizeString(value: string): string {
  return value
    .replace(/[<>\"'&]/g, '') // Remove HTML/XML characters
    .replace(/[\r\n\t]/g, ' ') // Replace control characters with spaces
    .trim();
}

/**
 * Validates and sanitizes a string
 */
export function validateAndSanitizeString(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('Value must be a string');
  }
  
  const sanitized = sanitizeString(value);
  if (sanitized.length === 0) {
    throw new Error('String cannot be empty after sanitization');
  }
  
  return sanitized;
}


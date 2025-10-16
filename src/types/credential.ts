/**
 * Credential Management Type Definitions
 * 
 * This module contains TypeScript interfaces and types for credential management,
 * storage, and security-related structures.
 */

import { z } from 'zod';

/**
 * Credential storage method
 */
export type CredentialStorageMethod = 'system-keychain' | 'encrypted-config' | 'env-file';

/**
 * Credential storage configuration
 */
export interface CredentialStorageConfig {
  method: CredentialStorageMethod;
  encryption?: {
    algorithm: string;
    keyDerivation: string;
  };
  location?: string;
  permissions?: string;
  securityLevel: 'high' | 'medium-high' | 'medium';
}

/**
 * Stored credential
 */
export interface StoredCredential {
  keyName: string;
  value: string;
  encrypted: boolean;
  storedAt: Date;
  lastAccessed: Date;
  accessCount: number;
}

/**
 * Credential request
 */
export interface CredentialRequest {
  key_name: string;
  description: string;
  is_optional: boolean;
  get_key_url?: string;
}

/**
 * Credential storage result
 */
export interface CredentialStorageResult {
  status: 'success' | 'pending' | 'failed';
  stored_location: string;
  credential_keys: string[];
  next_steps: string;
}

/**
 * Credential validation result
 */
export interface CredentialValidationResult {
  valid: boolean;
  error?: string;
  suggestions?: string[];
}

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  algorithm: string;
  keyDerivation: string;
  saltLength: number;
  iterations: number;
}

/**
 * Security audit entry
 */
export interface SecurityAuditEntry {
  timestamp: Date;
  action: 'store' | 'retrieve' | 'validate' | 'delete';
  credentialKey: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Default storage priority configuration
 */
export const STORAGE_PRIORITY: CredentialStorageConfig[] = [
  {
    method: 'system-keychain',
    securityLevel: 'high',
  },
  {
    method: 'encrypted-config',
    encryption: {
      algorithm: 'AES-256',
      keyDerivation: 'PBKDF2',
    },
    securityLevel: 'medium-high',
  },
  {
    method: 'env-file',
    location: '~/.mcp-hub/.env',
    permissions: '0600',
    securityLevel: 'medium',
  },
];

/**
 * Default encryption configuration
 */
export const DEFAULT_ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyDerivation: 'pbkdf2',
  saltLength: 32,
  iterations: 100000,
};

/**
 * Zod schemas for validation
 */
export const CredentialStorageMethodSchema = z.enum(['system-keychain', 'encrypted-config', 'env-file']);

export const CredentialStorageConfigSchema = z.object({
  method: CredentialStorageMethodSchema,
  encryption: z.object({
    algorithm: z.string().min(1),
    keyDerivation: z.string().min(1),
  }).optional(),
  location: z.string().optional(),
  permissions: z.string().optional(),
  securityLevel: z.enum(['high', 'medium-high', 'medium']),
});

export const StoredCredentialSchema = z.object({
  keyName: z.string().min(1),
  value: z.string().min(1),
  encrypted: z.boolean(),
  storedAt: z.date(),
  lastAccessed: z.date(),
  accessCount: z.number().min(0),
});

export const CredentialRequestSchema = z.object({
  key_name: z.string().min(1),
  description: z.string().min(1),
  is_optional: z.boolean(),
  get_key_url: z.string().url().optional(),
});

export const CredentialStorageResultSchema = z.object({
  status: z.enum(['success', 'pending', 'failed']),
  stored_location: z.string().min(1),
  credential_keys: z.array(z.string()),
  next_steps: z.string().min(1),
});

export const CredentialValidationResultSchema = z.object({
  valid: z.boolean(),
  error: z.string().optional(),
  suggestions: z.array(z.string()).optional(),
});

export const EncryptionConfigSchema = z.object({
  algorithm: z.string().min(1),
  keyDerivation: z.string().min(1),
  saltLength: z.number().min(1),
  iterations: z.number().min(1),
});

export const SecurityAuditEntrySchema = z.object({
  timestamp: z.date(),
  action: z.enum(['store', 'retrieve', 'validate', 'delete']),
  credentialKey: z.string().min(1),
  success: z.boolean(),
  error: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});


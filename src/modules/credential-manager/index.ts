/**
 * Credential Manager - Public API
 * 
 * This module provides the main public API for credential management,
 * combining encryption, storage, and interactive prompting capabilities.
 */

import { createLogger } from '../../utils/logger';
import type { 
  CredentialRequest, 
  CredentialStorageResult, 
  CredentialValidationResult,
  CredentialStorageConfig
} from '../../types/credential';
import { STORAGE_PRIORITY } from '../../types/credential';
import type { StorageOperationResult } from './storage';
import { CredentialStorage } from './storage';
import type { PromptResult } from './prompt';
import { CredentialPrompter } from './prompt';
import { AES256Encryption, encryptionUtils } from './encryption.js';

const logger = createLogger('credential-manager');

/**
 * Credential manager configuration
 */
export interface CredentialManagerConfig {
  storage?: CredentialStorageConfig;
  autoPrompt?: boolean;
  validateOnRetrieve?: boolean;
  encryptionKey?: string | undefined;
}

/**
 * Credential manager result
 */
export interface CredentialManagerResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Main credential manager class
 */
export class CredentialManager {
  private storage: CredentialStorage;
  private prompter: CredentialPrompter;
  private config: CredentialManagerConfig;
  private encryptionKey?: string | undefined;

  constructor(config: CredentialManagerConfig = {}) {
    this.config = {
      autoPrompt: true,
      validateOnRetrieve: true,
      ...config
    };

    this.storage = new CredentialStorage(this.config.storage);
    this.prompter = new CredentialPrompter();
    this.encryptionKey = this.config.encryptionKey || undefined;

    if (this.encryptionKey) {
      this.storage.setEncryptionKey(this.encryptionKey);
    }

    logger.info('Credential manager initialized', { 
      storageMethod: this.config.storage?.method || 'encrypted-config',
      autoPrompt: this.config.autoPrompt 
    });
  }

  /**
   * Sets the encryption key for the credential manager
   */
  setEncryptionKey(key: string): void {
    this.encryptionKey = key;
    this.storage.setEncryptionKey(key);
    logger.debug('Encryption key set');
  }

  /**
   * Gets a credential, prompting if not found and autoPrompt is enabled
   */
  async getCredential(
    keyName: string, 
    request?: CredentialRequest, 
    options?: { promptIfMissing?: boolean; validate?: boolean }
  ): Promise<CredentialManagerResult> {
    try {
      const promptIfMissing = options?.promptIfMissing ?? this.config.autoPrompt;
      const validate = options?.validate ?? this.config.validateOnRetrieve;

      // Try to retrieve from storage first
      const retrieveResult = await this.storage.retrieveCredential(keyName);
      
      if (retrieveResult.success) {
        const credential = retrieveResult.data;
        
        // Validate if requested
        if (validate && credential?.value) {
          const validation = await this.validateCredential(keyName, credential.value);
          if (!validation.valid) {
            logger.warn('Credential validation failed', { 
              keyName, 
              error: validation.error 
            });
        return {
          success: false,
          message: `Credential validation failed: ${validation.error}`,
          error: validation.error ?? 'Validation failed',
          data: { keyName, validation }
        };
          }
        }

        logger.debug('Credential retrieved from storage', { keyName });
        return {
          success: true,
          message: `Credential '${keyName}' retrieved successfully`,
          data: { keyName, value: credential?.value, source: 'storage' }
        };
      }

      // Credential not found in storage
      if (!promptIfMissing) {
        return {
          success: false,
          message: `Credential '${keyName}' not found and prompting disabled`,
          error: 'Credential not found'
        };
      }

      // Prompt for credential if not found
      if (!request) {
        request = {
          key_name: keyName,
          description: `Enter value for ${keyName}`,
          is_optional: false
        };
      }

      const promptResult = await this.prompter.promptCredential(request);
      
      if (!promptResult.success) {
        return {
          success: false,
          message: `Failed to prompt for credential '${keyName}'`,
          error: promptResult.error ?? 'Prompt failed'
        };
      }

      // Store the prompted credential
      const storeResult = await this.storage.storeCredential(keyName, promptResult.value || '');
      
      if (!storeResult.success) {
        logger.warn('Failed to store prompted credential', { 
          keyName, 
          error: storeResult.error 
        });
        // Still return the value even if storage failed
        return {
          success: true,
          message: `Credential '${keyName}' obtained via prompt (storage failed)`,
          data: { keyName, value: promptResult.value, source: 'prompt', storageFailed: true }
        };
      }

      logger.info('Credential obtained and stored', { keyName });
      return {
        success: true,
        message: `Credential '${keyName}' obtained and stored successfully`,
        data: { keyName, value: promptResult.value, source: 'prompt' }
      };
    } catch (error) {
      logger.error('Failed to get credential', { 
        keyName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        message: `Failed to get credential '${keyName}'`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Sets a credential value
   */
  async setCredential(keyName: string, value: string): Promise<CredentialManagerResult> {
    try {
      if (!keyName || typeof keyName !== 'string') {
        throw new Error('Key name must be a non-empty string');
      }

      if (!value || typeof value !== 'string') {
        throw new Error('Value must be a non-empty string');
      }

      const result = await this.storage.storeCredential(keyName, value);
      
      if (result.success) {
        logger.info('Credential set successfully', { keyName });
        return {
          success: true,
          message: `Credential '${keyName}' set successfully`,
          data: { keyName, encrypted: result.data?.encrypted }
        };
      } else {
        return {
          success: false,
          message: `Failed to set credential '${keyName}'`,
          error: result.error ?? 'Set operation failed'
        };
      }
    } catch (error) {
      logger.error('Failed to set credential', { 
        keyName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        message: `Failed to set credential '${keyName}'`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Removes a credential
   */
  async removeCredential(keyName: string): Promise<CredentialManagerResult> {
    try {
      const result = await this.storage.deleteCredential(keyName);
      
      if (result.success) {
        logger.info('Credential removed successfully', { keyName });
        return {
          success: true,
          message: `Credential '${keyName}' removed successfully`,
          data: { keyName }
        };
      } else {
        return {
          success: false,
          message: `Failed to remove credential '${keyName}'`,
          error: result.error ?? 'Remove operation failed'
        };
      }
    } catch (error) {
      logger.error('Failed to remove credential', { 
        keyName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        message: `Failed to remove credential '${keyName}'`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Lists all stored credentials
   */
  async listCredentials(): Promise<CredentialManagerResult> {
    try {
      const result = await this.storage.listCredentials();
      
      if (result.success) {
        return {
          success: true,
          message: `Found ${result.data?.length || 0} stored credentials`,
          data: result.data
        };
      } else {
        return {
          success: false,
          message: 'Failed to list credentials',
          error: result.error ?? 'List operation failed'
        };
      }
    } catch (error) {
      logger.error('Failed to list credentials', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        message: 'Failed to list credentials',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validates a credential value
   */
  async validateCredential(keyName: string, value: string): Promise<CredentialValidationResult> {
    try {
      // Basic validation
      if (!value || value.length === 0) {
        return {
          valid: false,
          error: 'Credential value is empty',
          suggestions: ['Ensure the credential has a value']
        };
      }

      // API key validation
      if (keyName.toLowerCase().includes('api') && keyName.toLowerCase().includes('key')) {
        return this.validateApiKey(value);
      }

      // Token validation
      if (keyName.toLowerCase().includes('token')) {
        return this.validateToken(value);
      }

      // URL validation
      if (keyName.toLowerCase().includes('url')) {
        return this.validateUrl(value);
      }

      // Email validation
      if (keyName.toLowerCase().includes('email')) {
        return this.validateEmail(value);
      }

      // Default validation
      return { valid: true };
    } catch (error) {
      logger.error('Credential validation error', { 
        keyName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        valid: false,
        error: 'Validation failed due to internal error',
        suggestions: ['Try again or contact support']
      };
    }
  }

  /**
   * Validates API key format
   */
  private validateApiKey(value: string): CredentialValidationResult {
    if (value.length < 10) {
      return {
        valid: false,
        error: 'API key appears too short',
        suggestions: ['Ensure you have the complete API key', 'Check for any missing characters']
      };
    }

    if (value.includes(' ')) {
      return {
        valid: false,
        error: 'API key should not contain spaces',
        suggestions: ['Remove any spaces from the API key']
      };
    }

    // Check for common API key patterns
    const commonPatterns = [
      /^[a-zA-Z0-9]{20,}$/, // Alphanumeric, 20+ chars
      /^sk-[a-zA-Z0-9]{20,}$/, // OpenAI style
      /^[a-zA-Z0-9]{32,}$/, // 32+ char alphanumeric
    ];

    const isValidPattern = commonPatterns.some(pattern => pattern.test(value));
    
    if (!isValidPattern) {
      return {
        valid: false,
        error: 'API key format appears invalid',
        suggestions: ['Check the API key format', 'Ensure no extra characters are included']
      };
    }

    return { valid: true };
  }

  /**
   * Validates token format
   */
  private validateToken(value: string): CredentialValidationResult {
    if (value.length < 20) {
      return {
        valid: false,
        error: 'Token appears too short',
        suggestions: ['Ensure you have the complete token', 'Check for any missing characters']
      };
    }

    return { valid: true };
  }

  /**
   * Validates URL format
   */
  private validateUrl(value: string): CredentialValidationResult {
    try {
      new URL(value);
      return { valid: true };
    } catch {
      return {
        valid: false,
        error: 'Invalid URL format',
        suggestions: ['Include protocol (http:// or https://)', 'Check for typos in the URL']
      };
    }
  }

  /**
   * Validates email format
   */
  private validateEmail(value: string): CredentialValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return {
        valid: false,
        error: 'Invalid email format',
        suggestions: ['Use format: user@domain.com', 'Check for typos']
      };
    }

    return { valid: true };
  }

  /**
   * Handles multiple credential requests
   */
  async handleCredentialRequests(requests: CredentialRequest[]): Promise<CredentialStorageResult> {
    try {
      const results: Record<string, string> = {};
      const credentialKeys: string[] = [];
      const errors: string[] = [];

      logger.info('Handling credential requests', { count: requests.length });

      for (const request of requests) {
        try {
          const result = await this.getCredential(request.key_name, request);
          
          if (result.success) {
            results[request.key_name] = result.data?.value || '';
            credentialKeys.push(request.key_name);
          } else {
            if (!request.is_optional) {
              errors.push(`Required credential '${request.key_name}': ${result.error}`);
            } else {
              logger.debug('Optional credential skipped', { 
                keyName: request.key_name, 
                reason: result.error 
              });
            }
          }
        } catch (error) {
          if (!request.is_optional) {
            errors.push(`Required credential '${request.key_name}': ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      if (errors.length > 0) {
        return {
          status: 'failed',
          stored_location: this.storage['storagePath'],
          credential_keys: credentialKeys,
          next_steps: `Fix the following errors: ${errors.join(', ')}`
        };
      }

      return {
        status: 'success',
        stored_location: this.storage['storagePath'],
        credential_keys: credentialKeys,
        next_steps: 'All credentials collected successfully. You can now use the MCP server.'
      };
    } catch (error) {
      logger.error('Failed to handle credential requests', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        status: 'failed',
        stored_location: this.storage['storagePath'],
        credential_keys: [],
        next_steps: `Failed to collect credentials: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Initializes encryption with user prompt
   */
  async initializeEncryption(): Promise<CredentialManagerResult> {
    try {
      if (this.encryptionKey) {
        return {
          success: true,
          message: 'Encryption already initialized',
          data: { initialized: true }
        };
      }

      const promptResult = await this.prompter.promptEncryptionKey();
      
      if (!promptResult.success) {
        return {
          success: false,
          message: 'Failed to initialize encryption',
          error: promptResult.error ?? 'Encryption initialization failed'
        };
      }

      this.setEncryptionKey(promptResult.value || '');
      
      logger.info('Encryption initialized successfully');
      return {
        success: true,
        message: 'Encryption initialized successfully',
        data: { initialized: true }
      };
    } catch (error) {
      logger.error('Failed to initialize encryption', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        message: 'Failed to initialize encryption',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validates storage integrity
   */
  async validateStorage(): Promise<CredentialManagerResult> {
    try {
      const result = await this.storage.validateStorage();
      
      if (result.success) {
        return {
          success: true,
          message: 'Storage validation passed',
          data: result.data
        };
      } else {
        return {
          success: false,
          message: 'Storage validation failed',
          error: result.error ?? 'Storage validation failed'
        };
      }
    } catch (error) {
      logger.error('Storage validation error', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        message: 'Storage validation failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Gets audit log
   */
  async getAuditLog(limit: number = 100): Promise<CredentialManagerResult> {
    try {
      const result = await this.storage.getAuditLog(limit);
      
      if (result.success) {
        return {
          success: true,
          message: `Retrieved ${result.data?.length || 0} audit entries`,
          data: result.data
        };
      } else {
        return {
          success: false,
          message: 'Failed to get audit log',
          error: result.error ?? 'Audit log retrieval failed'
        };
      }
    } catch (error) {
      logger.error('Failed to get audit log', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        message: 'Failed to get audit log',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * Default credential manager instance
 */
export const defaultCredentialManager = new CredentialManager();

/**
 * Utility functions for credential management
 */
export const credentialUtils = {
  /**
   * Quick credential getter
   */
  async get(keyName: string, description?: string): Promise<string> {
    const request: CredentialRequest = {
      key_name: keyName,
      description: description || `Enter value for ${keyName}`,
      is_optional: false
    };

    const result = await defaultCredentialManager.getCredential(keyName, request);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to get credential');
    }

    return result.data?.value || '';
  },

  /**
   * Quick credential setter
   */
  async set(keyName: string, value: string): Promise<void> {
    const result = await defaultCredentialManager.setCredential(keyName, value);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to set credential');
    }
  },

  /**
   * Quick credential remover
   */
  async remove(keyName: string): Promise<void> {
    const result = await defaultCredentialManager.removeCredential(keyName);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to remove credential');
    }
  },

  /**
   * Generate secure encryption key
   */
  generateEncryptionKey(): string {
    return encryptionUtils.generateEncryptionKey();
  }
};

// Export all types and classes
export * from './encryption.js';
export * from './storage.js';
export * from './prompt.js';
export * from '../../types/credential.js';

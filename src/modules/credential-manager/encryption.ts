/**
 * AES-256 Encryption/Decryption Utilities
 * 
 * This module provides secure AES-256-GCM encryption and decryption functionality
 * for credential storage with proper key derivation using PBKDF2.
 */

import { createHash, randomBytes, scrypt, createCipheriv, createDecipheriv } from 'crypto';
import { promisify } from 'util';
import { createLogger } from '../../utils/logger.js';
import type { EncryptionConfig } from '../../types/credential.js';
import { DEFAULT_ENCRYPTION_CONFIG } from '../../types/credential.js';

const logger = createLogger('credential-encryption');
const scryptAsync = promisify(scrypt);

/**
 * Encryption result containing encrypted data and metadata
 */
export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  salt: string;
  tag: string;
  algorithm: string;
}

/**
 * Decryption input containing all necessary data for decryption
 */
export interface DecryptionInput {
  encryptedData: string;
  iv: string;
  salt: string;
  tag: string;
  algorithm: string;
}

/**
 * Key derivation result
 */
interface KeyDerivationResult {
  key: Buffer;
  salt: Buffer;
}

/**
 * AES-256-GCM encryption class
 */
export class AES256Encryption {
  private config: EncryptionConfig;

  constructor(config: EncryptionConfig = DEFAULT_ENCRYPTION_CONFIG) {
    this.config = config;
    logger.debug('AES-256 encryption initialized', { algorithm: config.algorithm });
  }

  /**
   * Derives a cryptographic key from a password using PBKDF2
   */
  private async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    try {
      const key = await scryptAsync(password, salt, 32) as Buffer;
      return key;
    } catch (error) {
      logger.error('Key derivation failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw new Error(`Key derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generates a random salt for key derivation
   */
  private generateSalt(): Buffer {
    return randomBytes(this.config.saltLength);
  }

  /**
   * Generates a random initialization vector (IV)
   */
  private generateIV(): Buffer {
    return randomBytes(16); // 128-bit IV for AES
  }

  /**
   * Encrypts plaintext using AES-256-GCM
   */
  async encrypt(plaintext: string, password: string): Promise<EncryptionResult> {
    try {
      if (!plaintext || typeof plaintext !== 'string') {
        throw new Error('Plaintext must be a non-empty string');
      }

      if (!password || typeof password !== 'string') {
        throw new Error('Password must be a non-empty string');
      }

      // Generate random salt and IV
      const salt = this.generateSalt();
      const iv = randomBytes(16);

      // Derive key from password and salt
      const key = await this.deriveKey(password, salt);

      // Create cipher
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(Buffer.from('mcp-credential-manager', 'utf8'));

      // Encrypt the data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const tag = cipher.getAuthTag();

      const result: EncryptionResult = {
        encryptedData: encrypted,
        iv: iv.toString('hex'),
        salt: salt.toString('hex'),
        tag: tag.toString('hex'),
        algorithm: this.config.algorithm
      };

      logger.debug('Encryption completed successfully', { 
        dataLength: plaintext.length,
        algorithm: this.config.algorithm 
      });

      return result;
    } catch (error) {
      logger.error('Encryption failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypts ciphertext using AES-256-GCM
   */
  async decrypt(decryptionInput: DecryptionInput, password: string): Promise<string> {
    try {
      if (!decryptionInput.encryptedData || !decryptionInput.iv || !decryptionInput.salt || !decryptionInput.tag) {
        throw new Error('Invalid decryption input: missing required fields');
      }

      if (!password || typeof password !== 'string') {
        throw new Error('Password must be a non-empty string');
      }

      // Convert hex strings back to buffers
      const encryptedData = Buffer.from(decryptionInput.encryptedData, 'hex');
      const iv = Buffer.from(decryptionInput.iv, 'hex');
      const salt = Buffer.from(decryptionInput.salt, 'hex');
      const tag = Buffer.from(decryptionInput.tag, 'hex');

      // Derive key from password and salt
      const key = await this.deriveKey(password, salt);

      // Create decipher
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAAD(Buffer.from('mcp-credential-manager', 'utf8'));
      decipher.setAuthTag(tag);

      // Decrypt the data
      let decrypted = decipher.update(encryptedData, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      logger.debug('Decryption completed successfully', { 
        dataLength: decrypted.length,
        algorithm: decryptionInput.algorithm 
      });

      return decrypted;
    } catch (error) {
      logger.error('Decryption failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates encryption configuration
   */
  validateConfig(): boolean {
    try {
      if (!this.config.algorithm || typeof this.config.algorithm !== 'string') {
        logger.error('Invalid encryption algorithm');
        return false;
      }

      if (!this.config.keyDerivation || typeof this.config.keyDerivation !== 'string') {
        logger.error('Invalid key derivation method');
        return false;
      }

      if (this.config.saltLength < 16 || this.config.saltLength > 64) {
        logger.error('Invalid salt length', { saltLength: this.config.saltLength });
        return false;
      }

      if (this.config.iterations < 10000 || this.config.iterations > 1000000) {
        logger.error('Invalid iteration count', { iterations: this.config.iterations });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Configuration validation failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return false;
    }
  }

  /**
   * Generates a secure random password
   */
  static generateSecurePassword(length: number = 32): string {
    if (length < 16 || length > 128) {
      throw new Error('Password length must be between 16 and 128 characters');
    }

    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }

    return password;
  }

  /**
   * Validates password strength
   */
  static validatePasswordStrength(password: string): { valid: boolean; score: number; feedback: string[] } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length < 8) {
      feedback.push('Password should be at least 8 characters long');
    } else if (password.length >= 12) {
      score += 1;
    }

    if (!/[a-z]/.test(password)) {
      feedback.push('Password should contain lowercase letters');
    } else {
      score += 1;
    }

    if (!/[A-Z]/.test(password)) {
      feedback.push('Password should contain uppercase letters');
    } else {
      score += 1;
    }

    if (!/[0-9]/.test(password)) {
      feedback.push('Password should contain numbers');
    } else {
      score += 1;
    }

    if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
      feedback.push('Password should contain special characters');
    } else {
      score += 1;
    }

    const valid = score >= 3 && password.length >= 8;

    return { valid, score, feedback };
  }
}

/**
 * Default encryption instance
 */
export const defaultEncryption = new AES256Encryption();

/**
 * Utility functions for encryption operations
 */
export const encryptionUtils = {
  /**
   * Encrypts a credential value
   */
  async encryptCredential(value: string, password: string): Promise<EncryptionResult> {
    return defaultEncryption.encrypt(value, password);
  },

  /**
   * Decrypts a credential value
   */
  async decryptCredential(encryptionResult: EncryptionResult, password: string): Promise<string> {
    return defaultEncryption.decrypt(encryptionResult, password);
  },

  /**
   * Generates a secure encryption key
   */
  generateEncryptionKey(): string {
    return AES256Encryption.generateSecurePassword(64);
  },

  /**
   * Validates encryption key strength
   */
  validateEncryptionKey(key: string): { valid: boolean; score: number; feedback: string[] } {
    return AES256Encryption.validatePasswordStrength(key);
  }
};

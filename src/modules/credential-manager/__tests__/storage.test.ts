/**
 * Storage Tests
 * 
 * Comprehensive tests for credential storage functionality.
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { CredentialStorage, StorageOperationResult } from '../storage.js';
import { CredentialStorageConfig, STORAGE_PRIORITY } from '../../../types/credential.js';

describe('CredentialStorage', () => {
  let storage: CredentialStorage;
  let testStoragePath: string;
  const testKey = 'test-credential';
  const testValue = 'test-value-123';

  beforeEach(async () => {
    // Create a temporary storage path for testing
    testStoragePath = join(homedir(), '.mcp-hub-test', 'test-credentials.json');
    
    // Clean up any existing test file
    try {
      await fs.unlink(testStoragePath);
    } catch (error) {
      // File doesn't exist, that's fine
    }

    // Create storage with test path
    const config: CredentialStorageConfig = {
      method: 'encrypted-config',
      location: testStoragePath,
      securityLevel: 'medium-high',
      encryption: {
        algorithm: 'aes-256-gcm',
        keyDerivation: 'pbkdf2'
      }
    };
    
    storage = new CredentialStorage(config);
  });

  afterEach(async () => {
    // Clean up test file
    try {
      await fs.unlink(testStoragePath);
    } catch (error) {
      // File doesn't exist, that's fine
    }
  });

  describe('Constructor and Configuration', () => {
    it('should create instance with default configuration', () => {
      const defaultStorage = new CredentialStorage();
      expect(defaultStorage).toBeInstanceOf(CredentialStorage);
    });

    it('should create instance with custom configuration', () => {
      const config: CredentialStorageConfig = {
        method: 'encrypted-config',
        location: '/custom/path/credentials.json',
        securityLevel: 'high'
      };
      const customStorage = new CredentialStorage(config);
      expect(customStorage).toBeInstanceOf(CredentialStorage);
    });

    it('should resolve storage path correctly', () => {
      const config: CredentialStorageConfig = {
        method: 'encrypted-config',
        location: '~/.mcp-hub/custom-credentials.json',
        securityLevel: 'medium-high'
      };
      const customStorage = new CredentialStorage(config);
      expect(customStorage['storagePath']).toContain(homedir());
    });
  });

  describe('Store Credential', () => {
    it('should store credential successfully', async () => {
      const result = await storage.storeCredential(testKey, testValue);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('stored successfully');
      expect(result.data).toBeDefined();
      expect(result.data?.keyName).toBe(testKey);
    });

    it('should store credential with encryption', async () => {
      const encryptionKey = 'test-encryption-key-123!@#';
      storage.setEncryptionKey(encryptionKey);
      
      const result = await storage.storeCredential(testKey, testValue);
      
      expect(result.success).toBe(true);
      expect(result.data?.encrypted).toBe(true);
    });

    it('should reject empty key name', async () => {
      const result = await storage.storeCredential('', testValue);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Key name must be a non-empty string');
    });

    it('should reject empty value', async () => {
      const result = await storage.storeCredential(testKey, '');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Value must be a non-empty string');
    });

    it('should handle special characters in key and value', async () => {
      const specialKey = 'test-key-with-special-chars!@#$%';
      const specialValue = 'Value with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
      
      const result = await storage.storeCredential(specialKey, specialValue);
      
      expect(result.success).toBe(true);
    });

    it('should handle unicode characters', async () => {
      const unicodeKey = 'test-key-unicode-你好';
      const unicodeValue = 'Unicode value: 你好世界 🌍 émojis';
      
      const result = await storage.storeCredential(unicodeKey, unicodeValue);
      
      expect(result.success).toBe(true);
    });

    it('should handle long values', async () => {
      const longValue = 'A'.repeat(10000);
      
      const result = await storage.storeCredential(testKey, longValue);
      
      expect(result.success).toBe(true);
    });

    it('should create storage file with proper permissions', async () => {
      await storage.storeCredential(testKey, testValue);
      
      // Check if file exists
      const stats = await fs.stat(testStoragePath);
      expect(stats.isFile()).toBe(true);
      
      // Check file permissions (should be 600 - read/write for owner only)
      const mode = stats.mode & parseInt('777', 8);
      expect(mode).toBe(parseInt('600', 8));
    });
  });

  describe('Retrieve Credential', () => {
    beforeEach(async () => {
      await storage.storeCredential(testKey, testValue);
    });

    it('should retrieve credential successfully', async () => {
      const result = await storage.retrieveCredential(testKey);
      
      expect(result.success).toBe(true);
      expect(result.data?.keyName).toBe(testKey);
      expect(result.data?.value).toBe(testValue);
    });

    it('should retrieve encrypted credential', async () => {
      const encryptionKey = 'test-encryption-key-123!@#';
      storage.setEncryptionKey(encryptionKey);
      
      // Store with encryption
      await storage.storeCredential(testKey, testValue);
      
      // Retrieve with encryption
      const result = await storage.retrieveCredential(testKey);
      
      expect(result.success).toBe(true);
      expect(result.data?.value).toBe(testValue);
      expect(result.data?.encrypted).toBe(true);
    });

    it('should update access information on retrieve', async () => {
      const result1 = await storage.retrieveCredential(testKey);
      const result2 = await storage.retrieveCredential(testKey);
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      
      // Access count should increase
      expect(result2.data?.accessCount).toBeGreaterThan(result1.data?.accessCount || 0);
    });

    it('should return error for non-existent credential', async () => {
      const result = await storage.retrieveCredential('non-existent-key');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should reject empty key name', async () => {
      const result = await storage.retrieveCredential('');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Key name must be a non-empty string');
    });
  });

  describe('List Credentials', () => {
    beforeEach(async () => {
      await storage.storeCredential('key1', 'value1');
      await storage.storeCredential('key2', 'value2');
      await storage.storeCredential('key3', 'value3');
    });

    it('should list all credentials', async () => {
      const result = await storage.listCredentials();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data?.map(c => c.keyName)).toContain('key1');
      expect(result.data?.map(c => c.keyName)).toContain('key2');
      expect(result.data?.map(c => c.keyName)).toContain('key3');
    });

    it('should return empty list when no credentials exist', async () => {
      // Create new storage with different path
      const emptyStoragePath = join(homedir(), '.mcp-hub-test', 'empty-credentials.json');
      const emptyConfig: CredentialStorageConfig = {
        method: 'encrypted-config',
        location: emptyStoragePath,
        securityLevel: 'medium-high'
      };
      const emptyStorage = new CredentialStorage(emptyConfig);
      
      const result = await emptyStorage.listCredentials();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      
      // Clean up
      try {
        await fs.unlink(emptyStoragePath);
      } catch (error) {
        // File doesn't exist, that's fine
      }
    });

    it('should not expose credential values in list', async () => {
      const result = await storage.listCredentials();
      
      expect(result.success).toBe(true);
      result.data?.forEach(credential => {
        expect(credential).not.toHaveProperty('value');
        expect(credential).toHaveProperty('keyName');
        expect(credential).toHaveProperty('encrypted');
        expect(credential).toHaveProperty('storedAt');
        expect(credential).toHaveProperty('lastAccessed');
        expect(credential).toHaveProperty('accessCount');
      });
    });
  });

  describe('Delete Credential', () => {
    beforeEach(async () => {
      await storage.storeCredential(testKey, testValue);
    });

    it('should delete credential successfully', async () => {
      const result = await storage.deleteCredential(testKey);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('deleted successfully');
    });

    it('should not be able to retrieve deleted credential', async () => {
      await storage.deleteCredential(testKey);
      
      const result = await storage.retrieveCredential(testKey);
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should return error for non-existent credential', async () => {
      const result = await storage.deleteCredential('non-existent-key');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should reject empty key name', async () => {
      const result = await storage.deleteCredential('');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Key name must be a non-empty string');
    });
  });

  describe('Audit Log', () => {
    beforeEach(async () => {
      await storage.storeCredential(testKey, testValue);
      await storage.retrieveCredential(testKey);
    });

    it('should maintain audit log', async () => {
      const result = await storage.getAuditLog();
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data?.length).toBeGreaterThan(0);
    });

    it('should limit audit log entries', async () => {
      const result = await storage.getAuditLog(5);
      
      expect(result.success).toBe(true);
      expect(result.data?.length).toBeLessThanOrEqual(5);
    });

    it('should include audit entries for all operations', async () => {
      const result = await storage.getAuditLog();
      
      expect(result.success).toBe(true);
      const actions = result.data?.map(entry => entry.action) || [];
      expect(actions).toContain('store');
      expect(actions).toContain('retrieve');
    });
  });

  describe('Storage Validation', () => {
    it('should validate empty storage', async () => {
      const result = await storage.validateStorage();
      
      expect(result.success).toBe(true);
      expect(result.data?.credentialCount).toBe(0);
    });

    it('should validate storage with credentials', async () => {
      await storage.storeCredential(testKey, testValue);
      
      const result = await storage.validateStorage();
      
      expect(result.success).toBe(true);
      expect(result.data?.credentialCount).toBe(1);
    });

    it('should validate encrypted storage', async () => {
      const encryptionKey = 'test-encryption-key-123!@#';
      storage.setEncryptionKey(encryptionKey);
      
      await storage.storeCredential(testKey, testValue);
      
      const result = await storage.validateStorage();
      
      expect(result.success).toBe(true);
      expect(result.data?.encryptionEnabled).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      // Create storage with invalid path
      const invalidConfig: CredentialStorageConfig = {
        method: 'encrypted-config',
        location: '/invalid/path/that/does/not/exist/credentials.json',
        securityLevel: 'medium-high'
      };
      
      const invalidStorage = new CredentialStorage(invalidConfig);
      
      const result = await invalidStorage.storeCredential(testKey, testValue);
      
      // Should either succeed (if directory gets created) or fail gracefully
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle corrupted storage file', async () => {
      // Create a corrupted storage file
      await fs.writeFile(testStoragePath, 'corrupted json data', 'utf8');
      
      const result = await storage.listCredentials();
      
      // Should handle corruption gracefully
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent store operations', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => 
        storage.storeCredential(`concurrent-key-${i}`, `concurrent-value-${i}`)
      );
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      const listResult = await storage.listCredentials();
      expect(listResult.data?.length).toBe(10);
    });

    it('should handle concurrent retrieve operations', async () => {
      await storage.storeCredential(testKey, testValue);
      
      const promises = Array.from({ length: 10 }, () => 
        storage.retrieveCredential(testKey)
      );
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.data?.value).toBe(testValue);
      });
    });
  });

  describe('Encryption Integration', () => {
    it('should encrypt and decrypt data correctly', async () => {
      const encryptionKey = 'test-encryption-key-123!@#';
      storage.setEncryptionKey(encryptionKey);
      
      const originalValue = 'Sensitive data that needs encryption';
      
      // Store with encryption
      const storeResult = await storage.storeCredential(testKey, originalValue);
      expect(storeResult.success).toBe(true);
      expect(storeResult.data?.encrypted).toBe(true);
      
      // Retrieve and decrypt
      const retrieveResult = await storage.retrieveCredential(testKey);
      expect(retrieveResult.success).toBe(true);
      expect(retrieveResult.data?.value).toBe(originalValue);
      expect(retrieveResult.data?.encrypted).toBe(true);
    });

    it('should fail to decrypt with wrong key', async () => {
      const encryptionKey1 = 'encryption-key-1';
      const encryptionKey2 = 'encryption-key-2';
      
      storage.setEncryptionKey(encryptionKey1);
      await storage.storeCredential(testKey, testValue);
      
      // Change encryption key
      storage.setEncryptionKey(encryptionKey2);
      
      const result = await storage.retrieveCredential(testKey);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

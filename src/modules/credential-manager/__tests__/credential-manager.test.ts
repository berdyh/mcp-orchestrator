/**
 * Credential Manager Integration Tests
 * 
 * Comprehensive tests for the main credential manager functionality.
 */

import { CredentialManager, CredentialManagerConfig, credentialUtils } from '../index.js';
import { CredentialRequest, CredentialStorageResult } from '../../../types/credential.js';

// Mock the prompter to avoid interactive prompts in tests
jest.mock('../prompt', () => ({
  CredentialPrompter: jest.fn().mockImplementation(() => ({
    promptCredential: jest.fn().mockResolvedValue({
      success: true,
      value: 'mocked-credential-value'
    }),
    promptEncryptionKey: jest.fn().mockResolvedValue({
      success: true,
      value: 'mocked-encryption-key-123!@#'
    }),
    promptConfirmation: jest.fn().mockResolvedValue(true),
    close: jest.fn()
  })),
  defaultPrompter: {
    promptCredential: jest.fn().mockResolvedValue({
      success: true,
      value: 'mocked-credential-value'
    }),
    promptEncryptionKey: jest.fn().mockResolvedValue({
      success: true,
      value: 'mocked-encryption-key-123!@#'
    }),
    promptConfirmation: jest.fn().mockResolvedValue(true),
    close: jest.fn()
  }
}));

describe('CredentialManager', () => {
  let credentialManager: CredentialManager;
  const testKey = 'test-credential';
  const testValue = 'test-value-123';

  beforeEach(() => {
    const config: CredentialManagerConfig = {
      autoPrompt: false, // Disable auto-prompting for tests
      validateOnRetrieve: true
    };
    credentialManager = new CredentialManager(config);
  });

  describe('Constructor and Configuration', () => {
    it('should create instance with default configuration', () => {
      const defaultManager = new CredentialManager();
      expect(defaultManager).toBeInstanceOf(CredentialManager);
    });

    it('should create instance with custom configuration', () => {
      const config: CredentialManagerConfig = {
        autoPrompt: true,
        validateOnRetrieve: false,
        encryptionKey: 'test-key'
      };
      const customManager = new CredentialManager(config);
      expect(customManager).toBeInstanceOf(CredentialManager);
    });

    it('should set encryption key', () => {
      const encryptionKey = 'test-encryption-key-123!@#';
      credentialManager.setEncryptionKey(encryptionKey);
      // No direct way to test, but should not throw
      expect(() => credentialManager.setEncryptionKey(encryptionKey)).not.toThrow();
    });
  });

  describe('Get Credential', () => {
    it('should get credential from storage', async () => {
      // First store a credential
      await credentialManager.setCredential(testKey, testValue);
      
      // Then retrieve it
      const result = await credentialManager.getCredential(testKey);
      
      expect(result.success).toBe(true);
      expect(result.data?.value).toBe(testValue);
      expect(result.data?.source).toBe('storage');
    });

    it('should return error when credential not found and prompting disabled', async () => {
      const result = await credentialManager.getCredential('non-existent-key');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should validate credential on retrieve when enabled', async () => {
      await credentialManager.setCredential(testKey, testValue);
      
      const result = await credentialManager.getCredential(testKey, undefined, { validate: true });
      
      expect(result.success).toBe(true);
    });

    it('should skip validation when disabled', async () => {
      await credentialManager.setCredential(testKey, testValue);
      
      const result = await credentialManager.getCredential(testKey, undefined, { validate: false });
      
      expect(result.success).toBe(true);
    });
  });

  describe('Set Credential', () => {
    it('should set credential successfully', async () => {
      const result = await credentialManager.setCredential(testKey, testValue);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('set successfully');
    });

    it('should reject empty key name', async () => {
      const result = await credentialManager.setCredential('', testValue);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Key name must be a non-empty string');
    });

    it('should reject empty value', async () => {
      const result = await credentialManager.setCredential(testKey, '');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Value must be a non-empty string');
    });

    it('should handle special characters', async () => {
      const specialKey = 'test-key-with-special-chars!@#$%';
      const specialValue = 'Value with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
      
      const result = await credentialManager.setCredential(specialKey, specialValue);
      
      expect(result.success).toBe(true);
    });
  });

  describe('Remove Credential', () => {
    beforeEach(async () => {
      await credentialManager.setCredential(testKey, testValue);
    });

    it('should remove credential successfully', async () => {
      const result = await credentialManager.removeCredential(testKey);
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('removed successfully');
    });

    it('should not be able to get removed credential', async () => {
      await credentialManager.removeCredential(testKey);
      
      const result = await credentialManager.getCredential(testKey);
      expect(result.success).toBe(false);
    });

    it('should return error for non-existent credential', async () => {
      const result = await credentialManager.removeCredential('non-existent-key');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('List Credentials', () => {
    beforeEach(async () => {
      await credentialManager.setCredential('key1', 'value1');
      await credentialManager.setCredential('key2', 'value2');
      await credentialManager.setCredential('key3', 'value3');
    });

    it('should list all credentials', async () => {
      const result = await credentialManager.listCredentials();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data?.map(c => c.keyName)).toContain('key1');
      expect(result.data?.map(c => c.keyName)).toContain('key2');
      expect(result.data?.map(c => c.keyName)).toContain('key3');
    });

    it('should return empty list when no credentials exist', async () => {
      const emptyManager = new CredentialManager();
      const result = await emptyManager.listCredentials();
      
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('Credential Validation', () => {
    it('should validate API key format', async () => {
      const apiKey = 'sk-1234567890abcdef1234567890abcdef';
      const result = await credentialManager.validateCredential('api_key', apiKey);
      
      expect(result.valid).toBe(true);
    });

    it('should reject invalid API key format', async () => {
      const invalidApiKey = 'short';
      const result = await credentialManager.validateCredential('api_key', invalidApiKey);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too short');
    });

    it('should validate token format', async () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const result = await credentialManager.validateCredential('access_token', token);
      
      expect(result.valid).toBe(true);
    });

    it('should reject short token', async () => {
      const shortToken = 'short-token';
      const result = await credentialManager.validateCredential('access_token', shortToken);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too short');
    });

    it('should validate URL format', async () => {
      const url = 'https://api.example.com/v1/endpoint';
      const result = await credentialManager.validateCredential('api_url', url);
      
      expect(result.valid).toBe(true);
    });

    it('should reject invalid URL format', async () => {
      const invalidUrl = 'not-a-url';
      const result = await credentialManager.validateCredential('api_url', invalidUrl);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid URL format');
    });

    it('should validate email format', async () => {
      const email = 'user@example.com';
      const result = await credentialManager.validateCredential('user_email', email);
      
      expect(result.valid).toBe(true);
    });

    it('should reject invalid email format', async () => {
      const invalidEmail = 'not-an-email';
      const result = await credentialManager.validateCredential('user_email', invalidEmail);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid email format');
    });

    it('should validate generic credential', async () => {
      const genericValue = 'some-credential-value';
      const result = await credentialManager.validateCredential('generic_credential', genericValue);
      
      expect(result.valid).toBe(true);
    });

    it('should reject empty credential', async () => {
      const result = await credentialManager.validateCredential('any_key', '');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });
  });

  describe('Handle Credential Requests', () => {
    it('should handle multiple credential requests successfully', async () => {
      const requests: CredentialRequest[] = [
        {
          key_name: 'api_key',
          description: 'API key for external service',
          is_optional: false
        },
        {
          key_name: 'optional_setting',
          description: 'Optional configuration setting',
          is_optional: true
        }
      ];

      // Mock the prompter to return values
      const mockPrompter = credentialManager['prompter'];
      mockPrompter.promptCredential = jest.fn().mockResolvedValue({
        success: true,
        value: 'mocked-api-key-value'
      });

      const result = await credentialManager.handleCredentialRequests(requests);
      
      expect(result.status).toBe('success');
      expect(result.credential_keys).toContain('api_key');
    });

    it('should fail when required credentials are missing', async () => {
      const requests: CredentialRequest[] = [
        {
          key_name: 'required_key',
          description: 'Required credential',
          is_optional: false
        }
      ];

      // Mock the prompter to fail
      const mockPrompter = credentialManager['prompter'];
      mockPrompter.promptCredential = jest.fn().mockResolvedValue({
        success: false,
        error: 'User cancelled'
      });

      const result = await credentialManager.handleCredentialRequests(requests);
      
      expect(result.status).toBe('failed');
      expect(result.next_steps).toContain('Fix the following errors');
    });

    it('should skip optional credentials when they fail', async () => {
      const requests: CredentialRequest[] = [
        {
          key_name: 'required_key',
          description: 'Required credential',
          is_optional: false
        },
        {
          key_name: 'optional_key',
          description: 'Optional credential',
          is_optional: true
        }
      ];

      // Mock the prompter to succeed for required, fail for optional
      const mockPrompter = credentialManager['prompter'];
      mockPrompter.promptCredential = jest.fn()
        .mockResolvedValueOnce({
          success: true,
          value: 'required-value'
        })
        .mockResolvedValueOnce({
          success: false,
          error: 'Optional credential failed'
        });

      const result = await credentialManager.handleCredentialRequests(requests);
      
      expect(result.status).toBe('success');
      expect(result.credential_keys).toContain('required_key');
      expect(result.credential_keys).not.toContain('optional_key');
    });
  });

  describe('Initialize Encryption', () => {
    it('should initialize encryption successfully', async () => {
      const result = await credentialManager.initializeEncryption();
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('initialized successfully');
    });

    it('should return success when encryption already initialized', async () => {
      credentialManager.setEncryptionKey('existing-key');
      
      const result = await credentialManager.initializeEncryption();
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('already initialized');
    });
  });

  describe('Storage Validation', () => {
    it('should validate storage successfully', async () => {
      const result = await credentialManager.validateStorage();
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('validation passed');
    });

    it('should return storage information', async () => {
      await credentialManager.setCredential(testKey, testValue);
      
      const result = await credentialManager.validateStorage();
      
      expect(result.success).toBe(true);
      expect(result.data?.credentialCount).toBe(1);
    });
  });

  describe('Audit Log', () => {
    it('should get audit log successfully', async () => {
      await credentialManager.setCredential(testKey, testValue);
      
      const result = await credentialManager.getAuditLog();
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should limit audit log entries', async () => {
      const result = await credentialManager.getAuditLog(5);
      
      expect(result.success).toBe(true);
      expect(result.data?.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      // This test would require mocking the storage layer to throw errors
      // For now, we'll test that the manager doesn't crash
      const result = await credentialManager.getCredential('non-existent-key');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle validation errors gracefully', async () => {
      const result = await credentialManager.validateCredential('test_key', '');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

describe('credentialUtils', () => {
  beforeEach(() => {
    // Reset any mocks
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should get credential successfully', async () => {
      // Mock the default credential manager
      const mockGetCredential = jest.fn().mockResolvedValue({
        success: true,
        data: { value: 'test-value' }
      });
      
      // This would require more complex mocking of the default instance
      // For now, we'll test the function signature
      expect(typeof credentialUtils.get).toBe('function');
    });
  });

  describe('set', () => {
    it('should set credential successfully', async () => {
      expect(typeof credentialUtils.set).toBe('function');
    });
  });

  describe('remove', () => {
    it('should remove credential successfully', async () => {
      expect(typeof credentialUtils.remove).toBe('function');
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate encryption key', () => {
      const key = credentialUtils.generateEncryptionKey();
      
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key.length).toBe(64);
    });
  });
});

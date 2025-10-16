/**
 * Encryption/Decryption Tests
 * 
 * Comprehensive tests for AES-256 encryption and decryption functionality.
 */

import { AES256Encryption, encryptionUtils, EncryptionResult, DecryptionInput } from '../encryption';
import { DEFAULT_ENCRYPTION_CONFIG } from '../../../types/credential';

describe('AES256Encryption', () => {
  let encryption: AES256Encryption;
  const testPassword = 'test-password-123!@#';
  const testData = 'This is sensitive credential data that needs to be encrypted';

  beforeEach(() => {
    encryption = new AES256Encryption();
  });

  describe('Constructor and Configuration', () => {
    it('should create instance with default configuration', () => {
      expect(encryption).toBeInstanceOf(AES256Encryption);
    });

    it('should create instance with custom configuration', () => {
      const customConfig = {
        algorithm: 'aes-256-gcm',
        keyDerivation: 'pbkdf2',
        saltLength: 16,
        iterations: 50000
      };
      const customEncryption = new AES256Encryption(customConfig);
      expect(customEncryption).toBeInstanceOf(AES256Encryption);
    });

    it('should validate configuration correctly', () => {
      expect(encryption.validateConfig()).toBe(true);
    });

    it('should reject invalid algorithm', () => {
      const invalidConfig = { ...DEFAULT_ENCRYPTION_CONFIG, algorithm: '' };
      const invalidEncryption = new AES256Encryption(invalidConfig);
      expect(invalidEncryption.validateConfig()).toBe(false);
    });

    it('should reject invalid salt length', () => {
      const invalidConfig = { ...DEFAULT_ENCRYPTION_CONFIG, saltLength: 5 };
      const invalidEncryption = new AES256Encryption(invalidConfig);
      expect(invalidEncryption.validateConfig()).toBe(false);
    });

    it('should reject invalid iteration count', () => {
      const invalidConfig = { ...DEFAULT_ENCRYPTION_CONFIG, iterations: 1000 };
      const invalidEncryption = new AES256Encryption(invalidConfig);
      expect(invalidEncryption.validateConfig()).toBe(false);
    });
  });

  describe('Encryption', () => {
    it('should encrypt data successfully', async () => {
      const result = await encryption.encrypt(testData, testPassword);
      
      expect(result).toBeDefined();
      expect(result.encryptedData).toBeDefined();
      expect(result.iv).toBeDefined();
      expect(result.salt).toBeDefined();
      expect(result.tag).toBeDefined();
      expect(result.algorithm).toBe(DEFAULT_ENCRYPTION_CONFIG.algorithm);
      
      // Verify encrypted data is different from original
      expect(result.encryptedData).not.toBe(testData);
      expect(result.encryptedData.length).toBeGreaterThan(0);
    });

    it('should produce different encrypted data for same input', async () => {
      const result1 = await encryption.encrypt(testData, testPassword);
      const result2 = await encryption.encrypt(testData, testPassword);
      
      // Due to random IV and salt, encrypted data should be different
      expect(result1.encryptedData).not.toBe(result2.encryptedData);
      expect(result1.iv).not.toBe(result2.iv);
      expect(result1.salt).not.toBe(result2.salt);
    });

    it('should handle empty string', async () => {
      const result = await encryption.encrypt('', testPassword);
      expect(result.encryptedData).toBeDefined();
      expect(result.encryptedData.length).toBeGreaterThan(0);
    });

    it('should handle special characters', async () => {
      const specialData = 'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
      const result = await encryption.encrypt(specialData, testPassword);
      expect(result.encryptedData).toBeDefined();
    });

    it('should handle unicode characters', async () => {
      const unicodeData = 'Unicode: 你好世界 🌍 émojis';
      const result = await encryption.encrypt(unicodeData, testPassword);
      expect(result.encryptedData).toBeDefined();
    });

    it('should handle long data', async () => {
      const longData = 'A'.repeat(10000);
      const result = await encryption.encrypt(longData, testPassword);
      expect(result.encryptedData).toBeDefined();
    });

    it('should reject empty password', async () => {
      await expect(encryption.encrypt(testData, '')).rejects.toThrow('Password must be a non-empty string');
    });

    it('should reject null password', async () => {
      await expect(encryption.encrypt(testData, null as any)).rejects.toThrow('Password must be a non-empty string');
    });

    it('should reject undefined password', async () => {
      await expect(encryption.encrypt(testData, undefined as any)).rejects.toThrow('Password must be a non-empty string');
    });

    it('should reject empty data', async () => {
      await expect(encryption.encrypt('', testPassword)).rejects.toThrow('Plaintext must be a non-empty string');
    });

    it('should reject null data', async () => {
      await expect(encryption.encrypt(null as any, testPassword)).rejects.toThrow('Plaintext must be a non-empty string');
    });
  });

  describe('Decryption', () => {
    let encryptionResult: EncryptionResult;

    beforeEach(async () => {
      encryptionResult = await encryption.encrypt(testData, testPassword);
    });

    it('should decrypt data successfully', async () => {
      const decrypted = await encryption.decrypt(encryptionResult, testPassword);
      expect(decrypted).toBe(testData);
    });

    it('should handle empty encrypted data', async () => {
      const emptyResult = await encryption.encrypt('', testPassword);
      const decrypted = await encryption.decrypt(emptyResult, testPassword);
      expect(decrypted).toBe('');
    });

    it('should handle special characters', async () => {
      const specialData = 'Special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';
      const result = await encryption.encrypt(specialData, testPassword);
      const decrypted = await encryption.decrypt(result, testPassword);
      expect(decrypted).toBe(specialData);
    });

    it('should handle unicode characters', async () => {
      const unicodeData = 'Unicode: 你好世界 🌍 émojis';
      const result = await encryption.encrypt(unicodeData, testPassword);
      const decrypted = await encryption.decrypt(result, testPassword);
      expect(decrypted).toBe(unicodeData);
    });

    it('should handle long data', async () => {
      const longData = 'A'.repeat(10000);
      const result = await encryption.encrypt(longData, testPassword);
      const decrypted = await encryption.decrypt(result, testPassword);
      expect(decrypted).toBe(longData);
    });

    it('should reject wrong password', async () => {
      const wrongPassword = 'wrong-password';
      await expect(encryption.decrypt(encryptionResult, wrongPassword)).rejects.toThrow('Decryption failed');
    });

    it('should reject empty password', async () => {
      await expect(encryption.decrypt(encryptionResult, '')).rejects.toThrow('Password must be a non-empty string');
    });

    it('should reject invalid encryption data', async () => {
      const invalidInput: DecryptionInput = {
        encryptedData: 'invalid',
        iv: encryptionResult.iv,
        salt: encryptionResult.salt,
        tag: encryptionResult.tag,
        algorithm: encryptionResult.algorithm
      };
      await expect(encryption.decrypt(invalidInput, testPassword)).rejects.toThrow('Decryption failed');
    });

    it('should reject missing fields', async () => {
      const incompleteInput: DecryptionInput = {
        encryptedData: encryptionResult.encryptedData,
        iv: '',
        salt: encryptionResult.salt,
        tag: encryptionResult.tag,
        algorithm: encryptionResult.algorithm
      };
      await expect(encryption.decrypt(incompleteInput, testPassword)).rejects.toThrow('Invalid decryption input');
    });

    it('should reject corrupted tag', async () => {
      const corruptedInput: DecryptionInput = {
        encryptedData: encryptionResult.encryptedData,
        iv: encryptionResult.iv,
        salt: encryptionResult.salt,
        tag: 'corrupted-tag',
        algorithm: encryptionResult.algorithm
      };
      await expect(encryption.decrypt(corruptedInput, testPassword)).rejects.toThrow('Decryption failed');
    });
  });

  describe('Round-trip Encryption/Decryption', () => {
    const testCases = [
      'Simple text',
      'Text with spaces and numbers 123',
      'Special characters: !@#$%^&*()_+-=[]{}|;:,.<>?',
      'Unicode: 你好世界 🌍 émojis',
      'Very long text: ' + 'A'.repeat(1000),
      'JSON data: {"key": "value", "number": 123}',
      'Multiline text:\nLine 1\nLine 2\nLine 3',
      'Empty after trim:   ',
      'Single character: a',
      'Numbers only: 1234567890'
    ];

    testCases.forEach((testCase, index) => {
      it(`should handle round-trip for test case ${index + 1}`, async () => {
        const encrypted = await encryption.encrypt(testCase, testPassword);
        const decrypted = await encryption.decrypt(encrypted, testPassword);
        expect(decrypted).toBe(testCase);
      });
    });
  });

  describe('Password Strength Validation', () => {
    it('should generate secure password', () => {
      const password = AES256Encryption.generateSecurePassword();
      expect(password).toBeDefined();
      expect(password.length).toBe(32);
      expect(typeof password).toBe('string');
    });

    it('should generate password with custom length', () => {
      const password = AES256Encryption.generateSecurePassword(64);
      expect(password.length).toBe(64);
    });

    it('should reject invalid password length', () => {
      expect(() => AES256Encryption.generateSecurePassword(5)).toThrow('Password length must be between 16 and 128 characters');
      expect(() => AES256Encryption.generateSecurePassword(200)).toThrow('Password length must be between 16 and 128 characters');
    });

    it('should validate strong password', () => {
      const strongPassword = 'StrongPass123!@#';
      const validation = AES256Encryption.validatePasswordStrength(strongPassword);
      expect(validation.valid).toBe(true);
      expect(validation.score).toBeGreaterThanOrEqual(3);
    });

    it('should reject weak password', () => {
      const weakPassword = 'weak';
      const validation = AES256Encryption.validatePasswordStrength(weakPassword);
      expect(validation.valid).toBe(false);
      expect(validation.score).toBeLessThan(3);
    });

    it('should provide feedback for weak passwords', () => {
      const weakPassword = 'weak';
      const validation = AES256Encryption.validatePasswordStrength(weakPassword);
      expect(validation.feedback).toBeDefined();
      expect(validation.feedback.length).toBeGreaterThan(0);
    });

    it('should validate password with all requirements', () => {
      const perfectPassword = 'PerfectPass123!@#';
      const validation = AES256Encryption.validatePasswordStrength(perfectPassword);
      expect(validation.valid).toBe(true);
      expect(validation.score).toBe(5);
    });
  });

  describe('Performance Tests', () => {
    it('should encrypt within reasonable time', async () => {
      const startTime = Date.now();
      await encryption.encrypt(testData, testPassword);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 5 seconds (generous for CI environments)
      expect(duration).toBeLessThan(5000);
    });

    it('should decrypt within reasonable time', async () => {
      const encryptionResult = await encryption.encrypt(testData, testPassword);
      
      const startTime = Date.now();
      await encryption.decrypt(encryptionResult, testPassword);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 5 seconds (generous for CI environments)
      expect(duration).toBeLessThan(5000);
    });

    it('should handle multiple concurrent operations', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => 
        encryption.encrypt(`Test data ${i}`, testPassword)
      );
      
      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      
      // Verify all results are different
      const encryptedData = results.map(r => r.encryptedData);
      const uniqueData = new Set(encryptedData);
      expect(uniqueData.size).toBe(10);
    });
  });
});

describe('encryptionUtils', () => {
  const testPassword = 'test-password-123!@#';
  const testData = 'Test credential data';

  describe('encryptCredential', () => {
    it('should encrypt credential successfully', async () => {
      const result = await encryptionUtils.encryptCredential(testData, testPassword);
      expect(result).toBeDefined();
      expect(result.encryptedData).toBeDefined();
      expect(result.algorithm).toBe(DEFAULT_ENCRYPTION_CONFIG.algorithm);
    });
  });

  describe('decryptCredential', () => {
    it('should decrypt credential successfully', async () => {
      const encrypted = await encryptionUtils.encryptCredential(testData, testPassword);
      const decrypted = await encryptionUtils.decryptCredential(encrypted, testPassword);
      expect(decrypted).toBe(testData);
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate encryption key', () => {
      const key = encryptionUtils.generateEncryptionKey();
      expect(key).toBeDefined();
      expect(key.length).toBe(64);
      expect(typeof key).toBe('string');
    });
  });

  describe('validateEncryptionKey', () => {
    it('should validate strong encryption key', () => {
      const strongKey = 'StrongEncryptionKey123!@#$%^&*()_+-=[]{}|;:,.<>?';
      const validation = encryptionUtils.validateEncryptionKey(strongKey);
      expect(validation.valid).toBe(true);
    });

    it('should reject weak encryption key', () => {
      const weakKey = 'weak';
      const validation = encryptionUtils.validateEncryptionKey(weakKey);
      expect(validation.valid).toBe(false);
    });
  });
});

describe('Security Tests', () => {
  let encryption: AES256Encryption;
  const testPassword = 'test-password-123!@#';
  const testData = 'Sensitive credential data';

  beforeEach(() => {
    encryption = new AES256Encryption();
  });

  it('should not leak password in encrypted data', async () => {
    const result = await encryption.encrypt(testData, testPassword);
    
    // Encrypted data should not contain any part of the password
    expect(result.encryptedData).not.toContain(testPassword);
    expect(result.iv).not.toContain(testPassword);
    expect(result.salt).not.toContain(testPassword);
    expect(result.tag).not.toContain(testPassword);
  });

  it('should not leak original data in encrypted data', async () => {
    const result = await encryption.encrypt(testData, testPassword);
    
    // Encrypted data should not contain any part of the original data
    expect(result.encryptedData).not.toContain(testData);
    expect(result.iv).not.toContain(testData);
    expect(result.salt).not.toContain(testData);
    expect(result.tag).not.toContain(testData);
  });

  it('should produce different results for different passwords', async () => {
    const password1 = 'password1';
    const password2 = 'password2';
    
    const result1 = await encryption.encrypt(testData, password1);
    const result2 = await encryption.encrypt(testData, password2);
    
    expect(result1.encryptedData).not.toBe(result2.encryptedData);
    expect(result1.iv).not.toBe(result2.iv);
    expect(result1.salt).not.toBe(result2.salt);
    expect(result1.tag).not.toBe(result2.tag);
  });

  it('should produce different results for different data', async () => {
    const data1 = 'data1';
    const data2 = 'data2';
    
    const result1 = await encryption.encrypt(data1, testPassword);
    const result2 = await encryption.encrypt(data2, testPassword);
    
    expect(result1.encryptedData).not.toBe(result2.encryptedData);
    expect(result1.iv).not.toBe(result2.iv);
    expect(result1.salt).not.toBe(result2.salt);
    expect(result1.tag).not.toBe(result2.tag);
  });

  it('should maintain data integrity', async () => {
    const originalData = 'Original data with special chars: !@#$%^&*()';
    const encrypted = await encryption.encrypt(originalData, testPassword);
    const decrypted = await encryption.decrypt(encrypted, testPassword);
    
    expect(decrypted).toBe(originalData);
  });

  it('should detect tampering', async () => {
    const encrypted = await encryption.encrypt(testData, testPassword);
    
    // Tamper with the encrypted data
    const tamperedData = encrypted.encryptedData.slice(0, -1) + 'X';
    const tamperedInput: DecryptionInput = {
      ...encrypted,
      encryptedData: tamperedData
    };
    
    await expect(encryption.decrypt(tamperedInput, testPassword)).rejects.toThrow('Decryption failed');
  });
});

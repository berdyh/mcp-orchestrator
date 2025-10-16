/**
 * Credential Storage Interface
 * 
 * This module provides secure file-based credential storage with proper permissions
 * and encryption support for the MCP Meta-Orchestrator.
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { createLogger } from '../../utils/logger';
import type { 
  StoredCredential, 
  CredentialStorageConfig, 
  SecurityAuditEntry
} from '../../types/credential';
import { STORAGE_PRIORITY } from '../../types/credential';
import type { EncryptionResult, DecryptionInput } from './encryption';
import { AES256Encryption } from './encryption';

const logger = createLogger('credential-storage');

/**
 * Storage file structure
 */
interface StorageFile {
  version: string;
  credentials: Record<string, StoredCredential>;
  metadata: {
    createdAt: string;
    lastModified: string;
    encryptionEnabled: boolean;
    storageMethod: string;
  };
  auditLog: SecurityAuditEntry[];
}

/**
 * Storage operation result
 */
export interface StorageOperationResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Credential storage manager
 */
export class CredentialStorage {
  private config: CredentialStorageConfig;
  private storagePath: string;
  private encryption?: AES256Encryption;
  private encryptionKey?: string | undefined;

  constructor(config?: CredentialStorageConfig) {
    this.config = (config ?? STORAGE_PRIORITY[1]) as CredentialStorageConfig; // Default to encrypted-config
    this.storagePath = this.resolveStoragePath();
    this.initializeEncryption();
  }

  /**
   * Resolves the storage path based on configuration
   */
  private resolveStoragePath(): string {
    if (this.config.location) {
      return this.config.location.startsWith('~') 
        ? join(homedir(), this.config.location.slice(1))
        : this.config.location;
    }

    // Default storage location
    const defaultPath = join(homedir(), '.mcp-hub', 'credentials.json');
    return defaultPath;
  }

  /**
   * Initializes encryption if configured
   */
  private initializeEncryption(): void {
    if (this.config.method === 'encrypted-config' && this.config.encryption) {
      this.encryption = new AES256Encryption({
        algorithm: this.config.encryption.algorithm,
        keyDerivation: this.config.encryption.keyDerivation,
        saltLength: 32,
        iterations: 100000
      });
    }
  }

  /**
   * Sets the encryption key for encrypted storage
   */
  setEncryptionKey(key: string): void {
    if (!this.encryption) {
      throw new Error('Encryption not configured for this storage method');
    }
    this.encryptionKey = key;
  }

  /**
   * Ensures the storage directory exists with proper permissions
   */
  private async ensureStorageDirectory(): Promise<void> {
    try {
      const dir = dirname(this.storagePath);
      await fs.mkdir(dir, { recursive: true, mode: 0o700 });
      logger.debug('Storage directory ensured', { path: dir });
    } catch (error) {
      logger.error('Failed to create storage directory', { 
        path: dirname(this.storagePath),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(`Failed to create storage directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sets proper file permissions for security
   */
  private async setSecurePermissions(filePath: string): Promise<void> {
    try {
      await fs.chmod(filePath, 0o600); // Read/write for owner only
      logger.debug('Secure permissions set', { path: filePath });
    } catch (error) {
      logger.warn('Failed to set secure permissions', { 
        path: filePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Creates a new storage file with proper structure
   */
  private createStorageFile(): StorageFile {
    const now = new Date().toISOString();
    return {
      version: '1.0.0',
      credentials: {},
      metadata: {
        createdAt: now,
        lastModified: now,
        encryptionEnabled: this.config.method === 'encrypted-config',
        storageMethod: this.config.method
      },
      auditLog: []
    };
  }

  /**
   * Loads the storage file
   */
  private async loadStorageFile(): Promise<StorageFile> {
    try {
      await this.ensureStorageDirectory();
      
      try {
        const data = await fs.readFile(this.storagePath, 'utf8');
        const storageFile: StorageFile = JSON.parse(data);
        
        // Validate file structure
        if (!storageFile.version || !storageFile.credentials || !storageFile.metadata) {
          throw new Error('Invalid storage file format');
        }

        logger.debug('Storage file loaded', { 
          path: this.storagePath,
          credentialCount: Object.keys(storageFile.credentials).length
        });

        return storageFile;
      } catch (error) {
        if ((error as any).code === 'ENOENT') {
          // File doesn't exist, create new one
          logger.info('Storage file not found, creating new one', { path: this.storagePath });
          return this.createStorageFile();
        }
        throw error;
      }
    } catch (error) {
      logger.error('Failed to load storage file', { 
        path: this.storagePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(`Failed to load storage file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Saves the storage file with encryption if configured
   */
  private async saveStorageFile(storageFile: StorageFile): Promise<void> {
    try {
      await this.ensureStorageDirectory();
      
      let dataToWrite: string;
      
      if (this.encryption && this.encryptionKey) {
        // Encrypt the entire storage file
        const encryptionResult = await this.encryption.encrypt(JSON.stringify(storageFile), this.encryptionKey);
        dataToWrite = JSON.stringify({
          encrypted: true,
          data: encryptionResult
        });
      } else {
        dataToWrite = JSON.stringify(storageFile, null, 2);
      }

      await fs.writeFile(this.storagePath, dataToWrite, 'utf8');
      await this.setSecurePermissions(this.storagePath);
      
      logger.debug('Storage file saved', { 
        path: this.storagePath,
        encrypted: !!this.encryption,
        credentialCount: Object.keys(storageFile.credentials).length
      });
    } catch (error) {
      logger.error('Failed to save storage file', { 
        path: this.storagePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(`Failed to save storage file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Adds an audit entry
   */
  private addAuditEntry(
    storageFile: StorageFile,
    action: SecurityAuditEntry['action'],
    credentialKey: string,
    success: boolean,
    error?: string,
    metadata?: Record<string, any>
  ): void {
    const auditEntry: SecurityAuditEntry = {
      timestamp: new Date(),
      action,
      credentialKey,
      success,
      ...(error && { error }),
      ...(metadata && { metadata })
    };

    storageFile.auditLog.push(auditEntry);
    
    // Keep only last 1000 audit entries
    if (storageFile.auditLog.length > 1000) {
      storageFile.auditLog = storageFile.auditLog.slice(-1000);
    }

    storageFile.metadata.lastModified = new Date().toISOString();
  }

  /**
   * Stores a credential
   */
  async storeCredential(keyName: string, value: string): Promise<StorageOperationResult> {
    try {
      if (!keyName || typeof keyName !== 'string') {
        throw new Error('Key name must be a non-empty string');
      }

      if (!value || typeof value !== 'string') {
        throw new Error('Value must be a non-empty string');
      }

      const storageFile = await this.loadStorageFile();
      const now = new Date();

      // Create stored credential
      const storedCredential: StoredCredential = {
        keyName,
        value: this.encryption && this.encryptionKey ? 
          JSON.stringify(await this.encryption.encrypt(value, this.encryptionKey)) : 
          value,
        encrypted: !!this.encryption,
        storedAt: now,
        lastAccessed: now,
        accessCount: 0
      };

      storageFile.credentials[keyName] = storedCredential;
      this.addAuditEntry(storageFile, 'store', keyName, true);

      await this.saveStorageFile(storageFile);

      logger.info('Credential stored successfully', { keyName, encrypted: !!this.encryption });

      return {
        success: true,
        message: `Credential '${keyName}' stored successfully`,
        data: { keyName, encrypted: !!this.encryption }
      };
    } catch (error) {
      logger.error('Failed to store credential', { 
        keyName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        message: `Failed to store credential '${keyName}'`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Retrieves a credential
   */
  async retrieveCredential(keyName: string): Promise<StorageOperationResult> {
    try {
      if (!keyName || typeof keyName !== 'string') {
        throw new Error('Key name must be a non-empty string');
      }

      const storageFile = await this.loadStorageFile();
      const storedCredential = storageFile.credentials[keyName];

      if (!storedCredential) {
        this.addAuditEntry(storageFile, 'retrieve', keyName, false, 'Credential not found');
        return {
          success: false,
          message: `Credential '${keyName}' not found`,
          error: 'Credential not found'
        };
      }

      // Update access information
      storedCredential.lastAccessed = new Date();
      storedCredential.accessCount += 1;

      let decryptedValue: string;
      
      if (storedCredential.encrypted && this.encryption && this.encryptionKey) {
        // Decrypt the credential
        const encryptionData = JSON.parse(storedCredential.value) as EncryptionResult;
        decryptedValue = await this.encryption.decrypt(encryptionData, this.encryptionKey);
      } else {
        decryptedValue = storedCredential.value;
      }

      this.addAuditEntry(storageFile, 'retrieve', keyName, true);
      await this.saveStorageFile(storageFile);

      logger.info('Credential retrieved successfully', { keyName, encrypted: storedCredential.encrypted });

      return {
        success: true,
        message: `Credential '${keyName}' retrieved successfully`,
        data: { keyName, value: decryptedValue, encrypted: storedCredential.encrypted }
      };
    } catch (error) {
      logger.error('Failed to retrieve credential', { 
        keyName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        message: `Failed to retrieve credential '${keyName}'`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Lists all stored credentials
   */
  async listCredentials(): Promise<StorageOperationResult> {
    try {
      const storageFile = await this.loadStorageFile();
      const credentialList = Object.keys(storageFile.credentials).map(keyName => {
        const cred = storageFile.credentials[keyName];
        if (!cred) return null;
        return {
          keyName: cred.keyName,
          encrypted: cred.encrypted,
          storedAt: cred.storedAt,
          lastAccessed: cred.lastAccessed,
          accessCount: cred.accessCount
        };
      }).filter(Boolean);

      logger.debug('Credentials listed', { count: credentialList.length });

      return {
        success: true,
        message: `Found ${credentialList.length} stored credentials`,
        data: credentialList
      };
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
   * Deletes a credential
   */
  async deleteCredential(keyName: string): Promise<StorageOperationResult> {
    try {
      if (!keyName || typeof keyName !== 'string') {
        throw new Error('Key name must be a non-empty string');
      }

      const storageFile = await this.loadStorageFile();
      
      if (!storageFile.credentials[keyName]) {
        this.addAuditEntry(storageFile, 'delete', keyName, false, 'Credential not found');
        return {
          success: false,
          message: `Credential '${keyName}' not found`,
          error: 'Credential not found'
        };
      }

      delete storageFile.credentials[keyName];
      this.addAuditEntry(storageFile, 'delete', keyName, true);

      await this.saveStorageFile(storageFile);

      logger.info('Credential deleted successfully', { keyName });

      return {
        success: true,
        message: `Credential '${keyName}' deleted successfully`,
        data: { keyName }
      };
    } catch (error) {
      logger.error('Failed to delete credential', { 
        keyName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        message: `Failed to delete credential '${keyName}'`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Gets audit log
   */
  async getAuditLog(limit: number = 100): Promise<StorageOperationResult> {
    try {
      const storageFile = await this.loadStorageFile();
      const auditLog = storageFile.auditLog.slice(-limit);

      return {
        success: true,
        message: `Retrieved ${auditLog.length} audit entries`,
        data: auditLog
      };
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

  /**
   * Validates storage integrity
   */
  async validateStorage(): Promise<StorageOperationResult> {
    try {
      const storageFile = await this.loadStorageFile();
      
      // Check file structure
      if (!storageFile.version || !storageFile.credentials || !storageFile.metadata) {
        throw new Error('Invalid storage file structure');
      }

      // Check encryption consistency
      const hasEncryptedCreds = Object.values(storageFile.credentials).some(cred => cred.encrypted);
      const encryptionEnabled = storageFile.metadata.encryptionEnabled;
      
      if (hasEncryptedCreds !== encryptionEnabled) {
        throw new Error('Encryption state mismatch');
      }

      logger.info('Storage validation completed', { 
        credentialCount: Object.keys(storageFile.credentials).length,
        encryptionEnabled
      });

      return {
        success: true,
        message: 'Storage validation passed',
        data: {
          credentialCount: Object.keys(storageFile.credentials).length,
          encryptionEnabled,
          lastModified: storageFile.metadata.lastModified
        }
      };
    } catch (error) {
      logger.error('Storage validation failed', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        message: 'Storage validation failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

/**
 * Default storage instance
 */
export const defaultStorage = new CredentialStorage();

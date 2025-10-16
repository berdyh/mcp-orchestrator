/**
 * File System Manager
 * 
 * This module handles all file system operations for MCP configuration files,
 * including reading, writing, backing up, and managing configuration files.
 */

import { createLogger } from '../../utils/logger.js';
import { promises as fs } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { homedir } from 'os';
import { createHash } from 'crypto';
import type { 
  FileSystemResult,
  BackupInfo,
  ConfigFileMetadata,
  EnvironmentConfig
} from './types.js';

const logger = createLogger('file-system-manager');

/**
 * File system manager class
 */
export class FileSystemManager {
  private baseConfigDir: string;
  private backupDir: string;

  constructor() {
    this.baseConfigDir = join(homedir(), '.mcp-hub', 'configs');
    this.backupDir = join(homedir(), '.mcp-hub', 'backups');
    
    this.ensureDirectories();
  }

  /**
   * Ensure required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.baseConfigDir, { recursive: true });
      await fs.mkdir(this.backupDir, { recursive: true });
      logger.debug('Configuration directories ensured', { 
        configDir: this.baseConfigDir,
        backupDir: this.backupDir
      });
    } catch (error) {
      logger.error('Failed to create configuration directories', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generate configuration file path
   */
  async generateConfigFilePath(subtaskId: string, environment: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `mcp-config-${subtaskId}-${environment}-${timestamp}.json`;
    return join(this.baseConfigDir, filename);
  }

  /**
   * Write configuration file
   */
  async writeConfigFile(
    filePath: string, 
    config: Record<string, any>, 
    envConfig: EnvironmentConfig
  ): Promise<FileSystemResult> {
    try {
      // Ensure directory exists
      await fs.mkdir(dirname(filePath), { recursive: true });

      // Convert config to appropriate format
      let content: string;
      switch (envConfig.configFormat) {
        case 'json':
          content = JSON.stringify(config, null, 2);
          break;
        case 'yaml':
          // For now, fall back to JSON. YAML support can be added later
          content = JSON.stringify(config, null, 2);
          break;
        case 'toml':
          // For now, fall back to JSON. TOML support can be added later
          content = JSON.stringify(config, null, 2);
          break;
        default:
          content = JSON.stringify(config, null, 2);
      }

      // Write file
      await fs.writeFile(filePath, content, 'utf8');

      // Set appropriate permissions (readable by owner only for security)
      await fs.chmod(filePath, 0o600);

      const stats = await fs.stat(filePath);

      logger.info('Configuration file written successfully', { 
        filePath,
        size: stats.size,
        format: envConfig.configFormat
      });

      return {
        success: true,
        data: {
          filePath,
          size: stats.size,
          format: envConfig.configFormat
        },
        metadata: {
          file_size: stats.size,
          created_at: stats.birthtime.toISOString(),
          modified_at: stats.mtime.toISOString(),
          permissions: '0o600'
        }
      };

    } catch (error) {
      logger.error('Failed to write configuration file', { 
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Read configuration file
   */
  async readConfigFile(filePath: string): Promise<Record<string, any>> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      
      // Try to parse as JSON first
      try {
        return JSON.parse(content);
      } catch {
        // If JSON parsing fails, try other formats
        // For now, we only support JSON
        throw new Error('Unsupported configuration format. Only JSON is currently supported.');
      }
    } catch (error) {
      logger.error('Failed to read configuration file', { 
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Backup configuration file
   */
  async backupConfigFile(filePath: string): Promise<string> {
    try {
      const stats = await fs.stat(filePath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = basename(filePath, extname(filePath));
      const extension = extname(filePath);
      const backupFilename = `${filename}-backup-${timestamp}${extension}`;
      const backupPath = join(this.backupDir, backupFilename);

      // Copy file to backup location
      await fs.copyFile(filePath, backupPath);

      // Set appropriate permissions
      await fs.chmod(backupPath, 0o600);

      logger.info('Configuration file backed up', { 
        originalPath: filePath,
        backupPath,
        size: stats.size
      });

      return backupPath;
    } catch (error) {
      logger.error('Failed to backup configuration file', { 
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get backup information
   */
  async getBackupInfo(filePath: string): Promise<BackupInfo[]> {
    try {
      const backups: BackupInfo[] = [];
      const filename = basename(filePath, extname(filePath));
      const extension = extname(filePath);
      const backupPattern = new RegExp(`^${filename}-backup-.*\\${extension}$`);

      const backupFiles = await fs.readdir(this.backupDir);
      
      for (const backupFile of backupFiles) {
        if (backupPattern.test(backupFile)) {
          const backupPath = join(this.backupDir, backupFile);
          const stats = await fs.stat(backupPath);
          const content = await fs.readFile(backupPath, 'utf8');
          const checksum = createHash('sha256').update(content).digest('hex');

          backups.push({
            originalPath: filePath,
            backupPath,
            timestamp: stats.birthtime.toISOString(),
            size: stats.size,
            checksum
          });
        }
      }

      // Sort by timestamp (newest first)
      backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return backups;
    } catch (error) {
      logger.error('Failed to get backup information', { 
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Restore from backup
   */
  async restoreFromBackup(backupPath: string, targetPath: string): Promise<FileSystemResult> {
    try {
      // Verify backup exists
      await fs.access(backupPath);

      // Copy backup to target location
      await fs.copyFile(backupPath, targetPath);

      // Set appropriate permissions
      await fs.chmod(targetPath, 0o600);

      const stats = await fs.stat(targetPath);

      logger.info('Configuration restored from backup', { 
        backupPath,
        targetPath,
        size: stats.size
      });

      return {
        success: true,
        data: {
          backupPath,
          targetPath,
          size: stats.size
        },
        metadata: {
          file_size: stats.size,
          created_at: stats.birthtime.toISOString(),
          modified_at: stats.mtime.toISOString(),
          permissions: '0o600'
        }
      };

    } catch (error) {
      logger.error('Failed to restore from backup', { 
        backupPath,
        targetPath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get configuration file metadata
   */
  async getConfigFileMetadata(filePath: string): Promise<ConfigFileMetadata> {
    try {
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf8');
      const config = JSON.parse(content);

      return {
        path: filePath,
        size: stats.size,
        created: stats.birthtime.toISOString(),
        modified: stats.mtime.toISOString(),
        environment: config.environment || 'unknown',
        mcpCount: config.metadata?.total_mcps || 0,
        isValid: true, // We'll validate this separately
        backupAvailable: (await this.getBackupInfo(filePath)).length > 0
      };
    } catch (error) {
      logger.error('Failed to get configuration file metadata', { 
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        path: filePath,
        size: 0,
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        environment: 'unknown',
        mcpCount: 0,
        isValid: false,
        backupAvailable: false
      };
    }
  }

  /**
   * List all configuration files
   */
  async listConfigFiles(): Promise<ConfigFileMetadata[]> {
    try {
      const files = await fs.readdir(this.baseConfigDir);
      const configFiles: ConfigFileMetadata[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = join(this.baseConfigDir, file);
          try {
            const metadata = await this.getConfigFileMetadata(filePath);
            configFiles.push(metadata);
          } catch (error) {
            logger.warn('Failed to get metadata for config file', { 
              file,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }

      // Sort by modification time (newest first)
      configFiles.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

      return configFiles;
    } catch (error) {
      logger.error('Failed to list configuration files', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  /**
   * Delete configuration file
   */
  async deleteConfigFile(filePath: string): Promise<FileSystemResult> {
    try {
      await fs.unlink(filePath);

      logger.info('Configuration file deleted', { filePath });

      return {
        success: true,
        data: { filePath }
      };
    } catch (error) {
      logger.error('Failed to delete configuration file', { 
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Clean up old backup files
   */
  async cleanupOldBackups(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    try {
      const files = await fs.readdir(this.backupDir);
      const cutoffTime = Date.now() - maxAge;
      let deletedCount = 0;

      for (const file of files) {
        const filePath = join(this.backupDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      logger.info('Cleaned up old backup files', { deletedCount, maxAge });

      return deletedCount;
    } catch (error) {
      logger.error('Failed to cleanup old backup files', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }

  /**
   * Get file system statistics
   */
  async getFileSystemStats(): Promise<{
    configFiles: number;
    backupFiles: number;
    totalConfigSize: number;
    totalBackupSize: number;
    oldestConfig: string | null;
    newestConfig: string | null;
  }> {
    try {
      const configFiles = await this.listConfigFiles();
      const backupFiles = await fs.readdir(this.backupDir);

      let totalConfigSize = 0;
      let totalBackupSize = 0;

      for (const config of configFiles) {
        totalConfigSize += config.size;
      }

      for (const backup of backupFiles) {
        const backupPath = join(this.backupDir, backup);
        const stats = await fs.stat(backupPath);
        totalBackupSize += stats.size;
      }

      return {
        configFiles: configFiles.length,
        backupFiles: backupFiles.length,
        totalConfigSize,
        totalBackupSize,
        oldestConfig: configFiles.length > 0 ? configFiles[configFiles.length - 1]?.path || null : null,
        newestConfig: configFiles.length > 0 ? configFiles[0]?.path || null : null
      };
    } catch (error) {
      logger.error('Failed to get file system statistics', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        configFiles: 0,
        backupFiles: 0,
        totalConfigSize: 0,
        totalBackupSize: 0,
        oldestConfig: null,
        newestConfig: null
      };
    }
  }
}

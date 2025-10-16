/**
 * Interactive CLI Credential Prompting
 * 
 * This module provides interactive command-line interfaces for credential
 * management, including secure input handling and validation.
 */

import { createInterface } from 'readline';
import { createLogger } from '../../utils/logger';
import type { CredentialRequest, CredentialValidationResult } from '../../types/credential';
import { AES256Encryption } from './encryption.js';

const logger = createLogger('credential-prompt');

/**
 * Prompt configuration
 */
export interface PromptConfig {
  hideInput?: boolean;
  confirmInput?: boolean;
  validateInput?: boolean;
  maxRetries?: number;
  timeout?: number;
}

/**
 * Prompt result
 */
export interface PromptResult {
  success: boolean;
  value?: string;
  error?: string;
  cancelled?: boolean;
}

/**
 * Interactive credential prompter
 */
export class CredentialPrompter {
  private rl: any;
  private config: PromptConfig;

  constructor(config: PromptConfig = {}) {
    this.config = {
      hideInput: true,
      confirmInput: false,
      validateInput: true,
      maxRetries: 3,
      timeout: 30000,
      ...config
    };
  }

  /**
   * Creates readline interface
   */
  private createReadlineInterface(): any {
    return createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Prompts for a single credential
   */
  async promptCredential(request: CredentialRequest, config?: PromptConfig): Promise<PromptResult> {
    const promptConfig = { ...this.config, ...config };
    let retries = 0;

    while (retries < (promptConfig.maxRetries || 3)) {
      try {
        const result = await this.promptSingleCredential(request, promptConfig);
        
        if (result.success) {
          return result;
        }

        if (result.cancelled) {
          return result;
        }

        retries++;
        if (retries < (promptConfig.maxRetries || 3)) {
          console.log(`\n❌ ${result.error}`);
          console.log(`🔄 Please try again (${retries}/${promptConfig.maxRetries || 3})...\n`);
        }
      } catch (error) {
        logger.error('Prompt error', { 
          keyName: request.key_name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        retries++;
      }
    }

    return {
      success: false,
      error: `Maximum retries (${promptConfig.maxRetries || 3}) exceeded`
    };
  }

  /**
   * Prompts for a single credential with validation
   */
  private async promptSingleCredential(request: CredentialRequest, config: PromptConfig): Promise<PromptResult> {
    return new Promise((resolve) => {
      const rl = this.createReadlineInterface();
      
      // Display prompt
      this.displayPrompt(request, config);
      
      // Handle input
      const handleInput = (input: string) => {
        const trimmedInput = input.trim();
        
        if (trimmedInput === '') {
          if (request.is_optional) {
            rl.close();
            resolve({ success: true, value: '' });
            return;
          } else {
            console.log('❌ This field is required. Please enter a value.\n');
            rl.question('', handleInput);
            return;
          }
        }

        if (trimmedInput.toLowerCase() === 'cancel' || trimmedInput.toLowerCase() === 'exit') {
          rl.close();
          resolve({ success: false, cancelled: true, error: 'User cancelled' });
          return;
        }

        // Validate input if enabled
        if (config.validateInput) {
          const validation = this.validateCredentialInput(request, trimmedInput);
          if (!validation.valid) {
            console.log(`❌ ${validation.error}`);
            if (validation.suggestions && validation.suggestions.length > 0) {
              console.log(`💡 Suggestions: ${validation.suggestions.join(', ')}`);
            }
            console.log('');
            rl.question('', handleInput);
            return;
          }
        }

        // Confirm input if enabled
        if (config.confirmInput) {
          this.confirmInput(trimmedInput, rl, resolve);
        } else {
          rl.close();
          resolve({ success: true, value: trimmedInput });
        }
      };

      // Set timeout
      const timeout = setTimeout(() => {
        rl.close();
        resolve({ success: false, error: 'Input timeout' });
      }, config.timeout || 30000);

      rl.question('', (input: string) => {
        clearTimeout(timeout);
        handleInput(input);
      });
    });
  }

  /**
   * Displays the credential prompt
   */
  private displayPrompt(request: CredentialRequest, config: PromptConfig): void {
    console.log('\n🔐 Credential Input Required');
    console.log('═'.repeat(50));
    console.log(`📝 Key: ${request.key_name}`);
    console.log(`📋 Description: ${request.description}`);
    
    if (request.is_optional) {
      console.log('ℹ️  This field is optional (press Enter to skip)');
    } else {
      console.log('⚠️  This field is required');
    }

    if (request.get_key_url) {
      console.log(`🔗 Get key: ${request.get_key_url}`);
    }

    if (config.hideInput) {
      console.log('🔒 Input will be hidden for security');
    }

    console.log('💡 Type "cancel" or "exit" to abort');
    console.log('─'.repeat(50));
    
    if (config.hideInput) {
      process.stdout.write('🔑 Enter value: ');
    } else {
      process.stdout.write('🔑 Enter value: ');
    }
  }

  /**
   * Confirms input by asking user to re-enter
   */
  private confirmInput(value: string, rl: any, resolve: (result: PromptResult) => void): void {
    console.log('\n🔍 Please confirm your input:');
    process.stdout.write('🔑 Re-enter value: ');
    
    rl.question('', (confirmInput: string) => {
      const trimmedConfirm = confirmInput.trim();
      
      if (trimmedConfirm === value) {
        rl.close();
        resolve({ success: true, value });
      } else {
        console.log('❌ Inputs do not match. Please try again.\n');
        rl.close();
        resolve({ success: false, error: 'Input confirmation failed' });
      }
    });
  }

  /**
   * Validates credential input
   */
  private validateCredentialInput(request: CredentialRequest, value: string): CredentialValidationResult {
    // Basic validation
    if (!value || value.length === 0) {
      return {
        valid: false,
        error: 'Value cannot be empty',
        suggestions: ['Enter a valid credential value']
      };
    }

    // API key validation patterns
    if (request.key_name.toLowerCase().includes('api') && request.key_name.toLowerCase().includes('key')) {
      return this.validateApiKey(value);
    }

    // Token validation patterns
    if (request.key_name.toLowerCase().includes('token')) {
      return this.validateToken(value);
    }

    // URL validation
    if (request.key_name.toLowerCase().includes('url')) {
      return this.validateUrl(value);
    }

    // Email validation
    if (request.key_name.toLowerCase().includes('email')) {
      return this.validateEmail(value);
    }

    // Default validation
    return this.validateGenericCredential(value);
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
   * Validates generic credential
   */
  private validateGenericCredential(value: string): CredentialValidationResult {
    if (value.length < 3) {
      return {
        valid: false,
        error: 'Value appears too short',
        suggestions: ['Ensure you have entered the complete value']
      };
    }

    return { valid: true };
  }

  /**
   * Prompts for multiple credentials
   */
  async promptMultipleCredentials(requests: CredentialRequest[]): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    
    console.log('\n🚀 Starting credential collection...');
    console.log(`📋 ${requests.length} credential(s) required\n`);

    for (const request of requests) {
      const result = await this.promptCredential(request);
      
      if (result.cancelled) {
        console.log('\n❌ Credential collection cancelled by user');
        throw new Error('Credential collection cancelled');
      }

      if (!result.success) {
        console.log(`\n❌ Failed to collect credential: ${request.key_name}`);
        throw new Error(`Failed to collect credential: ${request.key_name}`);
      }

      results[request.key_name] = result.value || '';
      console.log(`✅ ${request.key_name} collected successfully\n`);
    }

    console.log('🎉 All credentials collected successfully!');
    return results;
  }

  /**
   * Prompts for encryption key
   */
  async promptEncryptionKey(): Promise<PromptResult> {
    const request: CredentialRequest = {
      key_name: 'encryption_key',
      description: 'Enter a strong encryption key for securing credentials (minimum 16 characters)',
      is_optional: false
    };

    const config: PromptConfig = {
      hideInput: true,
      confirmInput: true,
      validateInput: true,
      maxRetries: 3
    };

    return this.promptCredential(request, config);
  }

  /**
   * Validates encryption key strength
   */
  validateEncryptionKey(key: string): CredentialValidationResult {
    const validation = AES256Encryption.validatePasswordStrength(key);
    
    if (!validation.valid) {
      return {
        valid: false,
        error: 'Encryption key does not meet security requirements',
        suggestions: validation.feedback
      };
    }

    return { valid: true };
  }

  /**
   * Prompts for confirmation
   */
  async promptConfirmation(message: string, defaultValue: boolean = false): Promise<boolean> {
    return new Promise((resolve) => {
      const rl = this.createReadlineInterface();
      const defaultText = defaultValue ? 'Y/n' : 'y/N';
      
      console.log(`\n❓ ${message}`);
      process.stdout.write(`🤔 Confirm (${defaultText}): `);
      
      rl.question('', (input: string) => {
        rl.close();
        const trimmed = input.trim().toLowerCase();
        
        if (trimmed === '') {
          resolve(defaultValue);
        } else if (trimmed === 'y' || trimmed === 'yes') {
          resolve(true);
        } else if (trimmed === 'n' || trimmed === 'no') {
          resolve(false);
        } else {
          console.log('❌ Invalid input. Please enter y/yes or n/no.');
          resolve(this.promptConfirmation(message, defaultValue));
        }
      });
    });
  }

  /**
   * Displays credential summary
   */
  displayCredentialSummary(credentials: Record<string, string>): void {
    console.log('\n📊 Credential Summary');
    console.log('═'.repeat(50));
    
    Object.entries(credentials).forEach(([key, value]) => {
      const displayValue = value.length > 0 ? 
        `${value.substring(0, 4)}${'*'.repeat(Math.max(0, value.length - 8))}${value.substring(value.length - 4)}` :
        '(empty)';
      console.log(`🔑 ${key}: ${displayValue}`);
    });
    
    console.log('═'.repeat(50));
  }

  /**
   * Closes the prompter
   */
  close(): void {
    if (this.rl) {
      this.rl.close();
    }
  }
}

/**
 * Default prompter instance
 */
export const defaultPrompter = new CredentialPrompter();

/**
 * Utility functions for credential prompting
 */
export const promptUtils = {
  /**
   * Quick credential prompt
   */
  async quickPrompt(keyName: string, description: string, isOptional: boolean = false): Promise<string> {
    const request: CredentialRequest = {
      key_name: keyName,
      description,
      is_optional: isOptional
    };

    const result = await defaultPrompter.promptCredential(request);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to prompt for credential');
    }

    return result.value || '';
  },

  /**
   * Quick confirmation prompt
   */
  async quickConfirm(message: string, defaultValue: boolean = false): Promise<boolean> {
    return defaultPrompter.promptConfirmation(message, defaultValue);
  }
};

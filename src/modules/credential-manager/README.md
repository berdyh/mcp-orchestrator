# Credential Manager - Security Architecture

## Overview

The Credential Manager is a secure, encrypted credential storage system designed for the MCP Meta-Orchestrator. It provides enterprise-grade security for storing, retrieving, and managing sensitive credentials such as API keys, tokens, and passwords.

## Security Features

### 🔐 AES-256-GCM Encryption
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Salt Length**: 32 bytes (256 bits)
- **IV**: 128-bit random initialization vector
- **Authentication**: Built-in authentication tag prevents tampering

### 🛡️ Multi-Layer Security
1. **Encryption at Rest**: All credentials are encrypted before storage
2. **Secure File Permissions**: Credential files use 600 permissions (owner read/write only)
3. **Memory Protection**: Sensitive data is cleared from memory after use
4. **Audit Logging**: All credential operations are logged for security monitoring

### 🔒 Key Management
- **Password-Based Key Derivation**: Uses PBKDF2 for secure key generation
- **Random Salt**: Each encryption operation uses a unique random salt
- **Key Validation**: Encryption keys are validated for strength
- **Secure Generation**: Built-in secure password/key generation utilities

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Credential Manager                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Encryption    │  │     Storage     │  │   Prompting  │ │
│  │   (AES-256)     │  │   (File I/O)    │  │   (CLI)      │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 1. Encryption Module (`encryption.ts`)
- **AES256Encryption Class**: Core encryption/decryption functionality
- **Key Derivation**: PBKDF2 with configurable iterations
- **Password Validation**: Strength checking and generation
- **Security Utilities**: Helper functions for secure operations

### 2. Storage Module (`storage.ts`)
- **CredentialStorage Class**: File-based credential storage
- **Permission Management**: Automatic file permission setting
- **Audit Logging**: Security event tracking
- **Integrity Validation**: Storage file validation

### 3. Prompting Module (`prompt.ts`)
- **CredentialPrompter Class**: Interactive CLI credential collection
- **Input Validation**: Real-time credential format validation
- **Security Features**: Hidden input, confirmation prompts
- **User Experience**: Clear prompts with helpful suggestions

### 4. Main Manager (`index.ts`)
- **CredentialManager Class**: Unified API for all operations
- **Integration Layer**: Combines encryption, storage, and prompting
- **Validation Engine**: Comprehensive credential validation
- **Error Handling**: Graceful error management

## Security Implementation Details

### Encryption Process

1. **Key Derivation**:
   ```typescript
   key = PBKDF2(password, salt, iterations=100000, keyLength=32)
   ```

2. **Encryption**:
   ```typescript
   cipher = AES-256-GCM(key, iv)
   cipher.setAAD('mcp-credential-manager')
   encrypted = cipher.encrypt(plaintext)
   tag = cipher.getAuthTag()
   ```

3. **Storage Format**:
   ```json
   {
     "encryptedData": "hex-encoded-ciphertext",
     "iv": "hex-encoded-iv",
     "salt": "hex-encoded-salt",
     "tag": "hex-encoded-auth-tag",
     "algorithm": "aes-256-gcm"
   }
   ```

### File Security

- **Storage Location**: `~/.mcp-hub/credentials.json`
- **File Permissions**: `600` (owner read/write only)
- **Directory Permissions**: `700` (owner access only)
- **Backup Protection**: All credential files are gitignored

### Memory Security

- **Zero-Clear**: Sensitive data is cleared from memory after use
- **No Logging**: Credential values are never logged in plain text
- **Secure Disposal**: Memory is properly cleaned up

## Usage Examples

### Basic Usage

```typescript
import { CredentialManager } from './credential-manager/index.js';

const manager = new CredentialManager();

// Set encryption key
manager.setEncryptionKey('your-secure-encryption-key');

// Store a credential
await manager.setCredential('api_key', 'your-api-key-value');

// Retrieve a credential
const result = await manager.getCredential('api_key');
console.log(result.data?.value); // 'your-api-key-value'
```

### Interactive Credential Collection

```typescript
import { CredentialManager } from './credential-manager/index.js';

const manager = new CredentialManager({
  autoPrompt: true,
  validateOnRetrieve: true
});

// This will prompt the user if credential doesn't exist
const apiKey = await manager.getCredential('perplexity_api_key', {
  key_name: 'perplexity_api_key',
  description: 'Enter your Perplexity API key',
  is_optional: false,
  get_key_url: 'https://perplexity.ai/settings/api'
});
```

### Batch Credential Handling

```typescript
const requests = [
  {
    key_name: 'perplexity_api_key',
    description: 'Perplexity API key for search functionality',
    is_optional: false,
    get_key_url: 'https://perplexity.ai/settings/api'
  },
  {
    key_name: 'openai_api_key',
    description: 'OpenAI API key for LLM operations',
    is_optional: false,
    get_key_url: 'https://platform.openai.com/api-keys'
  }
];

const result = await manager.handleCredentialRequests(requests);
if (result.status === 'success') {
  console.log('All credentials collected successfully!');
}
```

## Security Best Practices

### 🔑 Encryption Key Management

1. **Use Strong Keys**: Minimum 16 characters with mixed case, numbers, and symbols
2. **Unique Keys**: Use different encryption keys for different environments
3. **Secure Storage**: Store encryption keys separately from encrypted data
4. **Regular Rotation**: Rotate encryption keys periodically

### 🛡️ File Security

1. **Proper Permissions**: Always use 600 permissions for credential files
2. **Secure Locations**: Store credentials in user home directory, not project root
3. **Backup Security**: Encrypt backups of credential files
4. **Access Control**: Limit access to credential storage directories

### 🔍 Monitoring and Auditing

1. **Audit Logs**: Regularly review audit logs for suspicious activity
2. **Access Monitoring**: Monitor credential access patterns
3. **Error Tracking**: Log and investigate encryption/decryption errors
4. **Security Updates**: Keep encryption libraries updated

### 🚨 Incident Response

1. **Key Compromise**: Immediately rotate encryption keys if compromised
2. **Data Breach**: Revoke and regenerate all stored credentials
3. **File Corruption**: Restore from secure backups
4. **Access Violation**: Review and update file permissions

## Configuration Options

### Storage Configuration

```typescript
interface CredentialStorageConfig {
  method: 'system-keychain' | 'encrypted-config' | 'env-file';
  encryption?: {
    algorithm: string;
    keyDerivation: string;
  };
  location?: string;
  permissions?: string;
  securityLevel: 'high' | 'medium-high' | 'medium';
}
```

### Manager Configuration

```typescript
interface CredentialManagerConfig {
  storage?: CredentialStorageConfig;
  autoPrompt?: boolean;
  validateOnRetrieve?: boolean;
  encryptionKey?: string;
}
```

## Security Validation

### Password Strength Requirements

- **Minimum Length**: 8 characters
- **Character Types**: Lowercase, uppercase, numbers, symbols
- **Strength Score**: Minimum 3/5 for basic security
- **Recommendation**: 4-5/5 for high-security environments

### Credential Format Validation

- **API Keys**: Minimum 10 characters, no spaces
- **Tokens**: Minimum 20 characters
- **URLs**: Valid URL format with protocol
- **Emails**: Valid email format
- **Generic**: Minimum 3 characters

## Testing and Validation

### Security Tests

The credential manager includes comprehensive security tests:

- **Encryption Tests**: Verify AES-256-GCM implementation
- **Key Derivation Tests**: Validate PBKDF2 key generation
- **Storage Tests**: Test file permissions and integrity
- **Validation Tests**: Verify credential format validation
- **Integration Tests**: End-to-end security workflows

### Run Tests

```bash
npm test -- --testPathPattern=credential-manager
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Check file permissions (should be 600)
2. **Decryption Failed**: Verify encryption key is correct
3. **Storage Corrupted**: Restore from backup or reinitialize
4. **Validation Failed**: Check credential format requirements

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('credential-manager', 'debug');
```

## Compliance and Standards

### Security Standards

- **FIPS 140-2**: AES-256 encryption standard
- **NIST Guidelines**: PBKDF2 key derivation recommendations
- **OWASP**: Secure credential storage practices
- **ISO 27001**: Information security management

### Data Protection

- **GDPR Compliance**: Secure handling of personal data
- **CCPA Compliance**: California consumer privacy protection
- **SOC 2**: Security and availability controls
- **HIPAA**: Healthcare data protection (if applicable)

## Future Enhancements

### Planned Security Improvements

1. **Hardware Security Modules**: Integration with HSM for key storage
2. **Multi-Factor Authentication**: Additional authentication layers
3. **Key Escrow**: Secure key recovery mechanisms
4. **Zero-Knowledge Architecture**: Enhanced privacy protection
5. **Quantum-Resistant Encryption**: Future-proof encryption algorithms

### Monitoring and Analytics

1. **Security Metrics**: Real-time security monitoring
2. **Threat Detection**: Anomaly detection and alerting
3. **Compliance Reporting**: Automated compliance reporting
4. **Performance Monitoring**: Encryption/decryption performance tracking

## Support and Maintenance

### Security Updates

- **Regular Updates**: Monthly security patches
- **Vulnerability Response**: 24-hour response to critical issues
- **Security Advisories**: Timely security notifications
- **Best Practices**: Ongoing security guidance

### Documentation

- **API Documentation**: Complete API reference
- **Security Guides**: Detailed security implementation guides
- **Troubleshooting**: Common issues and solutions
- **Examples**: Real-world usage examples

---

**⚠️ Security Notice**: This credential manager handles sensitive information. Always follow security best practices and keep the system updated with the latest security patches.

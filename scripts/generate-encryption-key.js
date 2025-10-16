#!/usr/bin/env node

/**
 * Encryption Key Generator Script
 * 
 * This script generates a secure encryption key for the MCP Meta-Orchestrator
 * credential manager using Node.js built-in crypto module.
 */

import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

/**
 * Generates a secure random password/key
 */
function generateSecurePassword(length = 64) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  const bytes = randomBytes(length);
  let password = '';
  
  for (let i = 0; i < length; i++) {
    password += charset[bytes[i] % charset.length];
  }
  
  return password;
}

/**
 * Validates password strength
 */
function validatePasswordStrength(password) {
  const feedback = [];
  let score = 0;
  
  // Length check
  if (password.length >= 8) score += 1;
  else feedback.push('Password should be at least 8 characters long');
  
  if (password.length >= 16) score += 1;
  
  // Character variety checks
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Password should contain lowercase letters');
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Password should contain uppercase letters');
  
  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Password should contain numbers');
  
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;
  else feedback.push('Password should contain special characters');
  
  return {
    valid: score >= 4,
    score: score,
    feedback: feedback
  };
}

/**
 * Main function to generate and display encryption key
 */
async function generateEncryptionKey() {
  try {
    console.log('🔐 MCP Meta-Orchestrator - Encryption Key Generator');
    console.log('=' .repeat(50));
    console.log();

    // Generate a secure encryption key
    const encryptionKey = generateSecurePassword(64);
    
    // Validate the generated key
    const validation = validatePasswordStrength(encryptionKey);
    
    console.log('✅ Encryption key generated successfully!');
    console.log();
    console.log('🔑 Your encryption key:');
    console.log(encryptionKey);
    console.log();
    console.log('📊 Key validation:');
    console.log(`   Strength Score: ${validation.score}/5`);
    console.log(`   Valid: ${validation.valid ? '✅ Yes' : '❌ No'}`);
    
    if (validation.feedback.length > 0) {
      console.log('   Feedback:');
      validation.feedback.forEach(feedback => {
        console.log(`   - ${feedback}`);
      });
    }
    
    console.log();
    console.log('📝 Next steps:');
    console.log('1. Copy the encryption key above');
    console.log('2. Add it to your .env file:');
    console.log(`   ENCRYPTION_KEY=${encryptionKey}`);
    console.log('3. Keep this key secure and never share it');
    console.log('4. Store a backup in a secure location');
    console.log();
    console.log('⚠️  Security Notice:');
    console.log('- This key is used to encrypt your stored credentials');
    console.log('- If you lose this key, you cannot decrypt your credentials');
    console.log('- Store this key securely and separately from your credentials');
    console.log('- Consider using a password manager for key storage');
    
  } catch (error) {
    console.error('❌ Failed to generate encryption key:');
    console.error(error.message);
    process.exit(1);
  }
}

// Run the script
generateEncryptionKey();

/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Security module exports
 */

// Encryption functions
export {
  encrypt,
  decrypt,
  decryptJSON,
  generateEncryptionKey,
  hash,
  compareHash,
  EncryptionError,
} from './encryption';

// Secrets management
export {
  storeSecret,
  retrieveSecret,
  deleteSecret,
  listSecrets,
  updateSecretMetadata,
  SecretsManagerError,
  type SecretData,
  type SecretStorageOptions,
} from './secretsManager';

// Sanitization and PII/PHI detection
export {
  sanitizeString,
  sanitizeObject,
  sanitizeForLogging,
  redactFields,
  containsSensitiveData,
  validateForLogging,
  type SanitizationOptions,
} from './sanitization';

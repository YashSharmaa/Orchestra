/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: AES-256-GCM encryption/decryption for sensitive data
 */

import * as crypto from 'crypto';
import { getConfig } from '@/utils/config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES
const AUTH_TAG_LENGTH = 16; // 16 bytes for GCM auth tag
const SALT_LENGTH = 32; // 32 bytes for key derivation

/**
 * Error class for encryption-related errors
 */
export class EncryptionError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'EncryptionError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Derive a 256-bit key from the encryption key using PBKDF2
 */
function deriveKey(encryptionKey: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(encryptionKey, salt, 100000, 32, 'sha256');
}

/**
 * Encrypt data using AES-256-GCM
 *
 * @param data - The data to encrypt (string or object)
 * @returns Encrypted data in format: salt:iv:authTag:encryptedData (base64)
 * @throws EncryptionError if encryption fails
 */
export function encrypt(data: string | Record<string, any>): string {
  try {
    const config = getConfig();
    const encryptionKey = config.auth.encryptionKey;

    if (!encryptionKey || encryptionKey.length < 32) {
      throw new EncryptionError('Encryption key must be at least 32 characters long');
    }

    // Convert data to string if it's an object
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);

    // Generate random salt for key derivation
    const salt = crypto.randomBytes(SALT_LENGTH);

    // Derive key from encryption key and salt
    const key = deriveKey(encryptionKey, salt);

    // Generate random IV
    const iv = crypto.randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt the data
    let encrypted = cipher.update(dataString, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get auth tag
    const authTag = cipher.getAuthTag();

    // Combine salt, iv, authTag, and encrypted data
    // Format: salt:iv:authTag:encryptedData
    const result = [
      salt.toString('base64'),
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted,
    ].join(':');

    return result;
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new EncryptionError(
      'Failed to encrypt data',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Decrypt data encrypted with AES-256-GCM
 *
 * @param encryptedData - The encrypted data in format: salt:iv:authTag:encryptedData (base64)
 * @returns Decrypted data as string
 * @throws EncryptionError if decryption fails
 */
export function decrypt(encryptedData: string): string {
  try {
    const config = getConfig();
    const encryptionKey = config.auth.encryptionKey;

    if (!encryptionKey || encryptionKey.length < 32) {
      throw new EncryptionError('Encryption key must be at least 32 characters long');
    }

    // Split the encrypted data
    const parts = encryptedData.split(':');
    if (parts.length !== 4) {
      throw new EncryptionError('Invalid encrypted data format');
    }

    const [saltB64, ivB64, authTagB64, encrypted] = parts;

    // Convert from base64
    const salt = Buffer.from(saltB64, 'base64');
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');

    // Validate lengths
    if (salt.length !== SALT_LENGTH) {
      throw new EncryptionError('Invalid salt length');
    }
    if (iv.length !== IV_LENGTH) {
      throw new EncryptionError('Invalid IV length');
    }
    if (authTag.length !== AUTH_TAG_LENGTH) {
      throw new EncryptionError('Invalid auth tag length');
    }

    // Derive key from encryption key and salt
    const key = deriveKey(encryptionKey, salt);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt the data
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new EncryptionError(
      'Failed to decrypt data',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Decrypt data and parse as JSON
 *
 * @param encryptedData - The encrypted data
 * @returns Decrypted and parsed object
 * @throws EncryptionError if decryption or parsing fails
 */
export function decryptJSON<T = any>(encryptedData: string): T {
  try {
    const decrypted = decrypt(encryptedData);
    return JSON.parse(decrypted) as T;
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new EncryptionError(
      'Failed to decrypt and parse JSON data',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Generate a random encryption key (for development/testing)
 *
 * @param length - Key length in bytes (default: 32 for AES-256)
 * @returns Random key as hex string
 */
export function generateEncryptionKey(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash data using SHA-256 (one-way, for checksums/verification)
 *
 * @param data - Data to hash
 * @returns SHA-256 hash as hex string
 */
export function hash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Compare a plain text value with a hash (constant-time comparison)
 *
 * @param data - Plain text data
 * @param hashedData - Hashed data to compare against
 * @returns true if the hash matches
 */
export function compareHash(data: string, hashedData: string): boolean {
  const computedHash = hash(data);
  return crypto.timingSafeEqual(
    Buffer.from(computedHash),
    Buffer.from(hashedData)
  );
}

/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Data sanitization for logging - detect and mask PII/PHI and secrets
 */

/**
 * Patterns for detecting sensitive data
 */
const PATTERNS = {
  // Email addresses
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // Phone numbers (US, international formats)
  phone: /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,

  // Social Security Numbers (US)
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,

  // Credit card numbers (basic pattern)
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,

  // IP addresses
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,

  // API keys (common patterns)
  apiKey: /\b[A-Za-z0-9_-]{32,}\b/g,

  // JWT tokens
  jwt: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,

  // Bearer tokens
  bearerToken: /Bearer\s+[A-Za-z0-9_-]+/gi,

  // AWS Access Keys
  awsAccessKey: /AKIA[0-9A-Z]{16}/g,

  // AWS Secret Keys
  awsSecretKey: /[A-Za-z0-9/+=]{40}/g,

  // Azure Connection Strings
  azureConnectionString: /DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[^;]+/gi,

  // Private keys
  privateKey: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]+?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi,

  // Passwords in URLs
  urlPassword: /:\/\/[^:]+:([^@]+)@/g,
};

/**
 * Sensitive field names (case-insensitive)
 */
const SENSITIVE_FIELD_NAMES = new Set([
  'password',
  'passwd',
  'pwd',
  'secret',
  'api_key',
  'apikey',
  'api-key',
  'access_token',
  'accesstoken',
  'access-token',
  'refresh_token',
  'refreshtoken',
  'refresh-token',
  'token',
  'auth',
  'authorization',
  'credential',
  'credentials',
  'private_key',
  'privatekey',
  'private-key',
  'ssn',
  'social_security',
  'credit_card',
  'creditcard',
  'card_number',
  'cvv',
  'pin',
  'encryption_key',
  'encryptionkey',
  'encryption-key',
  'jwt',
  'bearer',
]);

/**
 * PII/PHI field names (case-insensitive)
 */
const PII_FIELD_NAMES = new Set([
  'firstname',
  'first_name',
  'first-name',
  'lastname',
  'last_name',
  'last-name',
  'fullname',
  'full_name',
  'full-name',
  'name',
  'email',
  'phone',
  'telephone',
  'mobile',
  'address',
  'street',
  'city',
  'state',
  'zip',
  'zipcode',
  'postal',
  'postalcode',
  'dob',
  'date_of_birth',
  'dateofbirth',
  'birthdate',
  'birth_date',
  'ssn',
  'social_security',
  'passport',
  'license',
  'drivers_license',
  'ip',
  'ipaddress',
  'ip_address',
]);

/**
 * Check if a field name is sensitive
 */
function isSensitiveField(fieldName: string): boolean {
  const normalized = fieldName.toLowerCase().replace(/[_-\s]/g, '');
  return Array.from(SENSITIVE_FIELD_NAMES).some(
    (sensitive) => normalized.includes(sensitive.replace(/[_-\s]/g, ''))
  );
}

/**
 * Check if a field name contains PII/PHI
 */
function isPIIField(fieldName: string): boolean {
  const normalized = fieldName.toLowerCase().replace(/[_-\s]/g, '');
  return Array.from(PII_FIELD_NAMES).some(
    (pii) => normalized.includes(pii.replace(/[_-\s]/g, ''))
  );
}

/**
 * Mask a string value, showing only first and last 2 characters
 */
function maskString(value: string, showLength: number = 2): string {
  if (value.length <= showLength * 2) {
    return '*'.repeat(value.length);
  }
  const visible = value.slice(0, showLength) + value.slice(-showLength);
  const masked = '*'.repeat(value.length - showLength * 2);
  return value.slice(0, showLength) + masked + value.slice(-showLength);
}

/**
 * Mask email address
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '[MASKED_EMAIL]';

  const maskedLocal = local.length <= 2
    ? '*'.repeat(local.length)
    : local[0] + '*'.repeat(local.length - 2) + local[local.length - 1];

  return `${maskedLocal}@${domain}`;
}

/**
 * Mask phone number
 */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '[MASKED_PHONE]';
  return `***-***-${digits.slice(-4)}`;
}

/**
 * Mask credit card number
 */
function maskCreditCard(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 4) return '[MASKED_CARD]';
  return `****-****-****-${digits.slice(-4)}`;
}

/**
 * Sanitize a string by detecting and masking sensitive patterns
 */
export function sanitizeString(value: string, options: SanitizationOptions = {}): string {
  if (typeof value !== 'string') {
    return value;
  }

  let sanitized = value;

  // Mask emails
  if (options.maskEmail !== false) {
    sanitized = sanitized.replace(PATTERNS.email, (match) => maskEmail(match));
  }

  // Mask phone numbers
  if (options.maskPhone !== false) {
    sanitized = sanitized.replace(PATTERNS.phone, (match) => maskPhone(match));
  }

  // Mask SSN
  if (options.maskSSN !== false) {
    sanitized = sanitized.replace(PATTERNS.ssn, '[MASKED_SSN]');
  }

  // Mask credit cards
  if (options.maskCreditCard !== false) {
    sanitized = sanitized.replace(PATTERNS.creditCard, (match) => maskCreditCard(match));
  }

  // Mask IP addresses (optional)
  if (options.maskIP) {
    sanitized = sanitized.replace(PATTERNS.ipAddress, '[MASKED_IP]');
  }

  // Mask API keys
  if (options.maskAPIKeys !== false) {
    sanitized = sanitized.replace(PATTERNS.apiKey, (match) =>
      match.length > 8 ? match.slice(0, 4) + '****' + match.slice(-4) : '[MASKED_KEY]'
    );
  }

  // Mask JWT tokens
  if (options.maskJWT !== false) {
    sanitized = sanitized.replace(PATTERNS.jwt, '[MASKED_JWT]');
  }

  // Mask Bearer tokens
  if (options.maskBearerToken !== false) {
    sanitized = sanitized.replace(PATTERNS.bearerToken, 'Bearer [MASKED_TOKEN]');
  }

  // Mask AWS keys
  if (options.maskAWSKeys !== false) {
    sanitized = sanitized.replace(PATTERNS.awsAccessKey, '[MASKED_AWS_KEY]');
    sanitized = sanitized.replace(PATTERNS.awsSecretKey, '[MASKED_AWS_SECRET]');
  }

  // Mask Azure connection strings
  if (options.maskAzureKeys !== false) {
    sanitized = sanitized.replace(PATTERNS.azureConnectionString, '[MASKED_AZURE_CONNECTION]');
  }

  // Mask private keys
  if (options.maskPrivateKeys !== false) {
    sanitized = sanitized.replace(PATTERNS.privateKey, '[MASKED_PRIVATE_KEY]');
  }

  // Mask passwords in URLs
  if (options.maskURLPasswords !== false) {
    sanitized = sanitized.replace(PATTERNS.urlPassword, '://[MASKED_USER]:[MASKED_PASSWORD]@');
  }

  return sanitized;
}

/**
 * Sanitize an object recursively
 */
export function sanitizeObject(
  obj: any,
  options: SanitizationOptions = {},
  depth: number = 0
): any {
  // Prevent infinite recursion
  if (depth > (options.maxDepth || 10)) {
    return '[MAX_DEPTH_EXCEEDED]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitive types
  if (typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return sanitizeString(obj, options);
    }
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, options, depth + 1));
  }

  // Handle objects
  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    // Check if field is sensitive
    const isSensitive = isSensitiveField(key);
    const isPII = isPIIField(key);

    if (isSensitive || isPII) {
      // Mask sensitive and PII fields
      if (typeof value === 'string') {
        sanitized[key] = maskString(value, 2);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = '[MASKED_OBJECT]';
      } else {
        sanitized[key] = '[MASKED]';
      }
    } else if (typeof value === 'string') {
      // Sanitize string values
      sanitized[key] = sanitizeString(value, options);
    } else if (typeof value === 'object') {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(value, options, depth + 1);
    } else {
      // Keep other values as-is
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Sanitization options
 */
export interface SanitizationOptions {
  maskEmail?: boolean;
  maskPhone?: boolean;
  maskSSN?: boolean;
  maskCreditCard?: boolean;
  maskIP?: boolean;
  maskAPIKeys?: boolean;
  maskJWT?: boolean;
  maskBearerToken?: boolean;
  maskAWSKeys?: boolean;
  maskAzureKeys?: boolean;
  maskPrivateKeys?: boolean;
  maskURLPasswords?: boolean;
  maxDepth?: number;
}

/**
 * Sanitize data for logging (convenience function)
 */
export function sanitizeForLogging(data: any, options?: SanitizationOptions): any {
  if (typeof data === 'string') {
    return sanitizeString(data, options);
  }
  return sanitizeObject(data, options);
}

/**
 * Redact specific fields from an object
 */
export function redactFields(obj: any, fieldsToRedact: string[]): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactFields(item, fieldsToRedact));
  }

  const redacted: any = {};
  const normalizedFields = fieldsToRedact.map((f) => f.toLowerCase());

  for (const [key, value] of Object.entries(obj)) {
    if (normalizedFields.includes(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      redacted[key] = redactFields(value, fieldsToRedact);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Check if a string contains any sensitive data
 */
export function containsSensitiveData(value: string): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  return (
    PATTERNS.email.test(value) ||
    PATTERNS.phone.test(value) ||
    PATTERNS.ssn.test(value) ||
    PATTERNS.creditCard.test(value) ||
    PATTERNS.jwt.test(value) ||
    PATTERNS.bearerToken.test(value) ||
    PATTERNS.awsAccessKey.test(value) ||
    PATTERNS.awsSecretKey.test(value) ||
    PATTERNS.privateKey.test(value)
  );
}

/**
 * Validate that data is safe for logging (returns warnings if sensitive data found)
 */
export function validateForLogging(data: any): {
  safe: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];

  function check(obj: any, path: string = '') {
    if (typeof obj === 'string') {
      if (containsSensitiveData(obj)) {
        warnings.push(`Sensitive data detected at ${path || 'root'}`);
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;

        if (isSensitiveField(key) || isPIIField(key)) {
          warnings.push(`Sensitive field detected: ${currentPath}`);
        }

        check(value, currentPath);
      }
    }
  }

  check(data);

  return {
    safe: warnings.length === 0,
    warnings,
  };
}

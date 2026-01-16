# Orchestra Security Module

This module provides comprehensive security features for Orchestra, including encryption, secrets management, and data sanitization.

## Features

### 1. Encryption (`encryption.ts`)
- **AES-256-GCM encryption** with authenticated encryption
- **PBKDF2 key derivation** for enhanced security
- **Salt and IV generation** for each encryption operation
- **Helper functions** for hashing and comparison

**Example:**
```typescript
import { encrypt, decrypt, decryptJSON } from '@/security';

// Encrypt data
const encrypted = encrypt({ apiKey: 'secret-key-123' });

// Decrypt data
const decrypted = decrypt(encrypted);

// Decrypt and parse JSON
const data = decryptJSON<{ apiKey: string }>(encrypted);
```

### 2. Secrets Manager (`secretsManager.ts`)
- **Encrypted storage** of credentials in database
- **Access control** with ownership and team sharing
- **CRUD operations** for credentials
- **External vault support** (placeholders for Azure Key Vault, AWS Secrets Manager, HashiCorp Vault)

**Example:**
```typescript
import { storeSecret, retrieveSecret } from '@/security';

// Store a secret
const credentialId = await storeSecret({
  name: 'Azure API Credentials',
  type: 'azure-openai',
  data: {
    endpoint: 'https://api.openai.azure.com',
    apiKey: 'your-api-key'
  },
  ownerId: 'user-123'
});

// Retrieve the secret
const secret = await retrieveSecret(credentialId, 'user-123');
console.log(secret.data.apiKey); // decrypted automatically
```

### 3. Sanitization (`sanitization.ts`)
- **PII/PHI detection** and masking
- **Secret key detection** in logs
- **Pattern-based detection** for emails, phone numbers, SSN, credit cards, API keys, JWT tokens, etc.
- **Field-based detection** for sensitive field names

**Example:**
```typescript
import { sanitizeForLogging, validateForLogging } from '@/security';

const userData = {
  name: 'John Doe',
  email: 'john@example.com',
  password: 'secret123',
  apiKey: 'sk-1234567890abcdef'
};

// Sanitize for logging
const sanitized = sanitizeForLogging(userData);
// Result: { name: 'John Doe', email: 'j***@example.com', password: '[MASKED]', apiKey: 'sk-1**def' }

// Validate before logging
const validation = validateForLogging(userData);
if (!validation.safe) {
  console.warn('Sensitive data detected:', validation.warnings);
}
```

## Configuration

The security module uses the `ENCRYPTION_KEY` from the configuration. Ensure this is set in your environment:

```bash
ENCRYPTION_KEY=your-32-character-or-longer-encryption-key
```

**Important:** The encryption key must be at least 32 characters long for AES-256 security.

## Error Handling

All security functions throw specific error types:
- `EncryptionError` - for encryption/decryption failures
- `SecretsManagerError` - for secrets management failures

Example:
```typescript
try {
  const encrypted = encrypt(data);
} catch (error) {
  if (error instanceof EncryptionError) {
    console.error('Encryption failed:', error.message);
  }
}
```

## Best Practices

1. **Always sanitize data before logging** - Use `sanitizeForLogging()` to prevent sensitive data leaks
2. **Validate encryption keys** - Ensure `ENCRYPTION_KEY` is properly configured and secure
3. **Use appropriate access controls** - Verify user permissions before accessing secrets
4. **Rotate keys regularly** - Implement key rotation policies for production environments
5. **Monitor for sensitive data** - Use `validateForLogging()` to detect potential data leaks

## Future Enhancements

- [ ] Azure Key Vault integration
- [ ] AWS Secrets Manager integration
- [ ] HashiCorp Vault integration
- [ ] Key rotation mechanism
- [ ] Audit logging for secret access
- [ ] Secret versioning
- [ ] Time-based secret expiration

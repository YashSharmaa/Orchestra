/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Secrets and credentials manager with encryption and external vault support
 */

import { encrypt, decrypt, decryptJSON, EncryptionError } from './encryption';
import { getConfig } from '@/utils/config';
import { log } from '@/utils/logger';
import { getDatabase } from '@/database/connection';
import { Credential } from '@/database/entities/Credential.entity';

/**
 * Error class for secrets management errors
 */
export class SecretsManagerError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'SecretsManagerError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Secret storage options
 */
export interface SecretStorageOptions {
  useExternalVault?: boolean;
  vaultType?: 'azure-keyvault' | 'aws-secrets' | 'hashicorp-vault';
  metadata?: Record<string, any>;
}

/**
 * Secret data structure
 */
export interface SecretData {
  id?: string;
  name: string;
  type: string;
  data: Record<string, any>;
  ownerId: string;
  teamId?: string;
  isShared?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Store a secret/credential in the database with encryption
 *
 * @param secret - Secret data to store
 * @param options - Storage options
 * @returns Stored credential ID
 */
export async function storeSecret(
  secret: SecretData,
  options: SecretStorageOptions = {}
): Promise<string> {
  try {
    // Check if external vault should be used
    if (options.useExternalVault && options.vaultType) {
      return await storeInExternalVault(secret, options.vaultType);
    }

    // Validate secret data
    if (!secret.name || !secret.type || !secret.data || !secret.ownerId) {
      throw new SecretsManagerError('Invalid secret data: name, type, data, and ownerId are required');
    }

    // Encrypt the secret data
    const encryptedData = encrypt(secret.data);

    // Get database connection
    const connection = getDatabase();
    const credentialRepo = connection.getRepository(Credential);

    // Create or update credential
    let credential: Credential;

    if (secret.id) {
      // Update existing credential
      const existingCredential = await credentialRepo.findOne({ where: { id: secret.id } });
      if (!existingCredential) {
        throw new SecretsManagerError(`Credential with ID ${secret.id} not found`);
      }
      credential = existingCredential;

      // Check ownership
      if (credential.ownerId !== secret.ownerId) {
        throw new SecretsManagerError('Cannot update credential owned by another user');
      }

      credential.name = secret.name;
      credential.type = secret.type;
      credential.encryptedData = encryptedData;
      credential.teamId = secret.teamId;
      credential.isShared = secret.isShared || false;
    } else {
      // Create new credential
      credential = credentialRepo.create({
        name: secret.name,
        type: secret.type,
        encryptedData,
        ownerId: secret.ownerId,
        teamId: secret.teamId,
        isShared: secret.isShared || false,
      });
    }

    await credentialRepo.save(credential);

    log.info('Secret stored successfully', {
      credentialId: credential.id,
      name: secret.name,
      type: secret.type,
      ownerId: secret.ownerId,
    });

    return credential.id;
  } catch (error) {
    if (error instanceof SecretsManagerError || error instanceof EncryptionError) {
      throw error;
    }
    log.error('Failed to store secret', { error, secretName: secret.name });
    throw new SecretsManagerError(
      'Failed to store secret',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Retrieve and decrypt a secret/credential
 *
 * @param credentialId - ID of the credential to retrieve
 * @param userId - ID of the user requesting the credential
 * @returns Decrypted secret data
 */
export async function retrieveSecret(
  credentialId: string,
  userId: string
): Promise<SecretData> {
  try {
    // Get database connection
    const connection = getDatabase();
    const credentialRepo = connection.getRepository(Credential);

    // Find credential
    const credential = await credentialRepo.findOne({
      where: { id: credentialId },
    });

    if (!credential) {
      throw new SecretsManagerError(`Credential with ID ${credentialId} not found`);
    }

    // Check access permissions
    const hasAccess =
      credential.ownerId === userId ||
      (credential.isShared && credential.teamId);

    if (!hasAccess) {
      throw new SecretsManagerError('Access denied: insufficient permissions');
    }

    // Decrypt the data
    const decryptedData = decryptJSON<Record<string, any>>(credential.encryptedData);

    log.debug('Secret retrieved successfully', {
      credentialId: credential.id,
      name: credential.name,
      userId,
    });

    return {
      id: credential.id,
      name: credential.name,
      type: credential.type,
      data: decryptedData,
      ownerId: credential.ownerId,
      teamId: credential.teamId,
      isShared: credential.isShared,
    };
  } catch (error) {
    if (error instanceof SecretsManagerError || error instanceof EncryptionError) {
      throw error;
    }
    log.error('Failed to retrieve secret', { error, credentialId, userId });
    throw new SecretsManagerError(
      'Failed to retrieve secret',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Delete a secret/credential
 *
 * @param credentialId - ID of the credential to delete
 * @param userId - ID of the user requesting deletion
 */
export async function deleteSecret(credentialId: string, userId: string): Promise<void> {
  try {
    // Get database connection
    const connection = getDatabase();
    const credentialRepo = connection.getRepository(Credential);

    // Find credential
    const credential = await credentialRepo.findOne({
      where: { id: credentialId },
    });

    if (!credential) {
      throw new SecretsManagerError(`Credential with ID ${credentialId} not found`);
    }

    // Check ownership
    if (credential.ownerId !== userId) {
      throw new SecretsManagerError('Access denied: only owner can delete credentials');
    }

    // Delete the credential
    await credentialRepo.remove(credential);

    log.info('Secret deleted successfully', {
      credentialId,
      name: credential.name,
      userId,
    });
  } catch (error) {
    if (error instanceof SecretsManagerError) {
      throw error;
    }
    log.error('Failed to delete secret', { error, credentialId, userId });
    throw new SecretsManagerError(
      'Failed to delete secret',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * List all credentials accessible to a user
 *
 * @param userId - ID of the user
 * @param teamId - Optional team ID to filter by
 * @returns Array of credential metadata (without decrypted data)
 */
export async function listSecrets(
  userId: string,
  teamId?: string
): Promise<Array<Omit<SecretData, 'data'>>> {
  try {
    // Get database connection
    const connection = getDatabase();
    const credentialRepo = connection.getRepository(Credential);

    // Build query
    const queryBuilder = credentialRepo
      .createQueryBuilder('credential')
      .where('credential.ownerId = :userId', { userId });

    // Add team filter if provided
    if (teamId) {
      queryBuilder.orWhere(
        'credential.teamId = :teamId AND credential.isShared = :isShared',
        { teamId, isShared: true }
      );
    }

    const credentials = await queryBuilder.getMany();

    return credentials.map((cred: Credential) => ({
      id: cred.id,
      name: cred.name,
      type: cred.type,
      ownerId: cred.ownerId,
      teamId: cred.teamId,
      isShared: cred.isShared,
    }));
  } catch (error) {
    log.error('Failed to list secrets', { error, userId, teamId });
    throw new SecretsManagerError(
      'Failed to list secrets',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

/**
 * Update a secret's metadata (name, sharing settings)
 *
 * @param credentialId - ID of the credential to update
 * @param userId - ID of the user requesting update
 * @param updates - Metadata updates
 */
export async function updateSecretMetadata(
  credentialId: string,
  userId: string,
  updates: { name?: string; isShared?: boolean; teamId?: string }
): Promise<void> {
  try {
    // Get database connection
    const connection = getDatabase();
    const credentialRepo = connection.getRepository(Credential);

    // Find credential
    const credential = await credentialRepo.findOne({
      where: { id: credentialId },
    });

    if (!credential) {
      throw new SecretsManagerError(`Credential with ID ${credentialId} not found`);
    }

    // Check ownership
    if (credential.ownerId !== userId) {
      throw new SecretsManagerError('Access denied: only owner can update credentials');
    }

    // Apply updates
    if (updates.name !== undefined) credential.name = updates.name;
    if (updates.isShared !== undefined) credential.isShared = updates.isShared;
    if (updates.teamId !== undefined) credential.teamId = updates.teamId;

    await credentialRepo.save(credential);

    log.info('Secret metadata updated successfully', {
      credentialId,
      userId,
      updates,
    });
  } catch (error) {
    if (error instanceof SecretsManagerError) {
      throw error;
    }
    log.error('Failed to update secret metadata', { error, credentialId, userId });
    throw new SecretsManagerError(
      'Failed to update secret metadata',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

// ============================================================================
// External Vault Integration
// ============================================================================

/**
 * Store secret in Azure Key Vault
 */
async function storeInAzureKeyVault(secret: SecretData): Promise<string> {
  try {
    // Dynamic import to make this an optional dependency
    const { SecretClient } = await import('@azure/keyvault-secrets');
    const { DefaultAzureCredential } = await import('@azure/identity');

    const config = getConfig();
    const vaultUrl = process.env.AZURE_KEYVAULT_URL;

    if (!vaultUrl) {
      throw new SecretsManagerError(
        'Azure Key Vault URL not configured. Set AZURE_KEYVAULT_URL environment variable.'
      );
    }

    // Create client with managed identity or service principal
    const credential = new DefaultAzureCredential();
    const client = new SecretClient(vaultUrl, credential);

    // Azure Key Vault secret names must match [0-9a-zA-Z-]+
    const secretName = secret.name.replace(/[^0-9a-zA-Z-]/g, '-');

    // Store the secret data as JSON string
    const secretValue = JSON.stringify(secret.data);

    // Set the secret with metadata as tags
    const result = await client.setSecret(secretName, secretValue, {
      tags: {
        orchestraId: secret.id || 'new',
        orchestraType: secret.type,
        orchestraOwnerId: secret.ownerId,
        orchestraTeamId: secret.teamId || '',
        orchestraShared: secret.isShared ? 'true' : 'false',
      },
    });

    log.info('Secret stored successfully in Azure Key Vault', {
      secretName,
      vaultUrl,
      version: result.properties.version,
    });

    // Return the secret identifier (name + version)
    return `azure-keyvault:${secretName}:${result.properties.version}`;
  } catch (error) {
    log.error('Failed to store secret in Azure Key Vault', {
      error,
      secretName: secret.name,
    });

    if (error instanceof Error && error.message.includes('Cannot find module')) {
      throw new SecretsManagerError(
        'Azure Key Vault SDK not installed. Run: npm install @azure/keyvault-secrets @azure/identity'
      );
    }

    throw new SecretsManagerError(
      `Failed to store secret in Azure Key Vault: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Store secret in AWS Secrets Manager
 */
async function storeInAWSSecrets(secret: SecretData): Promise<string> {
  try {
    // Dynamic import to make this an optional dependency
    const { SecretsManagerClient, CreateSecretCommand, PutSecretValueCommand } =
      await import('@aws-sdk/client-secrets-manager');

    const region = process.env.AWS_REGION || 'us-east-1';

    // Create client (uses AWS credentials from environment or IAM role)
    const client = new SecretsManagerClient({ region });

    // AWS Secrets Manager secret names can contain alphanumeric characters and /_+=.@-
    const secretName = `orchestra/${secret.type}/${secret.name.replace(/[^a-zA-Z0-9/_+=.@-]/g, '-')}`;

    // Prepare secret value
    const secretValue = JSON.stringify(secret.data);

    // Prepare tags
    const tags = [
      { Key: 'Orchestra-Id', Value: secret.id || 'new' },
      { Key: 'Orchestra-Type', Value: secret.type },
      { Key: 'Orchestra-OwnerId', Value: secret.ownerId },
      { Key: 'Orchestra-TeamId', Value: secret.teamId || '' },
      { Key: 'Orchestra-Shared', Value: secret.isShared ? 'true' : 'false' },
    ];

    try {
      // Try to create new secret
      const createCommand = new CreateSecretCommand({
        Name: secretName,
        SecretString: secretValue,
        Description: `Orchestra credential: ${secret.type}`,
        Tags: tags,
      });

      const createResult = await client.send(createCommand);

      log.info('Secret created successfully in AWS Secrets Manager', {
        secretName,
        arn: createResult.ARN,
        version: createResult.VersionId,
      });

      return `aws-secrets:${secretName}:${createResult.VersionId}`;
    } catch (error: unknown) {
      // If secret already exists, update it
      if (error instanceof Error && error.name === 'ResourceExistsException') {
        const updateCommand = new PutSecretValueCommand({
          SecretId: secretName,
          SecretString: secretValue,
        });

        const updateResult = await client.send(updateCommand);

        log.info('Secret updated successfully in AWS Secrets Manager', {
          secretName,
          arn: updateResult.ARN,
          version: updateResult.VersionId,
        });

        return `aws-secrets:${secretName}:${updateResult.VersionId}`;
      }

      throw error;
    }
  } catch (error) {
    log.error('Failed to store secret in AWS Secrets Manager', {
      error,
      secretName: secret.name,
    });

    if (error instanceof Error && error.message.includes('Cannot find module')) {
      throw new SecretsManagerError(
        'AWS Secrets Manager SDK not installed. Run: npm install @aws-sdk/client-secrets-manager'
      );
    }

    throw new SecretsManagerError(
      `Failed to store secret in AWS Secrets Manager: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Store secret in HashiCorp Vault
 */
async function storeInHashiCorpVault(secret: SecretData): Promise<string> {
  try {
    // Dynamic import to make this an optional dependency
    const vault = await import('node-vault');

    const vaultAddr = process.env.VAULT_ADDR || 'http://127.0.0.1:8200';
    const vaultToken = process.env.VAULT_TOKEN;

    if (!vaultToken) {
      throw new SecretsManagerError(
        'HashiCorp Vault token not configured. Set VAULT_TOKEN environment variable.'
      );
    }

    // Create vault client
    const client = vault.default({
      apiVersion: 'v1',
      endpoint: vaultAddr,
      token: vaultToken,
    });

    // HashiCorp Vault path - using KV v2 secrets engine
    const mountPath = process.env.VAULT_MOUNT_PATH || 'secret';
    const secretPath = `${secret.type}/${secret.name.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

    // Prepare secret data with metadata
    const secretData = {
      data: secret.data,
      metadata: {
        orchestraId: secret.id || 'new',
        orchestraType: secret.type,
        orchestraOwnerId: secret.ownerId,
        orchestraTeamId: secret.teamId || '',
        orchestraShared: secret.isShared ? 'true' : 'false',
        ...secret.metadata,
      },
    };

    // Write secret to Vault (KV v2 engine requires data wrapper)
    const result = await client.write(`${mountPath}/data/${secretPath}`, {
      data: secretData.data,
      metadata: secretData.metadata,
    });

    log.info('Secret stored successfully in HashiCorp Vault', {
      path: secretPath,
      mountPath,
      version: result.data?.version,
    });

    // Return the secret identifier (path + version)
    const version = result.data?.version || '1';
    return `hashicorp-vault:${mountPath}/${secretPath}:${version}`;
  } catch (error) {
    log.error('Failed to store secret in HashiCorp Vault', {
      error,
      secretName: secret.name,
    });

    if (error instanceof Error && error.message.includes('Cannot find module')) {
      throw new SecretsManagerError(
        'HashiCorp Vault SDK not installed. Run: npm install node-vault'
      );
    }

    throw new SecretsManagerError(
      `Failed to store secret in HashiCorp Vault: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Route secret storage to the appropriate external vault
 */
async function storeInExternalVault(
  secret: SecretData,
  vaultType: 'azure-keyvault' | 'aws-secrets' | 'hashicorp-vault'
): Promise<string> {
  switch (vaultType) {
    case 'azure-keyvault':
      return storeInAzureKeyVault(secret);
    case 'aws-secrets':
      return storeInAWSSecrets(secret);
    case 'hashicorp-vault':
      return storeInHashiCorpVault(secret);
    default:
      throw new SecretsManagerError(`Unsupported vault type: ${vaultType}`);
  }
}

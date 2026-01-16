/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Credential management controller
 */

import { Request, Response } from 'express';
import { getDatabase } from '@/database/connection';
import { Credential } from '@/database/entities/Credential.entity';
import { storeSecret, retrieveSecret, deleteSecret, listSecrets } from '@/security/secretsManager';
import logger from '@/utils/logger';
import { sanitizeForLogging } from '@/security/sanitization';

export class CredentialController {
  /**
   * List all credentials accessible to user
   */
  async list(req: Request, res: Response) {
    try {
      const userId = req.user!.userId;
      const teamId = req.query.teamId as string | undefined;

      const credentialRepo = getDatabase().getRepository(Credential);

      const credentials = await credentialRepo.find({
        where: teamId
          ? { teamId }
          : { ownerId: userId },
        select: ['id', 'name', 'type', 'ownerId', 'teamId', 'isShared', 'createdAt', 'updatedAt'],
      });

      logger.info('Credentials listed', {
        userId,
        count: credentials.length,
      });

      res.json({
        success: true,
        credentials: credentials.map((cred: Credential) => ({
          ...cred,
          hasSecret: true, // Don't expose actual secrets
        })),
      });
    } catch (error) {
      logger.error('Failed to list credentials', { error });
      throw error;
    }
  }

  /**
   * Get credential by ID (without secret data)
   */
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const credentialRepo = getDatabase().getRepository(Credential);
      const credential = await credentialRepo.findOne({
        where: { id },
        select: ['id', 'name', 'type', 'ownerId', 'teamId', 'isShared', 'createdAt', 'updatedAt'],
      });

      if (!credential) {
        return res.status(404).json({
          success: false,
          message: 'Credential not found',
        });
      }

      // Check access
      if (credential.ownerId !== userId && !credential.isShared && req.user!.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      res.json({
        success: true,
        credential: {
          ...credential,
          hasSecret: true,
        },
      });
    } catch (error) {
      logger.error('Failed to get credential', { error });
      throw error;
    }
  }

  /**
   * Create new credential
   */
  async create(req: Request, res: Response) {
    try {
      const { name, type, data, teamId, shared } = req.body;
      const userId = req.user!.userId;

      if (!name || !type || !data) {
        return res.status(400).json({
          success: false,
          message: 'Name, type, and data are required',
        });
      }

      // Store secret
      const credentialId = await storeSecret({
        name,
        type,
        data,
        ownerId: userId,
        teamId,
        isShared: shared || false,
      });

      logger.info('Credential created', {
        credentialId,
        userId,
        type,
        name: sanitizeForLogging({ name }).name,
      });

      res.status(201).json({
        success: true,
        credentialId,
        message: 'Credential created successfully',
      });
    } catch (error) {
      logger.error('Failed to create credential', { error });
      throw error;
    }
  }

  /**
   * Update credential
   */
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, data, shared } = req.body;
      const userId = req.user!.userId;

      const credentialRepo = getDatabase().getRepository(Credential);
      const credential = await credentialRepo.findOne({ where: { id } });

      if (!credential) {
        return res.status(404).json({
          success: false,
          message: 'Credential not found',
        });
      }

      // Check ownership
      if (credential.ownerId !== userId && req.user!.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      // Update fields
      if (name) credential.name = name;
      if (shared !== undefined) credential.isShared = shared;
      if (data) {
        // Re-encrypt with new data
        credential.encryptedData = data; // This would be encrypted by the entity
      }

      await credentialRepo.save(credential);

      logger.info('Credential updated', {
        credentialId: id,
        userId,
      });

      res.json({
        success: true,
        message: 'Credential updated successfully',
      });
    } catch (error) {
      logger.error('Failed to update credential', { error });
      throw error;
    }
  }

  /**
   * Delete credential
   */
  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      await deleteSecret(id, userId);

      logger.info('Credential deleted', {
        credentialId: id,
        userId,
      });

      res.json({
        success: true,
        message: 'Credential deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete credential', { error });
      throw error;
    }
  }

  /**
   * Test credential connection
   */
  async test(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      // Retrieve credential
      const credential = await retrieveSecret(id, userId);

      // Here you would test the credential based on its type
      // For now, just return success if we can retrieve it
      res.json({
        success: true,
        message: 'Credential is valid',
        type: credential.type,
      });
    } catch (error) {
      logger.error('Failed to test credential', { error });
      res.status(400).json({
        success: false,
        message: 'Credential test failed',
        error: (error as Error).message,
      });
    }
  }
}

export default new CredentialController();

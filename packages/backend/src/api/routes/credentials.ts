/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Credential management routes
 */

import { Router } from 'express';
import { authenticate } from '@/auth/middleware';
import credentialController from '../controllers/CredentialController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List credentials
router.get('/', (req, res) => credentialController.list(req, res));

// Get credential by ID
router.get('/:id', (req, res) => credentialController.getById(req, res));

// Create new credential
router.post('/', (req, res) => credentialController.create(req, res));

// Update credential
router.put('/:id', (req, res) => credentialController.update(req, res));

// Delete credential
router.delete('/:id', (req, res) => credentialController.delete(req, res));

// Test credential
router.post('/:id/test', (req, res) => credentialController.test(req, res));

export default router;

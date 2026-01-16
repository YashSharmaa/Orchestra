/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Marketplace routes
 */

import { Router } from 'express';
import { authenticate } from '@/auth/middleware';
import marketplaceController from '../controllers/MarketplaceController';

const router = Router();

// Public listings (no auth required)
router.get('/', (req, res) => marketplaceController.list(req, res));
router.get('/:id', (req, res) => marketplaceController.getById(req, res));

// Authenticated routes
router.use(authenticate);

// Publish to marketplace
router.post('/', (req, res) => marketplaceController.publish(req, res));

// Update listing
router.put('/:id', (req, res) => marketplaceController.update(req, res));

// Delete listing
router.delete('/:id', (req, res) => marketplaceController.delete(req, res));

// Download/import workflow
router.post('/:id/download', (req, res) => marketplaceController.download(req, res));

export default router;

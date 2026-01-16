/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Team management routes
 */

import { Router } from 'express';
import { authenticate } from '@/auth/middleware';
import teamController from '../controllers/TeamController';

const router = Router();

// All routes require authentication
router.use(authenticate);

// List teams
router.get('/', (req, res) => teamController.list(req, res));

// Get team by ID
router.get('/:id', (req, res) => teamController.getById(req, res));

// Create new team
router.post('/', (req, res) => teamController.create(req, res));

// Update team
router.put('/:id', (req, res) => teamController.update(req, res));

// Delete team
router.delete('/:id', (req, res) => teamController.delete(req, res));

export default router;

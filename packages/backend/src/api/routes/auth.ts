/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Authentication API routes
 */

import { Router } from 'express';
import { AuthController } from '@/api/controllers/AuthController';
import { authenticate } from '@/auth';
import { validateBody, authSchemas } from '@/api/middleware/validation';
import { asyncHandler } from '@/api/middleware/errorHandler';

const router = Router();
const authController = new AuthController();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/register',
  validateBody(authSchemas.register),
  asyncHandler((req, res) => authController.register(req, res))
);

/**
 * POST /api/auth/login
 * Login user
 */
router.post(
  '/login',
  validateBody(authSchemas.login),
  asyncHandler((req, res) => authController.login(req, res))
);

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post(
  '/logout',
  authenticate,
  asyncHandler((req, res) => authController.logout(req, res))
);

/**
 * GET /api/auth/profile
 * Get current user profile
 */
router.get(
  '/profile',
  authenticate,
  asyncHandler((req, res) => authController.getProfile(req, res))
);

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put(
  '/profile',
  authenticate,
  validateBody(authSchemas.updateProfile),
  asyncHandler((req, res) => authController.updateProfile(req, res))
);

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post(
  '/change-password',
  authenticate,
  validateBody(authSchemas.changePassword),
  asyncHandler((req, res) => authController.changePassword(req, res))
);

/**
 * GET /api/auth/verify
 * Verify token validity
 */
router.get(
  '/verify',
  authenticate,
  asyncHandler((req, res) => authController.verifyToken(req, res))
);

export default router;

/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Execution API routes
 */

import { Router } from 'express';
import { ExecutionController } from '@/api/controllers/ExecutionController';
import { authenticate, authorize } from '@/auth';
import { validateBody, validateParams, validateQuery, executionSchemas } from '@/api/middleware/validation';
import { asyncHandler } from '@/api/middleware/errorHandler';

const router = Router();
const executionController = new ExecutionController();

/**
 * GET /api/executions
 * Get all executions (optionally filtered by workflow)
 */
router.get(
  '/',
  authenticate,
  validateQuery(executionSchemas.query),
  asyncHandler((req, res) => executionController.getAllExecutions(req, res))
);

/**
 * GET /api/executions/stats
 * Get execution statistics
 */
router.get(
  '/stats',
  authenticate,
  asyncHandler((req, res) => executionController.getExecutionStats(req, res))
);

/**
 * GET /api/executions/:id
 * Get execution by ID
 */
router.get(
  '/:id',
  authenticate,
  validateParams(executionSchemas.id),
  asyncHandler((req, res) => executionController.getExecutionById(req, res))
);

/**
 * POST /api/executions
 * Start a new workflow execution
 */
router.post(
  '/',
  authenticate,
  authorize('admin', 'editor', 'developer'),
  validateBody(executionSchemas.start),
  asyncHandler((req, res) => executionController.startExecution(req, res))
);

/**
 * POST /api/executions/:id/stop
 * Stop a running execution
 */
router.post(
  '/:id/stop',
  authenticate,
  authorize('admin', 'editor', 'developer'),
  validateParams(executionSchemas.id),
  asyncHandler((req, res) => executionController.stopExecution(req, res))
);

/**
 * POST /api/executions/:id/retry
 * Retry a failed execution
 */
router.post(
  '/:id/retry',
  authenticate,
  authorize('admin', 'editor', 'developer'),
  validateParams(executionSchemas.id),
  asyncHandler((req, res) => executionController.retryExecution(req, res))
);

/**
 * DELETE /api/executions/:id
 * Delete an execution
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'editor'),
  validateParams(executionSchemas.id),
  asyncHandler((req, res) => executionController.deleteExecution(req, res))
);

export default router;

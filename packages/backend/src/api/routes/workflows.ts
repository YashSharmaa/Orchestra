/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Workflow API routes
 */

import { Router } from 'express';
import { WorkflowController } from '@/api/controllers/WorkflowController';
import { authenticate, authorize } from '@/auth';
import { validateBody, validateParams, workflowSchemas } from '@/api/middleware/validation';
import { asyncHandler } from '@/api/middleware/errorHandler';

const router = Router();
const workflowController = new WorkflowController();

/**
 * GET /api/workflows
 * Get all workflows for authenticated user
 */
router.get(
  '/',
  authenticate,
  asyncHandler((req, res) => workflowController.getAllWorkflows(req, res))
);

/**
 * GET /api/workflows/templates
 * Get workflow templates
 */
router.get(
  '/templates',
  asyncHandler((req, res) => workflowController.getTemplates(req, res))
);

/**
 * GET /api/workflows/:id
 * Get workflow by ID
 */
router.get(
  '/:id',
  authenticate,
  validateParams(workflowSchemas.id),
  asyncHandler((req, res) => workflowController.getWorkflowById(req, res))
);

/**
 * POST /api/workflows
 * Create a new workflow
 */
router.post(
  '/',
  authenticate,
  authorize('admin', 'editor', 'developer'),
  validateBody(workflowSchemas.create),
  asyncHandler((req, res) => workflowController.createWorkflow(req, res))
);

/**
 * PUT /api/workflows/:id
 * Update a workflow
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin', 'editor', 'developer'),
  validateParams(workflowSchemas.id),
  validateBody(workflowSchemas.update),
  asyncHandler((req, res) => workflowController.updateWorkflow(req, res))
);

/**
 * DELETE /api/workflows/:id
 * Delete a workflow
 */
router.delete(
  '/:id',
  authenticate,
  authorize('admin', 'editor', 'developer'),
  validateParams(workflowSchemas.id),
  asyncHandler((req, res) => workflowController.deleteWorkflow(req, res))
);

/**
 * POST /api/workflows/:id/duplicate
 * Duplicate a workflow
 */
router.post(
  '/:id/duplicate',
  authenticate,
  authorize('admin', 'editor', 'developer'),
  validateParams(workflowSchemas.id),
  asyncHandler((req, res) => workflowController.duplicateWorkflow(req, res))
);

/**
 * PATCH /api/workflows/:id/toggle-active
 * Toggle workflow active status
 */
router.patch(
  '/:id/toggle-active',
  authenticate,
  authorize('admin', 'editor', 'developer'),
  validateParams(workflowSchemas.id),
  asyncHandler((req, res) => workflowController.toggleWorkflowActive(req, res))
);

export default router;

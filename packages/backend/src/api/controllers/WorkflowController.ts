/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Controller for workflow CRUD operations
 */

import { Request, Response } from 'express';
import { WorkflowRepository } from '@/database/repositories';
import { ErrorFactory } from '@/api/middleware/errorHandler';
import logger from '@/utils/logger';

export class WorkflowController {
  private workflowRepository: WorkflowRepository;

  constructor() {
    this.workflowRepository = new WorkflowRepository();
  }

  /**
   * Get all workflows for the authenticated user
   */
  async getAllWorkflows(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const teamId = req.user?.teamId;

      if (!userId) {
        throw ErrorFactory.unauthorized();
      }

      const workflows = await this.workflowRepository.findAll(userId, teamId);

      res.json({
        success: true,
        data: workflows,
        count: workflows.length,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get workflow by ID
   */
  async getWorkflowById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw ErrorFactory.unauthorized();
      }

      const workflow = await this.workflowRepository.findByIdWithOwner(id);

      if (!workflow) {
        throw ErrorFactory.notFound('Workflow', id);
      }

      // Check if user has access to this workflow
      if (
        workflow.ownerId !== userId &&
        workflow.teamId !== req.user?.teamId &&
        !workflow.isPublic
      ) {
        throw ErrorFactory.forbidden('You do not have access to this workflow');
      }

      res.json({
        success: true,
        data: workflow,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw ErrorFactory.unauthorized();
      }

      const workflowData = {
        ...req.body,
        ownerId: userId,
        teamId: req.user?.teamId,
        version: 1,
      };

      const workflow = await this.workflowRepository.create(workflowData);

      logger.info('Workflow created', {
        workflowId: workflow.id,
        userId,
        name: workflow.name,
      });

      res.status(201).json({
        success: true,
        data: workflow,
        message: 'Workflow created successfully',
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update an existing workflow
   */
  async updateWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw ErrorFactory.unauthorized();
      }

      const workflow = await this.workflowRepository.findById(id);

      if (!workflow) {
        throw ErrorFactory.notFound('Workflow', id);
      }

      // Check if user owns this workflow or is in the same team
      if (workflow.ownerId !== userId && workflow.teamId !== req.user?.teamId) {
        throw ErrorFactory.forbidden('You do not have permission to update this workflow');
      }

      // Prevent changing owner or team
      const updateData = { ...req.body };
      delete updateData.ownerId;
      delete updateData.teamId;

      // Increment version if nodes or connections changed
      if (updateData.nodes || updateData.connections) {
        updateData.version = workflow.version + 1;
      }

      const updatedWorkflow = await this.workflowRepository.update(id, updateData);

      logger.info('Workflow updated', {
        workflowId: id,
        userId,
        version: updatedWorkflow.version,
      });

      res.json({
        success: true,
        data: updatedWorkflow,
        message: 'Workflow updated successfully',
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw ErrorFactory.unauthorized();
      }

      const workflow = await this.workflowRepository.findById(id);

      if (!workflow) {
        throw ErrorFactory.notFound('Workflow', id);
      }

      // Check if user owns this workflow
      if (workflow.ownerId !== userId && req.user?.role !== 'admin') {
        throw ErrorFactory.forbidden('You do not have permission to delete this workflow');
      }

      await this.workflowRepository.delete(id);

      logger.info('Workflow deleted', {
        workflowId: id,
        userId,
      });

      res.json({
        success: true,
        message: 'Workflow deleted successfully',
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get workflow templates
   */
  async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { category } = req.query;

      const templates = await this.workflowRepository.findTemplates(
        category as string | undefined
      );

      res.json({
        success: true,
        data: templates,
        count: templates.length,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Duplicate a workflow
   */
  async duplicateWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw ErrorFactory.unauthorized();
      }

      const workflow = await this.workflowRepository.findById(id);

      if (!workflow) {
        throw ErrorFactory.notFound('Workflow', id);
      }

      // Check if user has access to this workflow
      if (
        workflow.ownerId !== userId &&
        workflow.teamId !== req.user?.teamId &&
        !workflow.isPublic
      ) {
        throw ErrorFactory.forbidden('You do not have access to this workflow');
      }

      // Create duplicate
      const duplicateData = {
        name: `${workflow.name} (Copy)`,
        description: workflow.description,
        nodes: workflow.nodes,
        connections: workflow.connections,
        settings: workflow.settings,
        tags: workflow.tags,
        ownerId: userId,
        teamId: req.user?.teamId,
        version: 1,
        isPublic: false,
        isTemplate: false,
      };

      const duplicate = await this.workflowRepository.create(duplicateData);

      logger.info('Workflow duplicated', {
        originalId: id,
        duplicateId: duplicate.id,
        userId,
      });

      res.status(201).json({
        success: true,
        data: duplicate,
        message: 'Workflow duplicated successfully',
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Activate or deactivate a workflow
   */
  async toggleWorkflowActive(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw ErrorFactory.unauthorized();
      }

      const workflow = await this.workflowRepository.findById(id);

      if (!workflow) {
        throw ErrorFactory.notFound('Workflow', id);
      }

      // Check if user owns this workflow or is in the same team
      if (workflow.ownerId !== userId && workflow.teamId !== req.user?.teamId) {
        throw ErrorFactory.forbidden('You do not have permission to modify this workflow');
      }

      const updatedWorkflow = await this.workflowRepository.update(id, {
        isActive: !workflow.isActive,
      });

      logger.info('Workflow active status toggled', {
        workflowId: id,
        userId,
        isActive: updatedWorkflow.isActive,
      });

      res.json({
        success: true,
        data: updatedWorkflow,
        message: `Workflow ${updatedWorkflow.isActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      throw error;
    }
  }
}

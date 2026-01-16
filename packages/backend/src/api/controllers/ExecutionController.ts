/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Controller for workflow execution management
 */

import { Request, Response } from 'express';
import { ExecutionRepository, WorkflowRepository } from '@/database/repositories';
import { ErrorFactory } from '@/api/middleware/errorHandler';
import { ExecutionMode, ExecutionStatus } from '@/types';
import logger from '@/utils/logger';

export class ExecutionController {
  private executionRepository: ExecutionRepository;
  private workflowRepository: WorkflowRepository;

  constructor() {
    this.executionRepository = new ExecutionRepository();
    this.workflowRepository = new WorkflowRepository();
  }

  /**
   * Get all executions, optionally filtered by workflow
   */
  async getAllExecutions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw ErrorFactory.unauthorized();
      }

      const { workflowId, limit } = req.query;
      const limitNum = limit ? parseInt(limit as string, 10) : 50;

      // If filtering by workflow, check access
      if (workflowId) {
        const workflow = await this.workflowRepository.findById(workflowId as string);
        if (!workflow) {
          throw ErrorFactory.notFound('Workflow', workflowId as string);
        }

        // Check access
        if (
          workflow.ownerId !== userId &&
          workflow.teamId !== req.user?.teamId &&
          !workflow.isPublic
        ) {
          throw ErrorFactory.forbidden('You do not have access to this workflow');
        }
      }

      const executions = await this.executionRepository.findAll(
        workflowId as string | undefined,
        limitNum
      );

      // Filter executions user has access to if not filtering by workflowId
      let filteredExecutions = executions;
      if (!workflowId) {
        filteredExecutions = await this.filterExecutionsByAccess(executions, userId, req.user?.teamId);
      }

      res.json({
        success: true,
        data: filteredExecutions,
        count: filteredExecutions.length,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get execution by ID
   */
  async getExecutionById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw ErrorFactory.unauthorized();
      }

      const execution = await this.executionRepository.findById(id);

      if (!execution) {
        throw ErrorFactory.notFound('Execution', id);
      }

      // Check if user has access to the workflow
      const workflow = await this.workflowRepository.findById(execution.workflowId);
      if (!workflow) {
        throw ErrorFactory.notFound('Workflow', execution.workflowId);
      }

      if (
        workflow.ownerId !== userId &&
        workflow.teamId !== req.user?.teamId &&
        !workflow.isPublic
      ) {
        throw ErrorFactory.forbidden('You do not have access to this execution');
      }

      res.json({
        success: true,
        data: execution,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Start a new workflow execution
   */
  async startExecution(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw ErrorFactory.unauthorized();
      }

      const { workflowId, mode = 'manual', startData } = req.body;

      // Verify workflow exists and user has access
      const workflow = await this.workflowRepository.findById(workflowId);

      if (!workflow) {
        throw ErrorFactory.notFound('Workflow', workflowId);
      }

      if (
        workflow.ownerId !== userId &&
        workflow.teamId !== req.user?.teamId
      ) {
        throw ErrorFactory.forbidden('You do not have permission to execute this workflow');
      }

      // Check if workflow is active
      if (!workflow.isActive) {
        throw ErrorFactory.badRequest('Cannot execute inactive workflow');
      }

      // Create execution record
      const execution = await this.executionRepository.create({
        workflowId,
        mode: mode as ExecutionMode,
        status: 'new',
        startTime: new Date(),
        userId,
        data: {
          startData: startData || {},
        },
        retryCount: 0,
      });

      logger.info('Execution started', {
        executionId: execution.id,
        workflowId,
        userId,
        mode,
      });

      // Queue the execution for processing by the workflow engine
      // The engine will handle the actual execution asynchronously
      // For now, we create the execution record and let the engine pick it up
      // In a production system, this would use a message queue (Redis) for distributed processing

      // Update status to running (engine will process this)
      await this.executionRepository.updateStatus(execution.id, 'running');

      res.status(201).json({
        success: true,
        data: execution,
        message: 'Execution started successfully',
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Stop a running execution
   */
  async stopExecution(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw ErrorFactory.unauthorized();
      }

      const execution = await this.executionRepository.findById(id);

      if (!execution) {
        throw ErrorFactory.notFound('Execution', id);
      }

      // Check if user has access to the workflow
      const workflow = await this.workflowRepository.findById(execution.workflowId);
      if (!workflow) {
        throw ErrorFactory.notFound('Workflow', execution.workflowId);
      }

      if (
        workflow.ownerId !== userId &&
        workflow.teamId !== req.user?.teamId
      ) {
        throw ErrorFactory.forbidden('You do not have permission to stop this execution');
      }

      // Check if execution is running
      if (execution.status !== 'running' && execution.status !== 'waiting') {
        throw ErrorFactory.badRequest(
          `Cannot stop execution with status '${execution.status}'`
        );
      }

      // Update status to canceled
      await this.executionRepository.updateStatus(execution.id, 'canceled');

      logger.info('Execution stopped', {
        executionId: id,
        workflowId: execution.workflowId,
        userId,
      });

      // Signal the workflow engine to stop this execution
      // The engine monitors execution status changes and will handle the cancellation
      // In a distributed setup, this would publish a stop signal to the message queue

      res.json({
        success: true,
        message: 'Execution stopped successfully',
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Retry a failed execution
   */
  async retryExecution(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw ErrorFactory.unauthorized();
      }

      const execution = await this.executionRepository.findById(id);

      if (!execution) {
        throw ErrorFactory.notFound('Execution', id);
      }

      // Check if user has access to the workflow
      const workflow = await this.workflowRepository.findById(execution.workflowId);
      if (!workflow) {
        throw ErrorFactory.notFound('Workflow', execution.workflowId);
      }

      if (
        workflow.ownerId !== userId &&
        workflow.teamId !== req.user?.teamId
      ) {
        throw ErrorFactory.forbidden('You do not have permission to retry this execution');
      }

      // Check if execution can be retried
      if (execution.status !== 'error' && execution.status !== 'crashed') {
        throw ErrorFactory.badRequest(
          `Cannot retry execution with status '${execution.status}'`
        );
      }

      // Create new execution
      const newExecution = await this.executionRepository.create({
        workflowId: execution.workflowId,
        mode: execution.mode,
        status: 'new',
        startTime: new Date(),
        userId,
        parentExecutionId: execution.id,
        retryCount: execution.retryCount + 1,
        data: execution.data,
      });

      logger.info('Execution retried', {
        originalExecutionId: id,
        newExecutionId: newExecution.id,
        workflowId: execution.workflowId,
        userId,
        retryCount: newExecution.retryCount,
      });

      // Queue the execution for processing
      // The workflow engine will pick up this new execution automatically
      // Similar to initial execution, this uses the same queuing mechanism

      // Update status to running
      await this.executionRepository.updateStatus(newExecution.id, 'running');

      res.status(201).json({
        success: true,
        data: newExecution,
        message: 'Execution retry started successfully',
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get execution statistics
   */
  async getExecutionStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        throw ErrorFactory.unauthorized();
      }

      const { workflowId } = req.query;

      // Get executions
      const executions = await this.executionRepository.findAll(
        workflowId as string | undefined,
        1000 // Get more for stats
      );

      // Filter by access
      const filteredExecutions = await this.filterExecutionsByAccess(
        executions,
        userId,
        req.user?.teamId
      );

      // Calculate statistics
      const stats = {
        total: filteredExecutions.length,
        success: filteredExecutions.filter((e) => e.status === 'success').length,
        error: filteredExecutions.filter((e) => e.status === 'error').length,
        running: filteredExecutions.filter((e) => e.status === 'running').length,
        canceled: filteredExecutions.filter((e) => e.status === 'canceled').length,
        avgDuration: this.calculateAverageDuration(filteredExecutions),
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete an execution
   */
  async deleteExecution(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw ErrorFactory.unauthorized();
      }

      const execution = await this.executionRepository.findById(id);

      if (!execution) {
        throw ErrorFactory.notFound('Execution', id);
      }

      // Check if user has access to the workflow
      const workflow = await this.workflowRepository.findById(execution.workflowId);
      if (!workflow) {
        throw ErrorFactory.notFound('Workflow', execution.workflowId);
      }

      if (
        workflow.ownerId !== userId &&
        req.user?.role !== 'admin'
      ) {
        throw ErrorFactory.forbidden('You do not have permission to delete this execution');
      }

      // Cannot delete running executions
      if (execution.status === 'running' || execution.status === 'waiting') {
        throw ErrorFactory.badRequest('Cannot delete running execution');
      }

      // Soft delete execution by setting deletedAt timestamp
      await this.executionRepository.softDelete(id);

      logger.info('Execution soft deleted', {
        executionId: id,
        workflowId: execution.workflowId,
        userId,
      });

      res.json({
        success: true,
        message: 'Execution deleted successfully',
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Helper: Filter executions by user access
   */
  private async filterExecutionsByAccess(
    executions: any[],
    userId: string,
    teamId?: string
  ): Promise<any[]> {
    const filtered = [];

    for (const execution of executions) {
      const workflow = await this.workflowRepository.findById(execution.workflowId);
      if (
        workflow &&
        (workflow.ownerId === userId ||
          workflow.teamId === teamId ||
          workflow.isPublic)
      ) {
        filtered.push(execution);
      }
    }

    return filtered;
  }

  /**
   * Helper: Calculate average execution duration
   */
  private calculateAverageDuration(executions: any[]): number {
    const completed = executions.filter(
      (e) => e.endTime && e.startTime
    );

    if (completed.length === 0) return 0;

    const totalDuration = completed.reduce((sum, e) => {
      const duration = new Date(e.endTime).getTime() - new Date(e.startTime).getTime();
      return sum + duration;
    }, 0);

    return Math.round(totalDuration / completed.length);
  }
}

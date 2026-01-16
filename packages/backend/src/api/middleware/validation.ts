/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Request validation middleware using Joi
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

/**
 * Validation schemas for workflows
 */
export const workflowSchemas = {
  create: Joi.object({
    name: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(1000).allow('', null),
    nodes: Joi.array().items(Joi.object({
      id: Joi.string().required(),
      type: Joi.string().required(),
      name: Joi.string().required(),
      parameters: Joi.object().required(),
      position: Joi.object({
        x: Joi.number().required(),
        y: Joi.number().required(),
      }).required(),
      disabled: Joi.boolean(),
      notes: Joi.string(),
      retryOnFail: Joi.boolean(),
      maxRetries: Joi.number().min(0).max(10),
      waitBetweenRetries: Joi.number().min(0),
      alwaysOutputData: Joi.boolean(),
      executeOnce: Joi.boolean(),
    })).required(),
    connections: Joi.array().items(Joi.object({
      id: Joi.string().required(),
      source: Joi.string().required(),
      sourceOutput: Joi.string().required(),
      target: Joi.string().required(),
      targetInput: Joi.string().required(),
    })).required(),
    settings: Joi.object({
      errorWorkflow: Joi.string(),
      timezone: Joi.string(),
      saveDataErrorExecution: Joi.string().valid('all', 'none'),
      saveDataSuccessExecution: Joi.string().valid('all', 'none'),
      saveManualExecutions: Joi.boolean(),
      callerPolicy: Joi.string().valid('workflowsFromSameOwner', 'workflowsFromAList', 'any'),
      executionTimeout: Joi.number().min(0),
    }),
    tags: Joi.array().items(Joi.string()),
    isPublic: Joi.boolean(),
    isTemplate: Joi.boolean(),
    templateCategory: Joi.string(),
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(255),
    description: Joi.string().max(1000).allow('', null),
    nodes: Joi.array().items(Joi.object({
      id: Joi.string().required(),
      type: Joi.string().required(),
      name: Joi.string().required(),
      parameters: Joi.object().required(),
      position: Joi.object({
        x: Joi.number().required(),
        y: Joi.number().required(),
      }).required(),
      disabled: Joi.boolean(),
      notes: Joi.string(),
      retryOnFail: Joi.boolean(),
      maxRetries: Joi.number().min(0).max(10),
      waitBetweenRetries: Joi.number().min(0),
      alwaysOutputData: Joi.boolean(),
      executeOnce: Joi.boolean(),
    })),
    connections: Joi.array().items(Joi.object({
      id: Joi.string().required(),
      source: Joi.string().required(),
      sourceOutput: Joi.string().required(),
      target: Joi.string().required(),
      targetInput: Joi.string().required(),
    })),
    settings: Joi.object({
      errorWorkflow: Joi.string(),
      timezone: Joi.string(),
      saveDataErrorExecution: Joi.string().valid('all', 'none'),
      saveDataSuccessExecution: Joi.string().valid('all', 'none'),
      saveManualExecutions: Joi.boolean(),
      callerPolicy: Joi.string().valid('workflowsFromSameOwner', 'workflowsFromAList', 'any'),
      executionTimeout: Joi.number().min(0),
    }),
    tags: Joi.array().items(Joi.string()),
    isPublic: Joi.boolean(),
    isTemplate: Joi.boolean(),
    templateCategory: Joi.string(),
    isActive: Joi.boolean(),
  }).min(1), // At least one field must be present

  id: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};

/**
 * Validation schemas for executions
 */
export const executionSchemas = {
  start: Joi.object({
    workflowId: Joi.string().uuid().required(),
    mode: Joi.string().valid('manual', 'trigger', 'webhook', 'scheduled', 'internal').default('manual'),
    startData: Joi.object(),
  }),

  id: Joi.object({
    id: Joi.string().uuid().required(),
  }),

  query: Joi.object({
    workflowId: Joi.string().uuid(),
    status: Joi.string().valid('new', 'running', 'success', 'error', 'waiting', 'canceled', 'crashed'),
    limit: Joi.number().min(1).max(100).default(50),
  }),
};

/**
 * Validation schemas for authentication
 */
export const authSchemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required(),
    firstName: Joi.string().max(100),
    lastName: Joi.string().max(100),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  updateProfile: Joi.object({
    firstName: Joi.string().max(100),
    lastName: Joi.string().max(100),
    settings: Joi.object(),
  }).min(1),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).max(128).required(),
  }),
};

/**
 * Generic validation middleware factory
 */
export function validate(schema: Joi.ObjectSchema, property: 'body' | 'params' | 'query' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove unknown properties
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid request data',
        details: errors,
      });
      return;
    }

    // Replace request data with validated data
    req[property] = value;
    next();
  };
}

/**
 * Validate request body
 */
export function validateBody(schema: Joi.ObjectSchema) {
  return validate(schema, 'body');
}

/**
 * Validate request params
 */
export function validateParams(schema: Joi.ObjectSchema) {
  return validate(schema, 'params');
}

/**
 * Validate request query
 */
export function validateQuery(schema: Joi.ObjectSchema) {
  return validate(schema, 'query');
}

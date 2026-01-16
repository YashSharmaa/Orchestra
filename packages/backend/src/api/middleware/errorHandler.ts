/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Global error handling middleware
 */

import { Request, Response, NextFunction } from 'express';
import logger from '@/utils/logger';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  details?: any;

  constructor(statusCode: number, message: string, details?: any, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common API error factory functions
 */
export class ErrorFactory {
  static badRequest(message: string, details?: any): ApiError {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Unauthorized'): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden'): ApiError {
    return new ApiError(403, message);
  }

  static notFound(resource: string, id?: string): ApiError {
    const message = id
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`;
    return new ApiError(404, message);
  }

  static conflict(message: string, details?: any): ApiError {
    return new ApiError(409, message, details);
  }

  static unprocessableEntity(message: string, details?: any): ApiError {
    return new ApiError(422, message, details);
  }

  static internal(message = 'Internal server error', details?: any): ApiError {
    return new ApiError(500, message, details, false);
  }

  static serviceUnavailable(message = 'Service temporarily unavailable'): ApiError {
    return new ApiError(503, message);
  }
}

/**
 * Global error handler middleware
 * Must be registered last in the middleware chain
 */
export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Default to 500 server error
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: any = undefined;
  let isOperational = false;

  // Handle ApiError instances
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
    isOperational = err.isOperational;
  }
  // Handle validation errors (from express-validator or Joi)
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = err.message;
    isOperational = true;
  }
  // Handle database errors
  else if (err.name === 'QueryFailedError') {
    statusCode = 500;
    message = 'Database Error';
    isOperational = false;
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    isOperational = true;
  }
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    isOperational = true;
  }
  // Generic Error
  else {
    message = err.message || 'An unexpected error occurred';
  }

  // Log error
  const errorLog = {
    error: message,
    statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: (req as any).user?.id,
    stack: err.stack,
    details,
  };

  if (statusCode >= 500) {
    logger.error('Server error', errorLog);
  } else if (statusCode >= 400) {
    logger.warn('Client error', errorLog);
  }

  // Don't leak error details in production for non-operational errors
  const isDevelopment = process.env.NODE_ENV === 'development';
  const shouldExposeDetails = isDevelopment || isOperational;

  // Send error response
  res.status(statusCode).json({
    error: statusCode >= 500 && !isDevelopment ? 'Internal Server Error' : message,
    message: shouldExposeDetails ? message : 'An error occurred',
    ...(shouldExposeDetails && details && { details }),
    ...(isDevelopment && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Async route wrapper to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

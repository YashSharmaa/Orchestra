/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Express authentication and authorization middleware
 */

import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@/types';
import { getConfig } from '@/utils/config';
import { log } from '@/utils/logger';
import { verifyToken, extractTokenFromHeader, IJwtPayload } from './jwt';
import { hasPermission, ResourceType, Action } from './rbac';
import rateLimit from 'express-rate-limit';

/**
 * Extend Express Request to include user information
 */
declare global {
  namespace Express {
    interface Request {
      user?: IJwtPayload;
    }
  }
}

/**
 * Authentication middleware - verifies JWT token and attaches user to request
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const config = getConfig();

  // Skip authentication if disabled in config
  if (config.auth.disableAuth) {
    log.warn('Authentication is disabled - allowing request');
    req.user = {
      userId: 'anonymous',
      id: 'anonymous',
      email: 'anonymous@orchestra.local',
      role: 'admin',
    };
    next();
    return;
  }

  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      log.warn('No authentication token provided', {
        path: req.path,
        method: req.method,
      });
      res.status(401).json({
        error: 'Authentication required',
        message: 'No authentication token provided',
      });
      return;
    }

    // Verify token
    const decoded = verifyToken(token);

    // Attach user to request
    req.user = decoded;

    log.debug('User authenticated', {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      path: req.path,
    });

    next();
  } catch (error) {
    log.error('Authentication failed', {
      error,
      path: req.path,
      method: req.method,
    });

    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';

    res.status(401).json({
      error: 'Authentication failed',
      message: errorMessage,
    });
  }
}

/**
 * Optional authentication middleware - attaches user if token is present, but doesn't require it
 */
export function optionalAuthenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = verifyToken(token);
      req.user = decoded;

      log.debug('User authenticated (optional)', {
        userId: decoded.userId,
        path: req.path,
      });
    }

    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    log.debug('Optional authentication skipped', {
      error,
      path: req.path,
    });
    next();
  }
}

/**
 * Authorization middleware - checks if user has required role(s)
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      log.warn('Authorization check failed - no user in request', {
        path: req.path,
        requiredRoles: allowedRoles,
      });
      res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated',
      });
      return;
    }

    const userRole = req.user.role as UserRole;

    if (!allowedRoles.includes(userRole)) {
      log.warn('Authorization check failed - insufficient permissions', {
        userId: req.user.userId,
        userRole,
        requiredRoles: allowedRoles,
        path: req.path,
      });
      res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions',
      });
      return;
    }

    log.debug('Authorization check passed', {
      userId: req.user.userId,
      userRole,
      path: req.path,
    });

    next();
  };
}

/**
 * Permission-based authorization middleware
 */
export function requirePermission(resource: ResourceType, action: Action) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      log.warn('Permission check failed - no user in request', {
        path: req.path,
        resource,
        action,
      });
      res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated',
      });
      return;
    }

    const userRole = req.user.role as UserRole;

    if (!hasPermission(userRole, resource, action)) {
      log.warn('Permission check failed', {
        userId: req.user.userId,
        userRole,
        resource,
        action,
        path: req.path,
      });
      res.status(403).json({
        error: 'Forbidden',
        message: `Permission denied: ${action} on ${resource}`,
      });
      return;
    }

    log.debug('Permission check passed', {
      userId: req.user.userId,
      userRole,
      resource,
      action,
      path: req.path,
    });

    next();
  };
}

/**
 * Owner-only authorization middleware
 * Checks if the user is the owner of the resource or has admin role
 */
export function requireOwnership(ownerIdParam: string = 'userId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated',
      });
      return;
    }

    const resourceOwnerId = req.params[ownerIdParam] || req.body[ownerIdParam];
    const userRole = req.user.role as UserRole;

    // Admin can access everything
    if (userRole === 'admin') {
      next();
      return;
    }

    // Check if user is the owner
    if (req.user.userId !== resourceOwnerId) {
      log.warn('Ownership check failed', {
        userId: req.user.userId,
        resourceOwnerId,
        path: req.path,
      });
      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only access your own resources',
      });
      return;
    }

    next();
  };
}

/**
 * Team access middleware
 * Checks if the user belongs to the same team as the resource
 */
export function requireTeamAccess(teamIdParam: string = 'teamId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'User must be authenticated',
      });
      return;
    }

    const resourceTeamId = req.params[teamIdParam] || req.body[teamIdParam];
    const userRole = req.user.role as UserRole;

    // Admin can access everything
    if (userRole === 'admin') {
      next();
      return;
    }

    // Check if user belongs to the team
    if (!req.user.teamId || req.user.teamId !== resourceTeamId) {
      log.warn('Team access check failed', {
        userId: req.user.userId,
        userTeamId: req.user.teamId,
        resourceTeamId,
        path: req.path,
      });
      res.status(403).json({
        error: 'Forbidden',
        message: 'You can only access resources from your team',
      });
      return;
    }

    next();
  };
}

/**
 * Standard API rate limiter (100 requests per 15 minutes per IP)
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    log.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many requests from this IP, please try again later',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

/**
 * Strict rate limiter for authentication endpoints (5 requests per 15 minutes per IP)
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req: Request, res: Response) => {
    log.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Too many authentication attempts, please try again later',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});

/**
 * Legacy rate limiting check middleware (backwards compatibility)
 * @deprecated Use apiRateLimiter or authRateLimiter instead
 */
export function checkRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Delegate to standard rate limiter
  apiRateLimiter(req, res, next);
}

/**
 * API key authentication middleware (for service-to-service communication)
 */
export function authenticateApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    log.warn('No API key provided', { path: req.path });
    res.status(401).json({
      error: 'Authentication required',
      message: 'API key is required',
    });
    return;
  }

  const config = getConfig();
  const validApiKey = process.env.INTERNAL_API_KEY;

  if (!validApiKey || apiKey !== validApiKey) {
    log.warn('Invalid API key', { path: req.path });
    res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid API key',
    });
    return;
  }

  // Set a system user for API key requests
  req.user = {
    userId: 'system',
    id: 'system',
    email: 'system@orchestra.local',
    role: 'admin',
  };

  log.debug('API key authentication successful', { path: req.path });

  next();
}

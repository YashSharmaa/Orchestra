/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: JWT token generation and validation
 */

import jwt from 'jsonwebtoken';
import { IUser } from '@/types';
import { getConfig } from '@/utils/config';
import { log } from '@/utils/logger';

export interface IJwtPayload {
  userId: string;
  id: string; // Alias for userId to match existing code
  email: string;
  role: string;
  teamId?: string;
}

export interface ITokenResponse {
  token: string;
  expiresIn: string;
}

/**
 * Generate a JWT token for a user (overloaded signatures for backward compatibility)
 */
export function generateToken(user: IUser): ITokenResponse;
export function generateToken(userId: string, email: string, role?: string): string;
export function generateToken(userOrId: IUser | string, email?: string, role?: string): ITokenResponse | string {
  const config = getConfig();

  // Handle two-argument legacy signature for backward compatibility
  if (typeof userOrId === 'string' && email) {
    const payload: any = {
      userId: userOrId,
      id: userOrId,
      email: email,
      role: role || 'editor',
    };

    try {
      const token = jwt.sign(
        payload,
        config.auth.jwtSecret,
        {
          expiresIn: config.auth.jwtExpiration,
          issuer: 'orchestra',
          audience: 'orchestra-api',
          subject: userOrId,
        } as jwt.SignOptions
      );

      log.debug('JWT token generated (legacy)', { userId: userOrId, email });
      return token;
    } catch (error) {
      log.error('Failed to generate JWT token', { error, userId: userOrId });
      throw new Error('Failed to generate authentication token');
    }
  }

  // Handle IUser object signature
  const user = userOrId as IUser;

  const payload: IJwtPayload = {
    userId: user.id,
    id: user.id,
    email: user.email,
    role: user.role,
    teamId: user.teamId,
  };

  try {
    const token = jwt.sign(
      payload,
      config.auth.jwtSecret,
      {
        expiresIn: config.auth.jwtExpiration,
        issuer: 'orchestra',
        audience: 'orchestra-api',
        subject: user.id,
      } as jwt.SignOptions
    );

    log.debug('JWT token generated', { userId: user.id, email: user.email });

    return {
      token,
      expiresIn: config.auth.jwtExpiration,
    };
  } catch (error) {
    log.error('Failed to generate JWT token', { error, userId: user.id });
    throw new Error('Failed to generate authentication token');
  }
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): IJwtPayload {
  const config = getConfig();

  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret, {
      issuer: 'orchestra',
      audience: 'orchestra-api',
    }) as IJwtPayload;

    log.debug('JWT token verified', { userId: decoded.userId });

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      log.warn('JWT token expired', { error });
      throw new Error('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      log.warn('Invalid JWT token', { error });
      throw new Error('Invalid token');
    } else {
      log.error('JWT token verification failed', { error });
      throw new Error('Token verification failed');
    }
  }
}

/**
 * Decode a JWT token without verification (for inspection only)
 */
export function decodeToken(token: string): IJwtPayload | null {
  try {
    const decoded = jwt.decode(token) as IJwtPayload;
    return decoded;
  } catch (error) {
    log.warn('Failed to decode JWT token', { error });
    return null;
  }
}

/**
 * Check if a token is expired without throwing an error
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    log.warn('Failed to check token expiration', { error });
    return true;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Generate a refresh token (longer expiration)
 */
export function generateRefreshToken(user: IUser): string {
  const config = getConfig();

  const payload: IJwtPayload = {
    userId: user.id,
    id: user.id,
    email: user.email,
    role: user.role,
    teamId: user.teamId,
  };

  try {
    const token = jwt.sign(
      payload,
      config.auth.jwtSecret,
      {
        expiresIn: '7d', // Refresh tokens last 7 days
        issuer: 'orchestra',
        audience: 'orchestra-refresh',
        subject: user.id,
      } as jwt.SignOptions
    );

    log.debug('Refresh token generated', { userId: user.id });

    return token;
  } catch (error) {
    log.error('Failed to generate refresh token', { error, userId: user.id });
    throw new Error('Failed to generate refresh token');
  }
}

/**
 * Verify a refresh token
 */
export function verifyRefreshToken(token: string): IJwtPayload {
  const config = getConfig();

  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret, {
      issuer: 'orchestra',
      audience: 'orchestra-refresh',
    }) as IJwtPayload;

    log.debug('Refresh token verified', { userId: decoded.userId });

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      log.warn('Refresh token expired', { error });
      throw new Error('Refresh token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      log.warn('Invalid refresh token', { error });
      throw new Error('Invalid refresh token');
    } else {
      log.error('Refresh token verification failed', { error });
      throw new Error('Refresh token verification failed');
    }
  }
}

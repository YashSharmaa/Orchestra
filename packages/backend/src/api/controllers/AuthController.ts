/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Controller for authentication operations
 */

import { Request, Response } from 'express';
import { UserRepository } from '@/database/repositories';
import { hashPassword, verifyPassword, generateToken } from '@/auth';
import { ErrorFactory } from '@/api/middleware/errorHandler';
import logger from '@/utils/logger';

// AuthRequest is no longer needed - use Express.Request directly with req.user from middleware

export class AuthController {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Register a new user
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        throw ErrorFactory.conflict('User with this email already exists');
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user
      const user = await this.userRepository.create({
        email,
        passwordHash,
        firstName,
        lastName,
        role: 'editor', // Default role
        isActive: true,
      });

      // Generate JWT token
      const token = generateToken(user.id, user.email);

      logger.info('User registered', {
        userId: user.id,
        email: user.email,
      });

      // Don't send password hash
      const { passwordHash: _, ...userWithoutPassword } = user;

      res.status(201).json({
        success: true,
        data: {
          user: userWithoutPassword,
          token,
        },
        message: 'User registered successfully',
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await this.userRepository.findByEmail(email);

      if (!user) {
        throw ErrorFactory.unauthorized('Invalid email or password');
      }

      // Check if user is active
      if (!user.isActive) {
        throw ErrorFactory.forbidden('Account is inactive. Please contact support.');
      }

      // Verify password
      if (!user.passwordHash) {
        throw ErrorFactory.unauthorized('Invalid email or password');
      }

      const isValidPassword = await verifyPassword(password, user.passwordHash);

      if (!isValidPassword) {
        logger.warn('Failed login attempt', {
          email,
          ip: req.ip,
        });
        throw ErrorFactory.unauthorized('Invalid email or password');
      }

      // Update last login
      await this.userRepository.updateLastLogin(user.id);

      // Generate JWT token
      const token = generateToken(user.id, user.email);

      logger.info('User logged in', {
        userId: user.id,
        email: user.email,
      });

      // Don't send password hash
      const { passwordHash: _, ...userWithoutPassword } = user;

      res.json({
        success: true,
        data: {
          user: userWithoutPassword,
          token,
        },
        message: 'Login successful',
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Logout user (client-side token removal)
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      // For JWT, logout is handled client-side by removing the token
      // This endpoint is mainly for logging purposes and future enhancements
      // (e.g., token blacklisting, refresh token invalidation)

      // No need to cast - req.user is available from middleware
      if (req.user) {
        logger.info('User logged out', {
          userId: req.user.id,
          email: req.user.email,
        });
      }

      res.json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      // No need to cast - req.user is available from middleware
      const userId = req.user?.id;

      if (!userId) {
        throw ErrorFactory.unauthorized();
      }

      const user = await this.userRepository.findById(userId);

      if (!user) {
        throw ErrorFactory.notFound('User', userId);
      }

      // Don't send password hash
      const { passwordHash: _, ...userWithoutPassword } = user;

      res.json({
        success: true,
        data: userWithoutPassword,
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      // No need to cast - req.user is available from middleware
      const userId = req.user?.id;

      if (!userId) {
        throw ErrorFactory.unauthorized();
      }

      const { firstName, lastName, settings } = req.body;

      const updateData: any = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (settings !== undefined) updateData.settings = settings;

      const user = await this.userRepository.update(userId, updateData);

      logger.info('User profile updated', {
        userId,
        email: user.email,
      });

      // Don't send password hash
      const { passwordHash: _, ...userWithoutPassword } = user;

      res.json({
        success: true,
        data: userWithoutPassword,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      // No need to cast - req.user is available from middleware
      const userId = req.user?.id;

      if (!userId) {
        throw ErrorFactory.unauthorized();
      }

      const { currentPassword, newPassword } = req.body;

      const user = await this.userRepository.findById(userId);

      if (!user || !user.passwordHash) {
        throw ErrorFactory.notFound('User', userId);
      }

      // Verify current password
      const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);

      if (!isValidPassword) {
        throw ErrorFactory.unauthorized('Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password
      await this.userRepository.update(userId, {
        passwordHash: newPasswordHash,
      });

      logger.info('User password changed', {
        userId,
        email: user.email,
      });

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify token (useful for checking if token is still valid)
   */
  async verifyToken(req: Request, res: Response): Promise<void> {
    try {
      // No need to cast - req.user is available from middleware
      const userId = req.user?.id;

      if (!userId) {
        throw ErrorFactory.unauthorized();
      }

      const user = await this.userRepository.findById(userId);

      if (!user || !user.isActive) {
        throw ErrorFactory.unauthorized('Invalid or inactive user');
      }

      res.json({
        success: true,
        data: {
          valid: true,
          userId: user.id,
          email: user.email,
          role: user.role,
        },
        message: 'Token is valid',
      });
    } catch (error) {
      throw error;
    }
  }
}

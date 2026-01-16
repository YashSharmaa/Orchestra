/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Main API router combining all route modules
 */

import { Router } from 'express';
import workflowRoutes from './workflows';
import executionRoutes from './executions';
import authRoutes from './auth';
import observabilityRoutes from './observability';
import credentialRoutes from './credentials';
import teamRoutes from './teams';
import marketplaceRoutes from './marketplace';

const router = Router();

/**
 * Health check endpoint for API
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Orchestra API is running',
    timestamp: new Date().toISOString(),
  });
});

/**
 * API version endpoint
 */
router.get('/version', (req, res) => {
  res.json({
    name: 'Orchestra API',
    version: '0.1.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

/**
 * Mount route modules
 */
router.use('/auth', authRoutes);
router.use('/workflows', workflowRoutes);
router.use('/executions', executionRoutes);
router.use('/observability', observabilityRoutes);
router.use('/credentials', credentialRoutes);
router.use('/teams', teamRoutes);
router.use('/marketplace', marketplaceRoutes);

/**
 * API root endpoint
 */
router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Orchestra API',
    version: '0.1.0',
    endpoints: {
      auth: '/api/auth',
      workflows: '/api/workflows',
      executions: '/api/executions',
      observability: '/api/observability',
      credentials: '/api/credentials',
      teams: '/api/teams',
      marketplace: '/api/marketplace',
      health: '/api/health',
      version: '/api/version',
    },
    documentation: '/api/docs',
  });
});

export default router;

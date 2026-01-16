/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Authentication module exports
 */

// JWT exports
export {
  generateToken,
  verifyToken,
  decodeToken,
  isTokenExpired,
  extractTokenFromHeader,
  generateRefreshToken,
  verifyRefreshToken,
  type IJwtPayload,
  type ITokenResponse,
} from './jwt';

// Password exports
export {
  hashPassword,
  verifyPassword,
  needsRehash,
  validatePasswordStrength,
  generateRandomPassword,
} from './password';

// Middleware exports
export {
  authenticate,
  optionalAuthenticate,
  authorize,
  requirePermission,
  requireOwnership,
  requireTeamAccess,
  checkRateLimit,
  authenticateApiKey,
} from './middleware';

// RBAC exports
export {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getRolePermissions,
  isRoleHigherThan,
  isRoleEqualOrHigherThan,
  getMinimumRoleForAction,
  canAccessResource,
  canModifyUserRole,
  isValidRole,
  getAllRoles,
  getRoleDescription,
  type ResourceType,
  type Action,
} from './rbac';

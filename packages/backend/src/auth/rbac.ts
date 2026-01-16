/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Role-based access control logic
 */

import { UserRole, IPermission } from '@/types';
import { log } from '@/utils/logger';

/**
 * Resource types in the system
 */
export type ResourceType =
  | 'workflow'
  | 'execution'
  | 'credential'
  | 'user'
  | 'team'
  | 'agent'
  | 'marketplace'
  | 'settings'
  | 'logs'
  | 'metrics';

/**
 * Action types that can be performed on resources
 */
export type Action = 'read' | 'write' | 'delete' | 'execute' | 'admin';

/**
 * Role hierarchy (lower index = higher privilege)
 */
const ROLE_HIERARCHY: UserRole[] = ['admin', 'developer', 'editor', 'viewer'];

/**
 * Permission matrix defining what each role can do with each resource
 */
const PERMISSION_MATRIX: Record<UserRole, Record<ResourceType, Action[]>> = {
  admin: {
    workflow: ['read', 'write', 'delete', 'execute', 'admin'],
    execution: ['read', 'write', 'delete', 'execute', 'admin'],
    credential: ['read', 'write', 'delete', 'admin'],
    user: ['read', 'write', 'delete', 'admin'],
    team: ['read', 'write', 'delete', 'admin'],
    agent: ['read', 'write', 'delete', 'execute', 'admin'],
    marketplace: ['read', 'write', 'delete', 'admin'],
    settings: ['read', 'write', 'admin'],
    logs: ['read', 'admin'],
    metrics: ['read', 'admin'],
  },
  developer: {
    workflow: ['read', 'write', 'delete', 'execute'],
    execution: ['read', 'write', 'execute'],
    credential: ['read', 'write', 'delete'],
    user: ['read'],
    team: ['read'],
    agent: ['read', 'write', 'delete', 'execute'],
    marketplace: ['read', 'write'],
    settings: ['read'],
    logs: ['read'],
    metrics: ['read'],
  },
  editor: {
    workflow: ['read', 'write', 'execute'],
    execution: ['read', 'write', 'execute'],
    credential: ['read', 'write'],
    user: ['read'],
    team: ['read'],
    agent: ['read', 'write', 'execute'],
    marketplace: ['read'],
    settings: ['read'],
    logs: ['read'],
    metrics: ['read'],
  },
  viewer: {
    workflow: ['read'],
    execution: ['read'],
    credential: ['read'],
    user: ['read'],
    team: ['read'],
    agent: ['read'],
    marketplace: ['read'],
    settings: ['read'],
    logs: ['read'],
    metrics: ['read'],
  },
};

/**
 * Check if a user has permission to perform an action on a resource
 */
export function hasPermission(
  userRole: UserRole,
  resource: ResourceType,
  action: Action
): boolean {
  try {
    const rolePermissions = PERMISSION_MATRIX[userRole];
    if (!rolePermissions) {
      log.warn('Unknown role', { userRole });
      return false;
    }

    const resourcePermissions = rolePermissions[resource];
    if (!resourcePermissions) {
      log.warn('Unknown resource type', { resource });
      return false;
    }

    const hasAccess = resourcePermissions.includes(action);

    log.debug('Permission check', {
      userRole,
      resource,
      action,
      hasAccess,
    });

    return hasAccess;
  } catch (error) {
    log.error('Failed to check permission', { error, userRole, resource, action });
    return false;
  }
}

/**
 * Check if a user has all specified permissions
 */
export function hasAllPermissions(
  userRole: UserRole,
  permissions: Array<{ resource: ResourceType; action: Action }>
): boolean {
  return permissions.every((perm) =>
    hasPermission(userRole, perm.resource, perm.action)
  );
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(
  userRole: UserRole,
  permissions: Array<{ resource: ResourceType; action: Action }>
): boolean {
  return permissions.some((perm) =>
    hasPermission(userRole, perm.resource, perm.action)
  );
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(userRole: UserRole): IPermission[] {
  const rolePermissions = PERMISSION_MATRIX[userRole];
  if (!rolePermissions) {
    return [];
  }

  const permissions: IPermission[] = [];

  for (const [resource, actions] of Object.entries(rolePermissions)) {
    for (const action of actions) {
      permissions.push({
        resource,
        action: action as any,
        granted: true,
      });
    }
  }

  return permissions;
}

/**
 * Check if one role is higher in the hierarchy than another
 */
export function isRoleHigherThan(role1: UserRole, role2: UserRole): boolean {
  const index1 = ROLE_HIERARCHY.indexOf(role1);
  const index2 = ROLE_HIERARCHY.indexOf(role2);

  if (index1 === -1 || index2 === -1) {
    return false;
  }

  return index1 < index2;
}

/**
 * Check if one role is equal to or higher than another
 */
export function isRoleEqualOrHigherThan(role1: UserRole, role2: UserRole): boolean {
  return role1 === role2 || isRoleHigherThan(role1, role2);
}

/**
 * Get the minimum role required for an action on a resource
 */
export function getMinimumRoleForAction(
  resource: ResourceType,
  action: Action
): UserRole | null {
  for (const role of ROLE_HIERARCHY) {
    if (hasPermission(role, resource, action)) {
      return role;
    }
  }
  return null;
}

/**
 * Check if a user can access a resource owned by another user
 */
export function canAccessResource(
  userRole: UserRole,
  userId: string,
  resourceOwnerId: string,
  teamId?: string,
  resourceTeamId?: string,
  action: Action = 'read'
): boolean {
  // Admin can access everything
  if (userRole === 'admin') {
    return true;
  }

  // Owner can always access their own resources
  if (userId === resourceOwnerId) {
    return true;
  }

  // Team members can access team resources based on their role
  if (teamId && teamId === resourceTeamId) {
    // Check if the user's role allows this action on team resources
    return userRole === 'developer' || userRole === 'editor' || action === 'read';
  }

  // No access otherwise
  return false;
}

/**
 * Check if a user can modify another user's role
 */
export function canModifyUserRole(
  actorRole: UserRole,
  targetRole: UserRole
): boolean {
  // Only admins can modify roles
  if (actorRole !== 'admin') {
    return false;
  }

  // Admins can modify any role
  return true;
}

/**
 * Validate if a role value is valid
 */
export function isValidRole(role: string): role is UserRole {
  return ROLE_HIERARCHY.includes(role as UserRole);
}

/**
 * Get all available roles
 */
export function getAllRoles(): UserRole[] {
  return [...ROLE_HIERARCHY];
}

/**
 * Get a description for a role
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    admin: 'Full system access with user and team management capabilities',
    developer: 'Can create, edit, and delete workflows, agents, and credentials',
    editor: 'Can create and edit workflows and agents, but cannot delete',
    viewer: 'Read-only access to all resources',
  };

  return descriptions[role] || 'Unknown role';
}

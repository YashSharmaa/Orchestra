/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Authentication store for managing user auth state
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../services/api';
import type { User, LoginCredentials, RegisterData } from '../types';

export const useAuthStore = defineStore('auth', () => {
  // ============================================================================
  // State
  // ============================================================================

  const user = ref<User | null>(null);
  const token = ref<string | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isInitialized = ref(false);

  // ============================================================================
  // Getters
  // ============================================================================

  const isAuthenticated = computed(() => !!user.value && !!token.value);
  const isAdmin = computed(() => user.value?.role === 'admin');
  const isEditor = computed(() => user.value?.role === 'editor' || isAdmin.value);
  const isDeveloper = computed(() => user.value?.role === 'developer');
  const userRole = computed(() => user.value?.role || null);
  const userId = computed(() => user.value?.id || null);
  const userEmail = computed(() => user.value?.email || null);
  const fullName = computed(() => {
    if (!user.value) return null;
    const { firstName, lastName } = user.value;
    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (firstName) return firstName;
    if (lastName) return lastName;
    return null;
  });

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Initialize auth state from localStorage
   */
  async function initialize(): Promise<void> {
    if (isInitialized.value) return;

    try {
      loading.value = true;
      error.value = null;

      // Check if token exists
      const storedToken = api.getToken();
      if (!storedToken) {
        isInitialized.value = true;
        return;
      }

      // Verify token and get user profile
      const verification = await api.verifyToken();
      if (verification.valid) {
        const profile = await api.getProfile();
        user.value = profile as User;
        token.value = storedToken;
      } else {
        // Token is invalid, clear it
        await logout();
      }
    } catch (err: any) {
      console.error('Auth initialization failed:', err);
      error.value = err.message || 'Failed to initialize authentication';
      // Clear invalid token
      await logout();
    } finally {
      loading.value = false;
      isInitialized.value = true;
    }
  }

  /**
   * Login with email and password
   */
  async function login(credentials: LoginCredentials): Promise<void> {
    try {
      loading.value = true;
      error.value = null;

      const response = await api.login(credentials);
      user.value = response.user as User;
      token.value = response.token;
    } catch (err: any) {
      error.value = err.message || 'Login failed';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Register a new user
   */
  async function register(data: RegisterData): Promise<void> {
    try {
      loading.value = true;
      error.value = null;

      const response = await api.register(data);
      user.value = response.user as User;
      token.value = response.token;
    } catch (err: any) {
      error.value = err.message || 'Registration failed';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Logout the current user
   */
  async function logout(): Promise<void> {
    try {
      loading.value = true;
      error.value = null;

      // Call logout endpoint (don't throw if it fails)
      try {
        await api.logout();
      } catch (err) {
        console.warn('Logout endpoint failed:', err);
      }
    } finally {
      // Clear state regardless of API call success
      user.value = null;
      token.value = null;
      loading.value = false;
    }
  }

  /**
   * Refresh user profile
   */
  async function refreshProfile(): Promise<void> {
    if (!isAuthenticated.value) {
      throw new Error('Not authenticated');
    }

    try {
      loading.value = true;
      error.value = null;

      const profile = await api.getProfile();
      user.value = profile as User;
    } catch (err: any) {
      error.value = err.message || 'Failed to refresh profile';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Update user profile
   */
  async function updateProfile(data: {
    firstName?: string;
    lastName?: string;
    settings?: Record<string, any>;
  }): Promise<void> {
    if (!isAuthenticated.value) {
      throw new Error('Not authenticated');
    }

    try {
      loading.value = true;
      error.value = null;

      const updatedUser = await api.updateProfile(data);
      user.value = updatedUser as User;
    } catch (err: any) {
      error.value = err.message || 'Failed to update profile';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Change user password
   */
  async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
    if (!isAuthenticated.value) {
      throw new Error('Not authenticated');
    }

    try {
      loading.value = true;
      error.value = null;

      await api.changePassword({ currentPassword, newPassword });
    } catch (err: any) {
      error.value = err.message || 'Failed to change password';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Verify authentication status
   */
  async function verifyAuth(): Promise<boolean> {
    try {
      const verification = await api.verifyToken();
      return verification.valid;
    } catch (err) {
      return false;
    }
  }

  /**
   * Clear error state
   */
  function clearError(): void {
    error.value = null;
  }

  /**
   * Check if user has permission for a specific action
   */
  function hasPermission(requiredRole: 'admin' | 'editor' | 'developer' | 'viewer'): boolean {
    if (!user.value) return false;

    const roleHierarchy: Record<string, number> = {
      admin: 4,
      developer: 3,
      editor: 2,
      viewer: 1,
    };

    const userLevel = roleHierarchy[user.value.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    return userLevel >= requiredLevel;
  }

  // ============================================================================
  // Return Store
  // ============================================================================

  return {
    // State
    user,
    token,
    loading,
    error,
    isInitialized,

    // Getters
    isAuthenticated,
    isAdmin,
    isEditor,
    isDeveloper,
    userRole,
    userId,
    userEmail,
    fullName,

    // Actions
    initialize,
    login,
    register,
    logout,
    refreshProfile,
    updateProfile,
    changePassword,
    verifyAuth,
    clearError,
    hasPermission,
  };
});

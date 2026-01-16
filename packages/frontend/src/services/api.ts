/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Axios HTTP client for Orchestra API
 */

import axios, { AxiosInstance, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// ============================================================================
// Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  count?: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: string;
    teamId?: string;
  };
  token: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: number;
  nodes: any[];
  connections: any[];
  settings?: any;
  tags?: string[];
  ownerId: string;
  teamId?: string;
  isActive: boolean;
  isPublic: boolean;
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Execution {
  id: string;
  workflowId: string;
  mode: string;
  status: 'new' | 'running' | 'success' | 'error' | 'waiting' | 'canceled' | 'crashed';
  startTime: string;
  endTime?: string;
  error?: {
    message: string;
    stack?: string;
    node?: string;
  };
  data: any;
  userId?: string;
  parentExecutionId?: string;
  retryCount: number;
}

export interface ExecutionStats {
  total: number;
  success: number;
  error: number;
  running: number;
  canceled: number;
  avgDuration: number;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  nodes?: any[];
  connections?: any[];
  settings?: any;
  tags?: string[];
  isPublic?: boolean;
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  nodes?: any[];
  connections?: any[];
  settings?: any;
  tags?: string[];
  isPublic?: boolean;
}

export interface StartExecutionRequest {
  workflowId: string;
  mode?: 'manual' | 'trigger' | 'webhook' | 'scheduled' | 'internal';
  startData?: any;
}

// ============================================================================
// API Client Class
// ============================================================================

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    // Get base URL from environment or use default
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load token from localStorage if available
    this.loadToken();

    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (this.token && config.headers) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (error: AxiosError<ApiError>) => {
        // Handle 401 Unauthorized - clear token and redirect to login
        if (error.response?.status === 401) {
          this.clearToken();
          // Emit event for app to handle redirect
          window.dispatchEvent(new CustomEvent('auth:unauthorized'));
        }

        // Format error message
        const message = error.response?.data?.message || error.message || 'An error occurred';

        // Create formatted error
        const apiError: ApiError = {
          message,
          code: error.code,
          details: error.response?.data?.details,
        };

        return Promise.reject(apiError);
      }
    );
  }

  // ============================================================================
  // Token Management
  // ============================================================================

  private loadToken(): void {
    const token = localStorage.getItem('orchestra_token');
    if (token) {
      this.token = token;
    }
  }

  setToken(token: string): void {
    this.token = token;
    localStorage.setItem('orchestra_token', token);
  }

  clearToken(): void {
    this.token = null;
    localStorage.removeItem('orchestra_token');
  }

  getToken(): string | null {
    return this.token;
  }

  // ============================================================================
  // Authentication API
  // ============================================================================

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.client.post<ApiResponse<AuthResponse>>('/auth/login', data);
    if (response.data.data) {
      this.setToken(response.data.data.token);
    }
    return response.data.data!;
  }

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.client.post<ApiResponse<AuthResponse>>('/auth/register', data);
    if (response.data.data) {
      this.setToken(response.data.data.token);
    }
    return response.data.data!;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
    } finally {
      this.clearToken();
    }
  }

  async getProfile(): Promise<AuthResponse['user']> {
    const response = await this.client.get<ApiResponse<AuthResponse['user']>>('/auth/profile');
    return response.data.data!;
  }

  async updateProfile(data: { firstName?: string; lastName?: string; settings?: any }): Promise<AuthResponse['user']> {
    const response = await this.client.put<ApiResponse<AuthResponse['user']>>('/auth/profile', data);
    return response.data.data!;
  }

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
    await this.client.post('/auth/change-password', data);
  }

  async verifyToken(): Promise<{ valid: boolean; userId: string; email: string; role: string }> {
    const response = await this.client.get<ApiResponse<{ valid: boolean; userId: string; email: string; role: string }>>('/auth/verify');
    return response.data.data!;
  }

  // ============================================================================
  // Workflows API
  // ============================================================================

  async getWorkflows(): Promise<Workflow[]> {
    const response = await this.client.get<ApiResponse<Workflow[]>>('/workflows');
    return response.data.data!;
  }

  async getWorkflow(id: string): Promise<Workflow> {
    const response = await this.client.get<ApiResponse<Workflow>>(`/workflows/${id}`);
    return response.data.data!;
  }

  async createWorkflow(data: CreateWorkflowRequest): Promise<Workflow> {
    const response = await this.client.post<ApiResponse<Workflow>>('/workflows', data);
    return response.data.data!;
  }

  async updateWorkflow(id: string, data: UpdateWorkflowRequest): Promise<Workflow> {
    const response = await this.client.put<ApiResponse<Workflow>>(`/workflows/${id}`, data);
    return response.data.data!;
  }

  async deleteWorkflow(id: string): Promise<void> {
    await this.client.delete(`/workflows/${id}`);
  }

  async duplicateWorkflow(id: string): Promise<Workflow> {
    const response = await this.client.post<ApiResponse<Workflow>>(`/workflows/${id}/duplicate`);
    return response.data.data!;
  }

  async toggleWorkflowActive(id: string): Promise<Workflow> {
    const response = await this.client.post<ApiResponse<Workflow>>(`/workflows/${id}/toggle-active`);
    return response.data.data!;
  }

  async getWorkflowTemplates(category?: string): Promise<Workflow[]> {
    const params = category ? { category } : undefined;
    const response = await this.client.get<ApiResponse<Workflow[]>>('/workflows/templates', { params });
    return response.data.data!;
  }

  // ============================================================================
  // Executions API
  // ============================================================================

  async getExecutions(workflowId?: string, limit?: number): Promise<Execution[]> {
    const params: any = {};
    if (workflowId) params.workflowId = workflowId;
    if (limit) params.limit = limit;

    const response = await this.client.get<ApiResponse<Execution[]>>('/executions', { params });
    return response.data.data!;
  }

  async getExecution(id: string): Promise<Execution> {
    const response = await this.client.get<ApiResponse<Execution>>(`/executions/${id}`);
    return response.data.data!;
  }

  async startExecution(data: StartExecutionRequest): Promise<Execution> {
    const response = await this.client.post<ApiResponse<Execution>>('/executions', data);
    return response.data.data!;
  }

  async stopExecution(id: string): Promise<void> {
    await this.client.post(`/executions/${id}/stop`);
  }

  async retryExecution(id: string): Promise<Execution> {
    const response = await this.client.post<ApiResponse<Execution>>(`/executions/${id}/retry`);
    return response.data.data!;
  }

  async deleteExecution(id: string): Promise<void> {
    await this.client.delete(`/executions/${id}`);
  }

  async getExecutionStats(workflowId?: string): Promise<ExecutionStats> {
    const params = workflowId ? { workflowId } : undefined;
    const response = await this.client.get<ApiResponse<ExecutionStats>>('/executions/stats', { params });
    return response.data.data!;
  }

  // ============================================================================
  // Generic Request Methods
  // ============================================================================

  async get<T = any>(url: string, config?: any): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data.data!;
  }

  async post<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data.data!;
  }

  async put<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data.data!;
  }

  async patch<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return response.data.data!;
  }

  async delete<T = any>(url: string, config?: any): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data.data!;
  }
}

// ============================================================================
// Export Singleton Instance
// ============================================================================

export const api = new ApiClient();
export default api;

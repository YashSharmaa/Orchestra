/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Executions store for managing workflow execution state and real-time updates
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../services/api';
import type {
  Execution,
  ExecutionMode,
  ExecutionStats,
  ExecutionStatus,
  StartExecutionData,
  WebSocketEvent,
} from '../types';

export const useExecutionsStore = defineStore('executions', () => {
  // ============================================================================
  // State
  // ============================================================================

  const executions = ref<Execution[]>([]);
  const currentExecution = ref<Execution | null>(null);
  const stats = ref<ExecutionStats | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const filterWorkflowId = ref<string | null>(null);
  const filterStatus = ref<ExecutionStatus | null>(null);
  const sortBy = ref<'startTime' | 'endTime' | 'status'>('startTime');
  const sortOrder = ref<'asc' | 'desc'>('desc');

  // WebSocket state
  const wsConnected = ref(false);
  const wsReconnecting = ref(false);
  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  // ============================================================================
  // Getters
  // ============================================================================

  const filteredExecutions = computed(() => {
    let filtered = [...executions.value];

    // Workflow filter
    if (filterWorkflowId.value) {
      filtered = filtered.filter((e) => e.workflowId === filterWorkflowId.value);
    }

    // Status filter
    if (filterStatus.value) {
      filtered = filtered.filter((e) => e.status === filterStatus.value);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortBy.value) {
        case 'startTime':
          aVal = new Date(a.startTime).getTime();
          bVal = new Date(b.startTime).getTime();
          break;
        case 'endTime':
          aVal = a.endTime ? new Date(a.endTime).getTime() : 0;
          bVal = b.endTime ? new Date(b.endTime).getTime() : 0;
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        default:
          return 0;
      }

      if (sortOrder.value === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    return filtered;
  });

  const runningExecutions = computed(() =>
    executions.value.filter((e) => e.status === 'running')
  );

  const successfulExecutions = computed(() =>
    executions.value.filter((e) => e.status === 'success')
  );

  const failedExecutions = computed(() =>
    executions.value.filter((e) => e.status === 'error' || e.status === 'crashed')
  );

  const executionsCount = computed(() => executions.value.length);

  const hasCurrentExecution = computed(() => !!currentExecution.value);

  const isCurrentExecutionRunning = computed(
    () => currentExecution.value?.status === 'running'
  );

  // ============================================================================
  // Actions - API Operations
  // ============================================================================

  /**
   * Fetch all executions
   */
  async function fetchExecutions(workflowId?: string, limit?: number): Promise<void> {
    try {
      loading.value = true;
      error.value = null;

      const data = await api.getExecutions(workflowId, limit);
      executions.value = data.map((e: any) => ({
        ...e,
        mode: e.mode as ExecutionMode,
        startTime: new Date(e.startTime),
        endTime: e.endTime ? new Date(e.endTime) : undefined,
        createdAt: e.createdAt ? new Date(e.createdAt) : new Date(e.startTime),
        error: e.error ? {
          ...e.error,
          timestamp: e.error.timestamp ? new Date(e.error.timestamp) : new Date(),
        } : undefined,
      }));
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch executions';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Fetch a single execution by ID
   */
  async function fetchExecution(id: string): Promise<void> {
    try {
      loading.value = true;
      error.value = null;

      const data: any = await api.getExecution(id);
      currentExecution.value = {
        ...data,
        mode: data.mode as ExecutionMode,
        startTime: new Date(data.startTime),
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(data.startTime),
        error: data.error ? {
          ...data.error,
          timestamp: data.error.timestamp ? new Date(data.error.timestamp) : new Date(),
        } : undefined,
      };

      // Update in executions array if exists
      if (currentExecution.value) {
        const index = executions.value.findIndex((e) => e.id === id);
        if (index !== -1) {
          executions.value[index] = currentExecution.value;
        } else {
          executions.value.push(currentExecution.value);
        }
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch execution';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Start a new execution
   */
  async function startExecution(data: StartExecutionData): Promise<Execution> {
    try {
      loading.value = true;
      error.value = null;

      const execution: any = await api.startExecution(data);
      const newExecution: Execution = {
        ...execution,
        mode: execution.mode as ExecutionMode,
        startTime: new Date(execution.startTime),
        endTime: execution.endTime ? new Date(execution.endTime) : undefined,
        createdAt: execution.createdAt ? new Date(execution.createdAt) : new Date(execution.startTime),
        error: execution.error ? {
          ...execution.error,
          timestamp: execution.error.timestamp ? new Date(execution.error.timestamp) : new Date(),
        } : undefined,
      };

      executions.value.unshift(newExecution);
      currentExecution.value = newExecution;

      return newExecution;
    } catch (err: any) {
      error.value = err.message || 'Failed to start execution';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Stop a running execution
   */
  async function stopExecution(id: string): Promise<void> {
    try {
      loading.value = true;
      error.value = null;

      await api.stopExecution(id);

      // Refresh the execution to get updated status
      await fetchExecution(id);
    } catch (err: any) {
      error.value = err.message || 'Failed to stop execution';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Retry a failed execution
   */
  async function retryExecution(id: string): Promise<Execution> {
    try {
      loading.value = true;
      error.value = null;

      const execution: any = await api.retryExecution(id);
      const retriedExecution: Execution = {
        ...execution,
        mode: execution.mode as ExecutionMode,
        startTime: new Date(execution.startTime),
        endTime: execution.endTime ? new Date(execution.endTime) : undefined,
        createdAt: execution.createdAt ? new Date(execution.createdAt) : new Date(execution.startTime),
        error: execution.error ? {
          ...execution.error,
          timestamp: execution.error.timestamp ? new Date(execution.error.timestamp) : new Date(),
        } : undefined,
      };

      executions.value.unshift(retriedExecution);

      return retriedExecution;
    } catch (err: any) {
      error.value = err.message || 'Failed to retry execution';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Delete an execution
   */
  async function deleteExecution(id: string): Promise<void> {
    try {
      loading.value = true;
      error.value = null;

      await api.deleteExecution(id);

      // Remove from array
      executions.value = executions.value.filter((e) => e.id !== id);

      // Clear current if it's the same
      if (currentExecution.value?.id === id) {
        currentExecution.value = null;
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to delete execution';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Fetch execution statistics
   */
  async function fetchStats(workflowId?: string): Promise<void> {
    try {
      error.value = null;

      const data = await api.getExecutionStats(workflowId);
      stats.value = data;
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch execution stats';
      throw err;
    }
  }

  // ============================================================================
  // Actions - WebSocket Operations
  // ============================================================================

  /**
   * Connect to WebSocket for real-time updates
   */
  function connectWebSocket(): void {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    try {
      const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
      const token = api.getToken();

      // Add token to WebSocket URL
      const url = token ? `${wsUrl}?token=${token}` : wsUrl;

      ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('WebSocket connected');
        wsConnected.value = true;
        wsReconnecting.value = false;
        reconnectAttempts = 0;

        // Clear any pending reconnect timeout
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketEvent = JSON.parse(event.data);
          handleWebSocketEvent(message);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        error.value = 'WebSocket connection error';
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        wsConnected.value = false;

        // Attempt to reconnect
        if (reconnectAttempts < maxReconnectAttempts) {
          wsReconnecting.value = true;
          reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);

          console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);

          reconnectTimeout = setTimeout(() => {
            connectWebSocket();
          }, delay);
        } else {
          wsReconnecting.value = false;
          error.value = 'WebSocket connection lost. Please refresh the page.';
        }
      };
    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
      error.value = 'Failed to establish WebSocket connection';
    }
  }

  /**
   * Disconnect WebSocket
   */
  function disconnectWebSocket(): void {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    if (ws) {
      reconnectAttempts = maxReconnectAttempts; // Prevent reconnection
      ws.close();
      ws = null;
    }

    wsConnected.value = false;
    wsReconnecting.value = false;
  }

  /**
   * Handle incoming WebSocket events
   */
  function handleWebSocketEvent(event: WebSocketEvent): void {
    switch (event.type) {
      case 'execution:started':
        handleExecutionStarted(event.data);
        break;
      case 'execution:completed':
        handleExecutionCompleted(event.data);
        break;
      case 'execution:failed':
        handleExecutionFailed(event.data);
        break;
      case 'execution:progress':
        handleExecutionProgress(event.data);
        break;
      case 'node:started':
      case 'node:completed':
      case 'node:failed':
      case 'node:progress':
        // These events can be handled by components subscribing to currentExecution
        updateCurrentExecutionFromEvent(event);
        break;
      default:
        console.log('Unhandled WebSocket event:', event.type);
    }
  }

  /**
   * Handle execution started event
   */
  function handleExecutionStarted(data: any): void {
    const execution: Execution = {
      id: data.executionId,
      workflowId: data.workflowId,
      mode: data.mode as ExecutionMode,
      status: 'running',
      startTime: new Date(data.startTime),
      data: {},
      retryCount: 0,
      createdAt: new Date(),
    };

    // Add to beginning of array
    executions.value.unshift(execution);

    // Update current if it's the same
    if (currentExecution.value?.id === data.executionId) {
      currentExecution.value = execution;
    }
  }

  /**
   * Handle execution completed event
   */
  function handleExecutionCompleted(data: any): void {
    updateExecutionInState(data.executionId, {
      status: data.status,
      endTime: new Date(data.endTime),
    });
  }

  /**
   * Handle execution failed event
   */
  function handleExecutionFailed(data: any): void {
    updateExecutionInState(data.executionId, {
      status: 'error',
      endTime: new Date(data.endTime),
      error: {
        message: data.error.message,
        stack: data.error.stack,
        node: data.error.node,
        timestamp: new Date(),
      },
    });
  }

  /**
   * Handle execution progress event
   */
  function handleExecutionProgress(data: any): void {
    updateExecutionInState(data.executionId, {
      status: data.status,
    });
  }

  /**
   * Update execution in state
   */
  function updateExecutionInState(executionId: string, updates: Partial<Execution>): void {
    const index = executions.value.findIndex((e) => e.id === executionId);
    if (index !== -1) {
      executions.value[index] = {
        ...executions.value[index],
        ...updates,
      };
    }

    if (currentExecution.value?.id === executionId) {
      currentExecution.value = {
        ...currentExecution.value,
        ...updates,
      };
    }
  }

  /**
   * Update current execution from WebSocket event
   */
  function updateCurrentExecutionFromEvent(event: WebSocketEvent): void {
    if (currentExecution.value && event.data.executionId === currentExecution.value.id) {
      // Trigger reactivity by creating a new object
      currentExecution.value = { ...currentExecution.value };
    }
  }

  // ============================================================================
  // Actions - Filters and Utilities
  // ============================================================================

  /**
   * Set current execution
   */
  function setCurrentExecution(execution: Execution | null): void {
    currentExecution.value = execution;
  }

  /**
   * Get execution by ID from state
   */
  function getExecutionById(id: string): Execution | undefined {
    return executions.value.find((e) => e.id === id);
  }

  /**
   * Set workflow filter
   */
  function setFilterWorkflowId(workflowId: string | null): void {
    filterWorkflowId.value = workflowId;
  }

  /**
   * Set status filter
   */
  function setFilterStatus(status: ExecutionStatus | null): void {
    filterStatus.value = status;
  }

  /**
   * Set sort options
   */
  function setSorting(by: 'startTime' | 'endTime' | 'status', order: 'asc' | 'desc'): void {
    sortBy.value = by;
    sortOrder.value = order;
  }

  /**
   * Clear all filters
   */
  function clearFilters(): void {
    filterWorkflowId.value = null;
    filterStatus.value = null;
  }

  /**
   * Clear error
   */
  function clearError(): void {
    error.value = null;
  }

  /**
   * Reset store state
   */
  function $reset(): void {
    executions.value = [];
    currentExecution.value = null;
    stats.value = null;
    loading.value = false;
    error.value = null;
    filterWorkflowId.value = null;
    filterStatus.value = null;
    sortBy.value = 'startTime';
    sortOrder.value = 'desc';
    disconnectWebSocket();
  }

  // ============================================================================
  // Return Store
  // ============================================================================

  return {
    // State
    executions,
    currentExecution,
    stats,
    loading,
    error,
    filterWorkflowId,
    filterStatus,
    sortBy,
    sortOrder,
    wsConnected,
    wsReconnecting,

    // Getters
    filteredExecutions,
    runningExecutions,
    successfulExecutions,
    failedExecutions,
    executionsCount,
    hasCurrentExecution,
    isCurrentExecutionRunning,

    // Actions - API
    fetchExecutions,
    fetchExecution,
    startExecution,
    stopExecution,
    retryExecution,
    deleteExecution,
    fetchStats,

    // Actions - WebSocket
    connectWebSocket,
    disconnectWebSocket,

    // Actions - Utilities
    setCurrentExecution,
    getExecutionById,
    setFilterWorkflowId,
    setFilterStatus,
    setSorting,
    clearFilters,
    clearError,
    $reset,
  };
});

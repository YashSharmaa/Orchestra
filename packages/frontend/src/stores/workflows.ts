/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Workflows store for managing workflow state and operations
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import api from '../services/api';
import type { Workflow, CreateWorkflowData, UpdateWorkflowData } from '../types';

export const useWorkflowsStore = defineStore('workflows', () => {
  // ============================================================================
  // State
  // ============================================================================

  const workflows = ref<Workflow[]>([]);
  const currentWorkflow = ref<Workflow | null>(null);
  const templates = ref<Workflow[]>([]);
  const loading = ref(false);
  const saving = ref(false);
  const error = ref<string | null>(null);
  const searchQuery = ref('');
  const filterTags = ref<string[]>([]);
  const filterActive = ref<boolean | null>(null);
  const filterPublic = ref<boolean | null>(null);
  const sortBy = ref<'name' | 'createdAt' | 'updatedAt'>('updatedAt');
  const sortOrder = ref<'asc' | 'desc'>('desc');

  // ============================================================================
  // Getters
  // ============================================================================

  const filteredWorkflows = computed(() => {
    let filtered = [...workflows.value];

    // Search filter
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      filtered = filtered.filter(
        (w) =>
          w.name.toLowerCase().includes(query) ||
          w.description?.toLowerCase().includes(query) ||
          w.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Tag filter
    if (filterTags.value.length > 0) {
      filtered = filtered.filter((w) =>
        filterTags.value.some((tag) => w.tags?.includes(tag))
      );
    }

    // Active filter
    if (filterActive.value !== null) {
      filtered = filtered.filter((w) => w.isActive === filterActive.value);
    }

    // Public filter
    if (filterPublic.value !== null) {
      filtered = filtered.filter((w) => w.isPublic === filterPublic.value);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortBy.value) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'createdAt':
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
          aVal = new Date(a.updatedAt).getTime();
          bVal = new Date(b.updatedAt).getTime();
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

  const activeWorkflows = computed(() =>
    workflows.value.filter((w) => w.isActive)
  );

  const publicWorkflows = computed(() =>
    workflows.value.filter((w) => w.isPublic)
  );

  const allTags = computed(() => {
    const tags = new Set<string>();
    workflows.value.forEach((w) => {
      w.tags?.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  });

  const workflowsCount = computed(() => workflows.value.length);

  const hasCurrentWorkflow = computed(() => !!currentWorkflow.value);

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Fetch all workflows
   */
  async function fetchWorkflows(): Promise<void> {
    try {
      loading.value = true;
      error.value = null;

      const data = await api.getWorkflows();
      workflows.value = data.map((w: any) => ({
        ...w,
        verified: w.verified ?? false,
        createdAt: new Date(w.createdAt),
        updatedAt: new Date(w.updatedAt),
      }));
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch workflows';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Fetch a single workflow by ID
   */
  async function fetchWorkflow(id: string): Promise<void> {
    try {
      loading.value = true;
      error.value = null;

      const data: any = await api.getWorkflow(id);
      currentWorkflow.value = {
        ...data,
        verified: data.verified ?? false,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      };

      // Update in workflows array if exists
      if (currentWorkflow.value) {
        const index = workflows.value.findIndex((w) => w.id === id);
        if (index !== -1) {
          workflows.value[index] = currentWorkflow.value;
        } else {
          workflows.value.push(currentWorkflow.value);
        }
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch workflow';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Create a new workflow
   */
  async function createWorkflow(data: CreateWorkflowData): Promise<Workflow> {
    try {
      saving.value = true;
      error.value = null;

      const workflow: any = await api.createWorkflow(data);
      const newWorkflow: Workflow = {
        ...workflow,
        verified: workflow.verified ?? false,
        createdAt: new Date(workflow.createdAt),
        updatedAt: new Date(workflow.updatedAt),
      };

      workflows.value.push(newWorkflow);
      currentWorkflow.value = newWorkflow;

      return newWorkflow;
    } catch (err: any) {
      error.value = err.message || 'Failed to create workflow';
      throw err;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Update an existing workflow
   */
  async function updateWorkflow(
    id: string,
    data: UpdateWorkflowData
  ): Promise<Workflow> {
    try {
      saving.value = true;
      error.value = null;

      const workflow: any = await api.updateWorkflow(id, data);
      const updatedWorkflow: Workflow = {
        ...workflow,
        verified: workflow.verified ?? false,
        createdAt: new Date(workflow.createdAt),
        updatedAt: new Date(workflow.updatedAt),
      };

      // Update in array
      const index = workflows.value.findIndex((w) => w.id === id);
      if (index !== -1) {
        workflows.value[index] = updatedWorkflow;
      }

      // Update current if it's the same
      if (currentWorkflow.value?.id === id) {
        currentWorkflow.value = updatedWorkflow;
      }

      return updatedWorkflow;
    } catch (err: any) {
      error.value = err.message || 'Failed to update workflow';
      throw err;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Delete a workflow
   */
  async function deleteWorkflow(id: string): Promise<void> {
    try {
      loading.value = true;
      error.value = null;

      await api.deleteWorkflow(id);

      // Remove from array
      workflows.value = workflows.value.filter((w) => w.id !== id);

      // Clear current if it's the same
      if (currentWorkflow.value?.id === id) {
        currentWorkflow.value = null;
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to delete workflow';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Duplicate a workflow
   */
  async function duplicateWorkflow(id: string): Promise<Workflow> {
    try {
      saving.value = true;
      error.value = null;

      const workflow: any = await api.duplicateWorkflow(id);
      const duplicatedWorkflow: Workflow = {
        ...workflow,
        verified: workflow.verified ?? false,
        createdAt: new Date(workflow.createdAt),
        updatedAt: new Date(workflow.updatedAt),
      };

      workflows.value.push(duplicatedWorkflow);

      return duplicatedWorkflow;
    } catch (err: any) {
      error.value = err.message || 'Failed to duplicate workflow';
      throw err;
    } finally {
      saving.value = false;
    }
  }

  /**
   * Toggle workflow active status
   */
  async function toggleActive(id: string): Promise<void> {
    try {
      loading.value = true;
      error.value = null;

      const workflow: any = await api.toggleWorkflowActive(id);
      const updatedWorkflow: Workflow = {
        ...workflow,
        verified: workflow.verified ?? false,
        createdAt: new Date(workflow.createdAt),
        updatedAt: new Date(workflow.updatedAt),
      };

      // Update in array
      const index = workflows.value.findIndex((w) => w.id === id);
      if (index !== -1) {
        workflows.value[index] = updatedWorkflow;
      }

      // Update current if it's the same
      if (currentWorkflow.value?.id === id) {
        currentWorkflow.value = updatedWorkflow;
      }
    } catch (err: any) {
      error.value = err.message || 'Failed to toggle workflow status';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Fetch workflow templates
   */
  async function fetchTemplates(category?: string): Promise<void> {
    try {
      loading.value = true;
      error.value = null;

      const data = await api.getWorkflowTemplates(category);
      templates.value = data.map((w: any) => ({
        ...w,
        verified: w.verified ?? false,
        createdAt: new Date(w.createdAt),
        updatedAt: new Date(w.updatedAt),
      }));
    } catch (err: any) {
      error.value = err.message || 'Failed to fetch templates';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Set current workflow
   */
  function setCurrentWorkflow(workflow: Workflow | null): void {
    currentWorkflow.value = workflow;
  }

  /**
   * Get workflow by ID from state
   */
  function getWorkflowById(id: string): Workflow | undefined {
    return workflows.value.find((w) => w.id === id);
  }

  /**
   * Set search query
   */
  function setSearchQuery(query: string): void {
    searchQuery.value = query;
  }

  /**
   * Set tag filters
   */
  function setFilterTags(tags: string[]): void {
    filterTags.value = tags;
  }

  /**
   * Toggle tag filter
   */
  function toggleFilterTag(tag: string): void {
    const index = filterTags.value.indexOf(tag);
    if (index !== -1) {
      filterTags.value.splice(index, 1);
    } else {
      filterTags.value.push(tag);
    }
  }

  /**
   * Set active filter
   */
  function setFilterActive(active: boolean | null): void {
    filterActive.value = active;
  }

  /**
   * Set public filter
   */
  function setFilterPublic(isPublic: boolean | null): void {
    filterPublic.value = isPublic;
  }

  /**
   * Set sort options
   */
  function setSorting(by: 'name' | 'createdAt' | 'updatedAt', order: 'asc' | 'desc'): void {
    sortBy.value = by;
    sortOrder.value = order;
  }

  /**
   * Clear all filters
   */
  function clearFilters(): void {
    searchQuery.value = '';
    filterTags.value = [];
    filterActive.value = null;
    filterPublic.value = null;
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
    workflows.value = [];
    currentWorkflow.value = null;
    templates.value = [];
    loading.value = false;
    saving.value = false;
    error.value = null;
    searchQuery.value = '';
    filterTags.value = [];
    filterActive.value = null;
    filterPublic.value = null;
    sortBy.value = 'updatedAt';
    sortOrder.value = 'desc';
  }

  // ============================================================================
  // Return Store
  // ============================================================================

  return {
    // State
    workflows,
    currentWorkflow,
    templates,
    loading,
    saving,
    error,
    searchQuery,
    filterTags,
    filterActive,
    filterPublic,
    sortBy,
    sortOrder,

    // Getters
    filteredWorkflows,
    activeWorkflows,
    publicWorkflows,
    allTags,
    workflowsCount,
    hasCurrentWorkflow,

    // Actions
    fetchWorkflows,
    fetchWorkflow,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    duplicateWorkflow,
    toggleActive,
    fetchTemplates,
    setCurrentWorkflow,
    getWorkflowById,
    setSearchQuery,
    setFilterTags,
    toggleFilterTag,
    setFilterActive,
    setFilterPublic,
    setSorting,
    clearFilters,
    clearError,
    $reset,
  };
});

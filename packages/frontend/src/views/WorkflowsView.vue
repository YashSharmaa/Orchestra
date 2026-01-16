<!--
  Orchestra © 2025
  Author: Orchestra Team
  License: Apache-2.0
  Description: Workflows list view with search, filter, and actions
-->

<template>
  <div class="workflows-view h-full overflow-auto bg-gray-50">
    <div class="max-w-7xl mx-auto p-6">
      <!-- Header -->
      <div class="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">Workflows</h2>
          <p class="text-sm text-gray-600 mt-1">
            Manage and organize your automation workflows
          </p>
        </div>
        <button
          @click="createNewWorkflow"
          class="btn-primary flex items-center"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          New Workflow
        </button>
      </div>

      <!-- Filters and Search -->
      <div class="mb-6 card">
        <div class="flex flex-col sm:flex-row gap-4">
          <!-- Search -->
          <div class="flex-1 relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search workflows..."
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <svg
              class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <!-- Filter by Status -->
          <select
            v-model="filterStatus"
            class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="draft">Draft</option>
          </select>

          <!-- Sort -->
          <select
            v-model="sortBy"
            class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="updated">Last Updated</option>
            <option value="created">Created Date</option>
            <option value="name">Name</option>
            <option value="executions">Executions</option>
          </select>
        </div>
      </div>

      <!-- Workflows Grid -->
      <div v-if="filteredWorkflows.length === 0" class="card text-center py-12">
        <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h3 class="text-lg font-semibold text-gray-900 mb-2">No workflows found</h3>
        <p class="text-gray-600 mb-4">
          {{ searchQuery ? 'Try adjusting your search criteria' : 'Get started by creating your first workflow' }}
        </p>
        <button
          v-if="!searchQuery"
          @click="createNewWorkflow"
          class="btn-primary"
        >
          Create Workflow
        </button>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="workflow in filteredWorkflows"
          :key="workflow.id"
          class="card hover:shadow-lg transition-shadow cursor-pointer group"
          @click="openWorkflow(workflow.id)"
        >
          <!-- Header -->
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1 min-w-0">
              <h3 class="text-lg font-semibold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                {{ workflow.name }}
              </h3>
              <p class="text-sm text-gray-500 mt-1">
                Updated {{ formatDate(workflow.updatedAt) }}
              </p>
            </div>
            <button
              @click.stop="toggleWorkflowMenu(workflow.id)"
              class="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            <!-- Dropdown Menu -->
            <div
              v-if="activeMenu === workflow.id"
              class="absolute right-4 mt-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
              @click.stop
            >
              <button
                @click="duplicateWorkflow(workflow.id)"
                class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Duplicate
              </button>
              <button
                @click="exportWorkflow(workflow.id)"
                class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Export
              </button>
              <button
                @click="shareWorkflow(workflow.id)"
                class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Share
              </button>
              <div class="border-t border-gray-200 my-1" />
              <button
                @click="deleteWorkflow(workflow.id)"
                class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>

          <!-- Description -->
          <p class="text-sm text-gray-600 mb-4 line-clamp-2">
            {{ workflow.description || 'No description' }}
          </p>

          <!-- Stats -->
          <div class="flex items-center justify-between text-sm mb-4">
            <div class="flex items-center space-x-4">
              <div class="flex items-center text-gray-600">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                {{ workflow.nodeCount }} nodes
              </div>
              <div class="flex items-center text-gray-600">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {{ workflow.executionCount }} runs
              </div>
            </div>
          </div>

          <!-- Status Badge and Tags -->
          <div class="flex items-center justify-between">
            <span
              class="px-2 py-1 text-xs font-medium rounded-full"
              :class="getStatusClass(workflow.status)"
            >
              {{ workflow.status }}
            </span>

            <div class="flex flex-wrap gap-1">
              <span
                v-for="tag in workflow.tags?.slice(0, 2)"
                :key="tag"
                class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
              >
                {{ tag }}
              </span>
              <span
                v-if="workflow.tags && workflow.tags.length > 2"
                class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
              >
                +{{ workflow.tags.length - 2 }}
              </span>
            </div>
          </div>

          <!-- Last Execution Status -->
          <div v-if="workflow.lastExecution" class="mt-3 pt-3 border-t border-gray-200">
            <div class="flex items-center justify-between text-xs">
              <span class="text-gray-600">Last execution:</span>
              <span
                class="font-medium"
                :class="{
                  'text-green-600': workflow.lastExecution.status === 'success',
                  'text-red-600': workflow.lastExecution.status === 'error',
                  'text-yellow-600': workflow.lastExecution.status === 'running'
                }"
              >
                {{ workflow.lastExecution.status }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="filteredWorkflows.length > 0" class="mt-6 flex items-center justify-between">
        <p class="text-sm text-gray-600">
          Showing {{ filteredWorkflows.length }} of {{ workflows.length }} workflows
        </p>
        <div class="flex space-x-2">
          <button
            class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled
          >
            Previous
          </button>
          <button
            class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- Share Workflow Modal -->
    <div
      v-if="sharingWorkflow"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click="sharingWorkflow = null"
    >
      <div
        class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto"
        @click.stop
      >
        <div class="p-6">
          <!-- Header -->
          <div class="flex items-start justify-between mb-6">
            <div>
              <h3 class="text-xl font-bold text-gray-900">Share Workflow</h3>
              <p class="text-sm text-gray-600 mt-1">
                Publish "{{ sharingWorkflow.name }}" to the marketplace
              </p>
            </div>
            <button
              @click="sharingWorkflow = null"
              class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Visibility Options -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-3">
              Visibility
            </label>
            <div class="space-y-3">
              <label
                class="flex items-start p-4 border rounded-lg cursor-pointer transition-all"
                :class="shareVisibility === 'private' ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'"
              >
                <input
                  type="radio"
                  v-model="shareVisibility"
                  value="private"
                  class="mt-1 mr-3"
                />
                <div class="flex-1">
                  <div class="flex items-center">
                    <svg class="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span class="font-medium text-gray-900">Private</span>
                  </div>
                  <p class="text-sm text-gray-600 mt-1">Only you can see this workflow</p>
                </div>
              </label>

              <label
                class="flex items-start p-4 border rounded-lg cursor-pointer transition-all"
                :class="shareVisibility === 'team' ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'"
              >
                <input
                  type="radio"
                  v-model="shareVisibility"
                  value="team"
                  class="mt-1 mr-3"
                />
                <div class="flex-1">
                  <div class="flex items-center">
                    <svg class="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span class="font-medium text-gray-900">Team</span>
                  </div>
                  <p class="text-sm text-gray-600 mt-1">Visible to your team members</p>
                </div>
              </label>

              <label
                class="flex items-start p-4 border rounded-lg cursor-pointer transition-all"
                :class="shareVisibility === 'public' ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'"
              >
                <input
                  type="radio"
                  v-model="shareVisibility"
                  value="public"
                  class="mt-1 mr-3"
                />
                <div class="flex-1">
                  <div class="flex items-center">
                    <svg class="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span class="font-medium text-gray-900">Public</span>
                  </div>
                  <p class="text-sm text-gray-600 mt-1">Available to everyone in the marketplace</p>
                </div>
              </label>
            </div>
          </div>

          <!-- Title (optional override) -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Title (optional)
            </label>
            <input
              v-model="shareTitle"
              type="text"
              :placeholder="sharingWorkflow.name"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <!-- Description (optional override) -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <textarea
              v-model="shareDescription"
              :placeholder="sharingWorkflow.description || 'Add a description...'"
              rows="3"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              @click="sharingWorkflow = null"
              class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              :disabled="publishingWorkflow"
            >
              Cancel
            </button>
            <button
              @click="publishToMarketplace"
              class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center"
              :disabled="publishingWorkflow"
            >
              <svg v-if="!publishingWorkflow" class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <svg v-else class="w-5 h-5 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {{ publishingWorkflow ? 'Publishing...' : 'Publish' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

interface Workflow {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'draft';
  nodeCount: number;
  executionCount: number;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  lastExecution?: {
    status: 'success' | 'error' | 'running';
    timestamp: Date;
  };
}

const router = useRouter();

// State
const searchQuery = ref('');
const filterStatus = ref('all');
const sortBy = ref('updated');
const activeMenu = ref<string | null>(null);
const sharingWorkflow = ref<Workflow | null>(null);
const shareVisibility = ref<'private' | 'team' | 'public'>('private');
const shareTitle = ref('');
const shareDescription = ref('');
const publishingWorkflow = ref(false);

// Mock workflows data (in real app, fetch from API)
const workflows = ref<Workflow[]>([
  {
    id: '1',
    name: 'Customer Onboarding',
    description: 'Automated customer onboarding workflow with email notifications and CRM updates',
    status: 'active',
    nodeCount: 8,
    executionCount: 142,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-02-20'),
    tags: ['crm', 'email', 'automation'],
    lastExecution: {
      status: 'success',
      timestamp: new Date('2024-02-20T10:30:00')
    }
  },
  {
    id: '2',
    name: 'Daily Report Generator',
    description: 'Generate and send daily reports to stakeholders',
    status: 'active',
    nodeCount: 5,
    executionCount: 67,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-21'),
    tags: ['reporting', 'schedule'],
    lastExecution: {
      status: 'success',
      timestamp: new Date('2024-02-21T08:00:00')
    }
  },
  {
    id: '3',
    name: 'Lead Qualification',
    description: 'Automatically qualify and route leads based on scoring criteria',
    status: 'active',
    nodeCount: 12,
    executionCount: 234,
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-02-19'),
    tags: ['sales', 'ai', 'automation'],
    lastExecution: {
      status: 'error',
      timestamp: new Date('2024-02-19T14:22:00')
    }
  },
  {
    id: '4',
    name: 'Inventory Sync',
    description: 'Sync inventory levels across multiple platforms',
    status: 'inactive',
    nodeCount: 6,
    executionCount: 89,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-02-10'),
    tags: ['inventory', 'integration']
  },
  {
    id: '5',
    name: 'Support Ticket Routing',
    description: 'Route support tickets to appropriate teams based on AI analysis',
    status: 'active',
    nodeCount: 10,
    executionCount: 456,
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-02-21'),
    tags: ['support', 'ai', 'routing'],
    lastExecution: {
      status: 'success',
      timestamp: new Date('2024-02-21T15:45:00')
    }
  },
  {
    id: '6',
    name: 'Social Media Monitor',
    description: 'Monitor social media mentions and respond automatically',
    status: 'draft',
    nodeCount: 4,
    executionCount: 0,
    createdAt: new Date('2024-02-18'),
    updatedAt: new Date('2024-02-18'),
    tags: ['social', 'monitoring']
  }
]);

// Computed
const filteredWorkflows = computed(() => {
  let filtered = workflows.value;

  // Filter by status
  if (filterStatus.value !== 'all') {
    filtered = filtered.filter(w => w.status === filterStatus.value);
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(w =>
      w.name.toLowerCase().includes(query) ||
      w.description?.toLowerCase().includes(query) ||
      w.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }

  // Sort
  filtered = [...filtered].sort((a, b) => {
    switch (sortBy.value) {
      case 'updated':
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      case 'created':
        return b.createdAt.getTime() - a.createdAt.getTime();
      case 'name':
        return a.name.localeCompare(b.name);
      case 'executions':
        return b.executionCount - a.executionCount;
      default:
        return 0;
    }
  });

  return filtered;
});

// Actions
function createNewWorkflow() {
  router.push('/workflows/new');
}

function openWorkflow(id: string) {
  router.push(`/workflows/${id}`);
}

function toggleWorkflowMenu(id: string) {
  activeMenu.value = activeMenu.value === id ? null : id;
}

async function duplicateWorkflow(id: string) {
  try {
    // In real app, call API
    console.log('Duplicating workflow:', id);
    showNotification('Workflow duplicated successfully', 'success');
  } catch (error) {
    showNotification('Failed to duplicate workflow', 'error');
  }
  activeMenu.value = null;
}

function exportWorkflow(id: string) {
  const workflow = workflows.value.find(w => w.id === id);
  if (!workflow) return;

  const data = {
    ...workflow,
    exportedAt: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${workflow.name.replace(/\s+/g, '-').toLowerCase()}.json`;
  a.click();
  URL.revokeObjectURL(url);

  showNotification('Workflow exported', 'success');
  activeMenu.value = null;
}

function shareWorkflow(id: string) {
  const workflow = workflows.value.find(w => w.id === id);
  if (!workflow) return;

  sharingWorkflow.value = workflow;
  activeMenu.value = null;
}

async function publishToMarketplace() {
  if (!sharingWorkflow.value) return;

  publishingWorkflow.value = true;
  try {
    // In real app, call API: POST /api/marketplace/publish
    await new Promise(resolve => setTimeout(resolve, 1500));

    const data = {
      workflowId: sharingWorkflow.value.id,
      visibility: shareVisibility.value,
      title: shareTitle.value || sharingWorkflow.value.name,
      description: shareDescription.value || sharingWorkflow.value.description,
    };

    console.log('Publishing workflow to marketplace:', data);

    showNotification(`Workflow published as ${shareVisibility.value}`, 'success');
    sharingWorkflow.value = null;
    shareVisibility.value = 'private';
    shareTitle.value = '';
    shareDescription.value = '';
  } catch (error) {
    console.error('Failed to publish workflow:', error);
    showNotification('Failed to publish workflow', 'error');
  } finally {
    publishingWorkflow.value = false;
  }
}

async function deleteWorkflow(id: string) {
  const workflow = workflows.value.find(w => w.id === id);
  if (!workflow) return;

  if (confirm(`Are you sure you want to delete "${workflow.name}"? This action cannot be undone.`)) {
    try {
      // In real app, call API
      workflows.value = workflows.value.filter(w => w.id !== id);
      showNotification('Workflow deleted successfully', 'success');
    } catch (error) {
      showNotification('Failed to delete workflow', 'error');
    }
  }
  activeMenu.value = null;
}

// Helper functions
function getStatusClass(status: string): string {
  const classes = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-700',
    draft: 'bg-yellow-100 text-yellow-700'
  };
  return classes[status as keyof typeof classes] || classes.draft;
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;

  return date.toLocaleDateString();
}

function showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info') {
  // In real app, use proper notification system
  console.log(`[${type.toUpperCase()}] ${message}`);
}

// Close menu when clicking outside
document.addEventListener('click', () => {
  activeMenu.value = null;
});
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

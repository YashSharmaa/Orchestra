<!--
  Orchestra © 2025
  Author: Orchestra Team
  License: Apache-2.0
  Description: Complete workflow editor view with canvas, node library, and properties panel
-->

<template>
  <div class="workflow-editor h-full flex flex-col bg-gray-100">
    <!-- Top Bar -->
    <div class="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center">
      <div class="flex items-center space-x-4">
        <router-link
          to="/workflows"
          class="text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </router-link>
        <div class="flex-1">
          <input
            v-model="workflowName"
            type="text"
            class="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1"
            placeholder="Untitled Workflow"
          />
          <p class="text-xs text-gray-500 px-2">
            {{ workflow.nodes.length }} node{{ workflow.nodes.length !== 1 ? 's' : '' }},
            {{ workflow.connections.length }} connection{{ workflow.connections.length !== 1 ? 's' : '' }}
          </p>
        </div>
      </div>

      <div class="flex items-center space-x-2">
        <!-- Status Indicator -->
        <div class="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-lg">
          <div
            class="w-2 h-2 rounded-full"
            :class="{
              'bg-green-500': executionStatus === 'success',
              'bg-red-500': executionStatus === 'error',
              'bg-yellow-500': executionStatus === 'running',
              'bg-gray-400': executionStatus === 'idle'
            }"
          />
          <span class="text-xs text-gray-700 font-medium capitalize">{{ executionStatus }}</span>
        </div>

        <!-- Actions -->
        <button
          @click="toggleAIAssistant"
          class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          :class="{ 'bg-primary-50 text-primary-600': showAIAssistant }"
          title="AI Assistant"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </button>

        <button
          @click="saveWorkflow"
          class="btn-secondary"
          :disabled="isSaving"
        >
          <svg v-if="!isSaving" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          <svg v-else class="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {{ isSaving ? 'Saving...' : 'Save' }}
        </button>

        <button
          @click="runWorkflow"
          class="btn-primary"
          :disabled="isRunning || workflow.nodes.length === 0"
        >
          <svg v-if="!isRunning" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg v-else class="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {{ isRunning ? 'Running...' : 'Run' }}
        </button>

        <!-- More Options -->
        <div class="relative">
          <button
            @click="showMoreMenu = !showMoreMenu"
            class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="More options"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          <!-- Dropdown Menu -->
          <div
            v-if="showMoreMenu"
            class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
          >
            <button
              @click="exportWorkflow"
              class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Export JSON
            </button>
            <button
              @click="duplicateWorkflow"
              class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Duplicate
            </button>
            <button
              @click="shareWorkflow"
              class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Share
            </button>
            <div class="border-t border-gray-200 my-1" />
            <button
              @click="deleteWorkflow"
              class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Delete Workflow
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Node Library Sidebar -->
      <div class="w-80 flex-shrink-0" v-show="showNodeLibrary">
        <NodeLibrary @node-selected="handleNodeSelected" />
      </div>

      <!-- Canvas Area -->
      <div class="flex-1 relative">
        <WorkflowCanvas
          ref="canvasRef"
          v-model="workflow"
          @node-selected="handleNodeSelected"
          @node-added="handleNodeAdded"
        />

        <!-- Toggle Node Library Button -->
        <button
          v-if="!showNodeLibrary"
          @click="showNodeLibrary = true"
          class="absolute top-4 left-4 p-2 bg-white rounded-lg shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          title="Show node library"
        >
          <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <!-- Properties Panel Sidebar -->
      <div class="w-80 flex-shrink-0" v-show="showPropertiesPanel">
        <PropertiesPanel
          :selected-node="selectedNodeData"
          @update="handleNodeUpdate"
          @delete="handleNodeDelete"
          @close="showPropertiesPanel = false"
        />
      </div>

      <!-- AI Assistant Panel -->
      <div class="w-96 flex-shrink-0" v-show="showAIAssistant">
        <ChatAssistant @close="showAIAssistant = false" @message="handleAIMessage" />
      </div>
    </div>

    <!-- Bottom Status Bar -->
    <div class="bg-white border-t border-gray-200 px-6 py-2 flex justify-between items-center text-xs text-gray-600">
      <div class="flex items-center space-x-4">
        <span>ID: {{ workflowId }}</span>
        <span v-if="lastSaved">Last saved: {{ formatTime(lastSaved) }}</span>
      </div>
      <div class="flex items-center space-x-4">
        <button
          @click="showNodeLibrary = !showNodeLibrary"
          class="hover:text-gray-900"
        >
          {{ showNodeLibrary ? 'Hide' : 'Show' }} Node Library
        </button>
        <button
          @click="showPropertiesPanel = !showPropertiesPanel"
          class="hover:text-gray-900"
        >
          {{ showPropertiesPanel ? 'Hide' : 'Show' }} Properties
        </button>
      </div>
    </div>

    <!-- Share Workflow Modal -->
    <div
      v-if="showSharingModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click="showSharingModal = false"
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
                Publish "{{ workflowName }}" to the marketplace
              </p>
            </div>
            <button
              @click="showSharingModal = false"
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
              :placeholder="workflowName"
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
              placeholder="Add a description..."
              rows="3"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              @click="showSharingModal = false"
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
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import WorkflowCanvas from '@/components/WorkflowCanvas.vue';
import NodeLibrary from '@/components/NodeLibrary.vue';
import PropertiesPanel from '@/components/PropertiesPanel.vue';
import ChatAssistant from '@/components/ChatAssistant.vue';

interface Node {
  id: string;
  type: string;
  name: string;
  parameters: Record<string, any>;
  position: { x: number; y: number };
  disabled?: boolean;
  notes?: string;
  retryOnFail?: boolean;
  maxRetries?: number;
  waitBetweenRetries?: number;
  alwaysOutputData?: boolean;
  executeOnce?: boolean;
}

interface Connection {
  id: string;
  source: string;
  sourceOutput: string;
  target: string;
  targetInput: string;
}

interface Workflow {
  nodes: Node[];
  connections: Connection[];
}

const route = useRoute();
const router = useRouter();

// Workflow state
const workflowId = ref(route.params.id as string);
const workflowName = ref('Untitled Workflow');
const workflow = ref<Workflow>({
  nodes: [],
  connections: []
});

// UI state
const showNodeLibrary = ref(true);
const showPropertiesPanel = ref(false);
const showAIAssistant = ref(false);
const showMoreMenu = ref(false);
const showSharingModal = ref(false);
const selectedNodeId = ref<string | null>(null);
const canvasRef = ref<InstanceType<typeof WorkflowCanvas> | null>(null);

// Execution state
const executionStatus = ref<'idle' | 'running' | 'success' | 'error'>('idle');
const isRunning = ref(false);
const isSaving = ref(false);
const lastSaved = ref<Date | null>(null);

// Share state
const shareVisibility = ref<'private' | 'team' | 'public'>('private');
const shareTitle = ref('');
const shareDescription = ref('');
const publishingWorkflow = ref(false);

// Computed
const selectedNodeData = computed(() => {
  if (!selectedNodeId.value) return null;
  return workflow.value.nodes.find(n => n.id === selectedNodeId.value) || null;
});

// Handlers
function handleNodeSelected(nodeId: string | null) {
  selectedNodeId.value = nodeId;
  showPropertiesPanel.value = nodeId !== null;
}

function handleNodeAdded(node: Node) {
  console.log('Node added:', node);
}

function handleNodeUpdate(updatedNode: Node) {
  const index = workflow.value.nodes.findIndex(n => n.id === updatedNode.id);
  if (index !== -1) {
    workflow.value.nodes[index] = updatedNode;
  }
}

function handleNodeDelete(nodeId: string) {
  if (canvasRef.value) {
    canvasRef.value.deleteNode(nodeId);
  }
  selectedNodeId.value = null;
  showPropertiesPanel.value = false;
}

function handleAIMessage(message: string) {
  console.log('AI message:', message);
  // In real app, send to AI API
}

function toggleAIAssistant() {
  showAIAssistant.value = !showAIAssistant.value;
}

// Workflow actions
async function saveWorkflow() {
  isSaving.value = true;
  try {
    // In real app, call API to save workflow
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('Saving workflow:', {
      id: workflowId.value,
      name: workflowName.value,
      workflow: workflow.value
    });

    lastSaved.value = new Date();
    showNotification('Workflow saved successfully', 'success');
  } catch (error) {
    console.error('Failed to save workflow:', error);
    showNotification('Failed to save workflow', 'error');
  } finally {
    isSaving.value = false;
  }
}

async function runWorkflow() {
  if (workflow.value.nodes.length === 0) {
    showNotification('Add at least one node to run the workflow', 'warning');
    return;
  }

  isRunning.value = true;
  executionStatus.value = 'running';

  try {
    // In real app, call API to execute workflow
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Executing workflow:', workflow.value);

    executionStatus.value = 'success';
    showNotification('Workflow executed successfully', 'success');
  } catch (error) {
    console.error('Failed to run workflow:', error);
    executionStatus.value = 'error';
    showNotification('Workflow execution failed', 'error');
  } finally {
    isRunning.value = false;
    setTimeout(() => {
      executionStatus.value = 'idle';
    }, 3000);
  }
}

function exportWorkflow() {
  const data = {
    id: workflowId.value,
    name: workflowName.value,
    workflow: workflow.value,
    exportedAt: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${workflowName.value.replace(/\s+/g, '-').toLowerCase()}.json`;
  a.click();
  URL.revokeObjectURL(url);

  showNotification('Workflow exported', 'success');
  showMoreMenu.value = false;
}

async function duplicateWorkflow() {
  try {
    // In real app, call API to duplicate
    console.log('Duplicating workflow:', workflowId.value);
    showNotification('Workflow duplicated', 'success');
    showMoreMenu.value = false;
  } catch (error) {
    showNotification('Failed to duplicate workflow', 'error');
  }
}

function shareWorkflow() {
  showSharingModal.value = true;
  showMoreMenu.value = false;
}

async function publishToMarketplace() {
  publishingWorkflow.value = true;
  try {
    // In real app, call API: POST /api/marketplace/publish
    await new Promise(resolve => setTimeout(resolve, 1500));

    const data = {
      workflowId: workflowId.value,
      name: workflowName.value,
      visibility: shareVisibility.value,
      title: shareTitle.value || workflowName.value,
      description: shareDescription.value,
    };

    console.log('Publishing workflow to marketplace:', data);

    showNotification(`Workflow published as ${shareVisibility.value}`, 'success');
    showSharingModal.value = false;
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

async function deleteWorkflow() {
  if (confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) {
    try {
      // In real app, call API to delete
      console.log('Deleting workflow:', workflowId.value);
      showNotification('Workflow deleted', 'success');
      router.push('/workflows');
    } catch (error) {
      showNotification('Failed to delete workflow', 'error');
    }
  }
  showMoreMenu.value = false;
}

// Helper functions
function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) {
    return 'just now';
  } else if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  } else if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  } else {
    return date.toLocaleDateString();
  }
}

function showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info') {
  // In real app, use a proper notification system
  console.log(`[${type.toUpperCase()}] ${message}`);
}

// Lifecycle
onMounted(async () => {
  // Load workflow data
  if (workflowId.value !== 'new') {
    try {
      // In real app, fetch from API
      console.log('Loading workflow:', workflowId.value);
    } catch (error) {
      console.error('Failed to load workflow:', error);
      showNotification('Failed to load workflow', 'error');
    }
  }
});

// Close dropdown when clicking outside
onMounted(() => {
  document.addEventListener('click', (e) => {
    if (!e.target || !(e.target as Element).closest('.relative')) {
      showMoreMenu.value = false;
    }
  });
});
</script>

<style scoped>
/* Additional styles if needed */
</style>

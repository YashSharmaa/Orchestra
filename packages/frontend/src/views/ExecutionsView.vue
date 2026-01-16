<!--
  Orchestra © 2025
  Author: Orchestra Team
  License: Apache-2.0
  Description: Executions history view with filtering and details
-->

<template>
  <div class="executions-view h-full overflow-auto bg-gray-50">
    <div class="max-w-7xl mx-auto p-6">
      <!-- Header -->
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-gray-900">Execution History</h2>
        <p class="text-sm text-gray-600 mt-1">
          Monitor and analyze workflow execution results
        </p>
      </div>

      <!-- Filters -->
      <div class="mb-6 card">
        <div class="flex flex-col lg:flex-row gap-4">
          <!-- Search -->
          <div class="flex-1 relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by workflow name or execution ID..."
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

          <!-- Status Filter -->
          <select
            v-model="filterStatus"
            class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
            <option value="running">Running</option>
            <option value="waiting">Waiting</option>
            <option value="canceled">Canceled</option>
          </select>

          <!-- Mode Filter -->
          <select
            v-model="filterMode"
            class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Modes</option>
            <option value="manual">Manual</option>
            <option value="trigger">Trigger</option>
            <option value="webhook">Webhook</option>
            <option value="scheduled">Scheduled</option>
          </select>

          <!-- Date Range -->
          <select
            v-model="dateRange"
            class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="card">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600 mb-1">Total Executions</p>
              <p class="text-2xl font-bold text-gray-900">{{ stats.total }}</p>
            </div>
            <div class="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600 mb-1">Successful</p>
              <p class="text-2xl font-bold text-green-600">{{ stats.success }}</p>
            </div>
            <div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600 mb-1">Failed</p>
              <p class="text-2xl font-bold text-red-600">{{ stats.error }}</p>
            </div>
            <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-600 mb-1">Avg Duration</p>
              <p class="text-2xl font-bold text-gray-900">{{ stats.avgDuration }}s</p>
            </div>
            <div class="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- Executions Table -->
      <div class="card overflow-hidden">
        <div v-if="filteredExecutions.length === 0" class="text-center py-12">
          <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">No executions found</h3>
          <p class="text-gray-600">
            {{ searchQuery ? 'Try adjusting your search criteria' : 'Workflow executions will appear here' }}
          </p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Execution
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Workflow
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mode
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Started
                </th>
                <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr
                v-for="execution in paginatedExecutions"
                :key="execution.id"
                class="hover:bg-gray-50 cursor-pointer transition-colors"
                @click="viewExecutionDetails(execution.id)"
              >
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="text-sm font-mono text-gray-900">
                      #{{ execution.id.substring(0, 8) }}
                    </div>
                  </div>
                </td>

                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm font-medium text-gray-900">
                    {{ execution.workflowName }}
                  </div>
                </td>

                <td class="px-6 py-4 whitespace-nowrap">
                  <span
                    class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full"
                    :class="getStatusClass(execution.status)"
                  >
                    {{ execution.status }}
                  </span>
                </td>

                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded capitalize">
                    {{ execution.mode }}
                  </span>
                </td>

                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {{ formatDuration(execution.duration) }}
                </td>

                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {{ formatTimestamp(execution.startTime) }}
                </td>

                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    @click.stop="retryExecution(execution.id)"
                    v-if="execution.status === 'error'"
                    class="text-primary-600 hover:text-primary-900 mr-3"
                    title="Retry execution"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  <button
                    @click.stop="viewExecutionDetails(execution.id)"
                    class="text-gray-400 hover:text-gray-600"
                    title="View details"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="filteredExecutions.length > 0" class="mt-6 flex items-center justify-between">
        <p class="text-sm text-gray-600">
          Showing {{ startIndex + 1 }}-{{ Math.min(endIndex, filteredExecutions.length) }} of {{ filteredExecutions.length }} executions
        </p>
        <div class="flex space-x-2">
          <button
            @click="previousPage"
            :disabled="currentPage === 1"
            class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <div class="flex items-center space-x-1">
            <button
              v-for="page in displayedPages"
              :key="page"
              @click="goToPage(page)"
              class="px-3 py-2 text-sm border rounded-lg transition-colors"
              :class="
                currentPage === page
                  ? 'border-primary-500 bg-primary-50 text-primary-600'
                  : 'border-gray-300 hover:bg-gray-50'
              "
            >
              {{ page }}
            </button>
          </div>
          <button
            @click="nextPage"
            :disabled="currentPage === totalPages"
            class="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>

    <!-- Execution Details Modal -->
    <div
      v-if="selectedExecution"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      @click="selectedExecution = null"
    >
      <div
        class="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-auto"
        @click.stop
      >
        <div class="p-6">
          <!-- Header -->
          <div class="flex items-start justify-between mb-6">
            <div class="flex-1">
              <h3 class="text-xl font-bold text-gray-900">Execution Details</h3>
              <p class="text-sm text-gray-600 mt-1">
                {{ selectedExecution.workflowName }} • #{{ selectedExecution.id.substring(0, 8) }}
              </p>
            </div>
            <button
              @click="selectedExecution = null"
              class="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Summary -->
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div>
              <p class="text-xs text-gray-600 mb-1">Status</p>
              <span
                class="px-2 py-1 text-xs font-semibold rounded-full inline-block"
                :class="getStatusClass(selectedExecution.status)"
              >
                {{ selectedExecution.status }}
              </span>
            </div>
            <div>
              <p class="text-xs text-gray-600 mb-1">Mode</p>
              <p class="text-sm font-medium text-gray-900 capitalize">{{ selectedExecution.mode }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-600 mb-1">Duration</p>
              <p class="text-sm font-medium text-gray-900">{{ formatDuration(selectedExecution.duration) }}</p>
            </div>
            <div>
              <p class="text-xs text-gray-600 mb-1">Started</p>
              <p class="text-sm font-medium text-gray-900">{{ formatTimestamp(selectedExecution.startTime) }}</p>
            </div>
          </div>

          <!-- Timeline -->
          <div class="mb-6">
            <h4 class="text-lg font-semibold text-gray-900 mb-4">Execution Timeline</h4>
            <div class="space-y-4">
              <div
                v-for="(nodeResult, index) in selectedExecution.nodeResults"
                :key="nodeResult.nodeId"
                class="relative"
              >
                <!-- Timeline line -->
                <div
                  v-if="index < (selectedExecution.nodeResults?.length || 0) - 1"
                  class="absolute left-4 top-10 w-0.5 h-full bg-gray-200"
                  :class="{
                    'bg-green-200': nodeResult.status === 'success',
                    'bg-red-200': nodeResult.status === 'error',
                    'bg-gray-200': nodeResult.status === 'skipped'
                  }"
                />

                <div class="flex items-start">
                  <!-- Status Icon -->
                  <div
                    class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center relative z-10"
                    :class="{
                      'bg-green-100': nodeResult.status === 'success',
                      'bg-red-100': nodeResult.status === 'error',
                      'bg-gray-100': nodeResult.status === 'skipped'
                    }"
                  >
                    <svg
                      v-if="nodeResult.status === 'success'"
                      class="w-5 h-5 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <svg
                      v-else-if="nodeResult.status === 'error'"
                      class="w-5 h-5 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <svg
                      v-else
                      class="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                    </svg>
                  </div>

                  <!-- Node Details -->
                  <div class="ml-4 flex-1 pb-6">
                    <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div class="flex items-start justify-between mb-2">
                        <div>
                          <h5 class="font-semibold text-gray-900">{{ nodeResult.nodeName }}</h5>
                          <p class="text-xs text-gray-500 mt-1">
                            {{ nodeResult.nodeId }}
                            <span v-if="nodeResult.duration"> • {{ nodeResult.duration }}s</span>
                          </p>
                        </div>
                        <span
                          class="px-2 py-1 text-xs font-medium rounded-full"
                          :class="{
                            'bg-green-100 text-green-700': nodeResult.status === 'success',
                            'bg-red-100 text-red-700': nodeResult.status === 'error',
                            'bg-gray-100 text-gray-700': nodeResult.status === 'skipped'
                          }"
                        >
                          {{ nodeResult.status }}
                        </span>
                      </div>

                      <!-- Error Message -->
                      <div v-if="nodeResult.error" class="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                        <p class="text-sm text-red-700">
                          <strong>Error:</strong> {{ nodeResult.error }}
                        </p>
                      </div>

                      <!-- Input/Output Data -->
                      <div v-if="nodeResult.status !== 'skipped'" class="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div v-if="nodeResult.input">
                          <p class="text-xs font-medium text-gray-700 mb-1">Input</p>
                          <pre class="text-xs bg-gray-50 border border-gray-200 rounded p-2 overflow-x-auto">{{ JSON.stringify(nodeResult.input, null, 2) }}</pre>
                        </div>
                        <div v-if="nodeResult.output">
                          <p class="text-xs font-medium text-gray-700 mb-1">Output</p>
                          <pre class="text-xs bg-gray-50 border border-gray-200 rounded p-2 overflow-x-auto">{{ JSON.stringify(nodeResult.output, null, 2) }}</pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Execution Data -->
          <div class="mb-6">
            <h4 class="text-lg font-semibold text-gray-900 mb-4">Execution Data</h4>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <p class="text-sm font-medium text-gray-700 mb-2">Input Data</p>
                <pre class="text-xs bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto max-h-48">{{ selectedExecution.inputData ? JSON.stringify(selectedExecution.inputData, null, 2) : 'No input data' }}</pre>
              </div>
              <div>
                <p class="text-sm font-medium text-gray-700 mb-2">Output Data</p>
                <pre class="text-xs bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto max-h-48">{{ selectedExecution.outputData ? JSON.stringify(selectedExecution.outputData, null, 2) : 'No output data' }}</pre>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              v-if="selectedExecution.status === 'error'"
              @click="retryExecution(selectedExecution.id); selectedExecution = null"
              class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry Execution
            </button>
            <div v-else />
            <button
              @click="selectedExecution = null"
              class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
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

interface NodeResult {
  nodeId: string;
  nodeName: string;
  status: 'success' | 'error' | 'skipped';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  input?: any;
  output?: any;
  error?: string;
}

interface Execution {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'success' | 'error' | 'running' | 'waiting' | 'canceled';
  mode: 'manual' | 'trigger' | 'webhook' | 'scheduled';
  startTime: Date;
  endTime?: Date;
  duration?: number; // in seconds
  nodeResults?: NodeResult[];
  inputData?: any;
  outputData?: any;
}

const router = useRouter();

// State
const searchQuery = ref('');
const filterStatus = ref('all');
const filterMode = ref('all');
const dateRange = ref('month');
const currentPage = ref(1);
const itemsPerPage = 20;
const selectedExecution = ref<Execution | null>(null);

// Mock executions data (in real app, fetch from API)
const executions = ref<Execution[]>([
  {
    id: 'exec_001',
    workflowId: '1',
    workflowName: 'Customer Onboarding',
    status: 'success',
    mode: 'webhook',
    startTime: new Date('2024-02-21T10:30:00'),
    endTime: new Date('2024-02-21T10:30:45'),
    duration: 45
  },
  {
    id: 'exec_002',
    workflowId: '2',
    workflowName: 'Daily Report Generator',
    status: 'success',
    mode: 'scheduled',
    startTime: new Date('2024-02-21T08:00:00'),
    endTime: new Date('2024-02-21T08:02:15'),
    duration: 135
  },
  {
    id: 'exec_003',
    workflowId: '5',
    workflowName: 'Support Ticket Routing',
    status: 'success',
    mode: 'trigger',
    startTime: new Date('2024-02-21T15:45:00'),
    endTime: new Date('2024-02-21T15:45:12'),
    duration: 12
  },
  {
    id: 'exec_004',
    workflowId: '3',
    workflowName: 'Lead Qualification',
    status: 'error',
    mode: 'manual',
    startTime: new Date('2024-02-19T14:22:00'),
    endTime: new Date('2024-02-19T14:22:38'),
    duration: 38
  },
  {
    id: 'exec_005',
    workflowId: '1',
    workflowName: 'Customer Onboarding',
    status: 'success',
    mode: 'webhook',
    startTime: new Date('2024-02-20T16:15:00'),
    endTime: new Date('2024-02-20T16:15:52'),
    duration: 52
  },
  {
    id: 'exec_006',
    workflowId: '2',
    workflowName: 'Daily Report Generator',
    status: 'success',
    mode: 'scheduled',
    startTime: new Date('2024-02-20T08:00:00'),
    endTime: new Date('2024-02-20T08:02:08'),
    duration: 128
  },
  {
    id: 'exec_007',
    workflowId: '5',
    workflowName: 'Support Ticket Routing',
    status: 'running',
    mode: 'trigger',
    startTime: new Date('2024-02-21T16:30:00')
  },
  {
    id: 'exec_008',
    workflowId: '1',
    workflowName: 'Customer Onboarding',
    status: 'canceled',
    mode: 'manual',
    startTime: new Date('2024-02-18T11:20:00'),
    endTime: new Date('2024-02-18T11:20:15'),
    duration: 15
  }
]);

// Computed
const filteredExecutions = computed(() => {
  let filtered = executions.value;

  // Filter by status
  if (filterStatus.value !== 'all') {
    filtered = filtered.filter(e => e.status === filterStatus.value);
  }

  // Filter by mode
  if (filterMode.value !== 'all') {
    filtered = filtered.filter(e => e.mode === filterMode.value);
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(e =>
      e.id.toLowerCase().includes(query) ||
      e.workflowName.toLowerCase().includes(query)
    );
  }

  // Filter by date range
  const now = new Date();
  if (dateRange.value !== 'all') {
    filtered = filtered.filter(e => {
      const diff = now.getTime() - e.startTime.getTime();
      const days = diff / (1000 * 60 * 60 * 24);

      if (dateRange.value === 'today') return days < 1;
      if (dateRange.value === 'week') return days < 7;
      if (dateRange.value === 'month') return days < 30;
      return true;
    });
  }

  // Sort by start time (newest first)
  return filtered.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
});

const stats = computed(() => {
  const total = filteredExecutions.value.length;
  const success = filteredExecutions.value.filter(e => e.status === 'success').length;
  const error = filteredExecutions.value.filter(e => e.status === 'error').length;
  const durations = filteredExecutions.value
    .filter(e => e.duration)
    .map(e => e.duration as number);
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;

  return { total, success, error, avgDuration };
});

// Pagination
const totalPages = computed(() => Math.ceil(filteredExecutions.value.length / itemsPerPage));
const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage);
const endIndex = computed(() => startIndex.value + itemsPerPage);
const paginatedExecutions = computed(() =>
  filteredExecutions.value.slice(startIndex.value, endIndex.value)
);

const displayedPages = computed(() => {
  const pages = [];
  const maxPages = 5;
  let start = Math.max(1, currentPage.value - Math.floor(maxPages / 2));
  let end = Math.min(totalPages.value, start + maxPages - 1);

  if (end - start < maxPages - 1) {
    start = Math.max(1, end - maxPages + 1);
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return pages;
});

// Actions
async function viewExecutionDetails(id: string) {
  const execution = executions.value.find(e => e.id === id);
  if (!execution) return;

  // In real app, fetch detailed execution data from API
  // For now, add mock node results
  if (!execution.nodeResults) {
    execution.nodeResults = [
      {
        nodeId: 'node_1',
        nodeName: 'Start',
        status: 'success',
        startTime: execution.startTime,
        endTime: new Date(execution.startTime.getTime() + 2000),
        duration: 2,
        input: { trigger: 'manual' },
        output: { status: 'started', timestamp: execution.startTime.toISOString() }
      },
      {
        nodeId: 'node_2',
        nodeName: 'Fetch Data',
        status: execution.status === 'error' ? 'error' : 'success',
        startTime: new Date(execution.startTime.getTime() + 2000),
        endTime: new Date(execution.startTime.getTime() + 8000),
        duration: 6,
        input: { source: 'database', query: 'SELECT * FROM customers' },
        output: execution.status === 'error' ? null : { records: 42, data: '[...]' },
        error: execution.status === 'error' ? 'Connection timeout: Could not connect to database' : undefined
      },
      {
        nodeId: 'node_3',
        nodeName: 'Process Data',
        status: execution.status === 'error' ? 'skipped' : 'success',
        startTime: new Date(execution.startTime.getTime() + 8000),
        endTime: execution.status === 'error' ? undefined : new Date(execution.startTime.getTime() + 15000),
        duration: execution.status === 'error' ? undefined : 7,
        input: execution.status === 'error' ? null : { records: 42 },
        output: execution.status === 'error' ? null : { processed: 42, filtered: 38 }
      },
      {
        nodeId: 'node_4',
        nodeName: 'Send Email',
        status: execution.status === 'error' ? 'skipped' : 'success',
        startTime: new Date(execution.startTime.getTime() + 15000),
        endTime: execution.status === 'error' ? undefined : execution.endTime,
        duration: execution.status === 'error' ? undefined : (execution.duration || 0) - 15,
        input: execution.status === 'error' ? null : { to: 'admin@example.com', subject: 'Processing Complete' },
        output: execution.status === 'error' ? null : { sent: true, messageId: 'msg_12345' }
      }
    ];
    execution.inputData = { trigger: 'manual', timestamp: execution.startTime.toISOString() };
    execution.outputData = execution.status === 'error' ? null : { success: true, recordsProcessed: 38 };
  }

  selectedExecution.value = execution;
}

async function retryExecution(id: string) {
  try {
    // In real app, call API to retry
    console.log('Retrying execution:', id);
    showNotification('Execution retry initiated', 'success');
  } catch (error) {
    showNotification('Failed to retry execution', 'error');
  }
}

function previousPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
}

function goToPage(page: number) {
  currentPage.value = page;
}

// Helper functions
function getStatusClass(status: string): string {
  const classes = {
    success: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    running: 'bg-yellow-100 text-yellow-800',
    waiting: 'bg-blue-100 text-blue-800',
    canceled: 'bg-gray-100 text-gray-800'
  };
  return classes[status as keyof typeof classes] || classes.waiting;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '-';

  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info') {
  // In real app, use proper notification system
  console.log(`[${type.toUpperCase()}] ${message}`);
}
</script>

<style scoped>
/* Additional styles if needed */
</style>

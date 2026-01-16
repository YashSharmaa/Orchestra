<!--
  Orchestra © 2025
  Author: Orchestra Team
  License: Apache-2.0
  Description: Node library panel with searchable and draggable nodes
-->

<template>
  <div class="node-library h-full flex flex-col bg-white border-r border-gray-200">
    <!-- Header -->
    <div class="px-4 py-3 border-b border-gray-200">
      <h3 class="text-sm font-semibold text-gray-900 mb-2">Node Library</h3>

      <!-- Search -->
      <div class="relative">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search nodes..."
          class="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <svg
          class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
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
    </div>

    <!-- Category Tabs -->
    <div class="px-4 py-2 border-b border-gray-200 flex space-x-1 overflow-x-auto scrollbar-thin">
      <button
        v-for="category in categories"
        :key="category.id"
        @click="selectedCategory = category.id"
        class="px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors"
        :class="
          selectedCategory === category.id
            ? 'bg-primary-100 text-primary-700'
            : 'text-gray-600 hover:bg-gray-100'
        "
      >
        {{ category.name }}
      </button>
    </div>

    <!-- Node List -->
    <div class="flex-1 overflow-y-auto scrollbar-thin">
      <div v-if="filteredNodes.length === 0" class="p-4 text-center text-sm text-gray-500">
        No nodes found
      </div>

      <div v-else class="p-2 space-y-1">
        <div
          v-for="node in filteredNodes"
          :key="node.name"
          class="node-item p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 cursor-move transition-all duration-200 group"
          :draggable="true"
          @dragstart="handleDragStart($event, node)"
          @dragend="handleDragEnd"
        >
          <div class="flex items-start space-x-3">
            <!-- Icon -->
            <div
              class="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0 transition-transform group-hover:scale-110"
              :style="{ backgroundColor: node.color || '#0284c7' }"
            >
              {{ getNodeIcon(node.name) }}
            </div>

            <!-- Content -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-1">
                <h4 class="text-sm font-semibold text-gray-900 truncate">
                  {{ node.displayName }}
                </h4>
                <span
                  class="text-xs px-2 py-0.5 rounded-full"
                  :class="getCategoryBadgeClass(node.group[0])"
                >
                  {{ node.group[0] }}
                </span>
              </div>
              <p class="text-xs text-gray-600 line-clamp-2">
                {{ node.description }}
              </p>

              <!-- Tags -->
              <div v-if="node.group.length > 1" class="mt-2 flex flex-wrap gap-1">
                <span
                  v-for="tag in node.group.slice(1)"
                  :key="tag"
                  class="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Info -->
    <div class="px-4 py-2 border-t border-gray-200 bg-gray-50">
      <p class="text-xs text-gray-600">
        {{ filteredNodes.length }} node{{ filteredNodes.length !== 1 ? 's' : '' }} available
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface NodeType {
  name: string;
  displayName: string;
  group: string[];
  version: number;
  description: string;
  color?: string;
  defaults: {
    name: string;
    color?: string;
  };
  inputs: string[];
  outputs: string[];
  properties: any[];
}

const emit = defineEmits<{
  (e: 'nodeSelected', nodeType: string): void;
}>();

// Search and filter state
const searchQuery = ref('');
const selectedCategory = ref('all');

// Categories
const categories = [
  { id: 'all', name: 'All' },
  { id: 'trigger', name: 'Triggers' },
  { id: 'action', name: 'Actions' },
  { id: 'transform', name: 'Transform' },
  { id: 'logic', name: 'Logic' },
  { id: 'ai', name: 'AI' },
  { id: 'database', name: 'Database' },
  { id: 'integration', name: 'Integration' },
];

// Node types (mock data - in real app, fetch from API)
const nodeTypes = ref<NodeType[]>([
  {
    name: 'webhook',
    displayName: 'Webhook',
    group: ['trigger'],
    version: 1,
    description: 'Listen for incoming webhook requests from external services',
    color: '#10b981',
    defaults: { name: 'Webhook' },
    inputs: [],
    outputs: ['main'],
    properties: []
  },
  {
    name: 'schedule',
    displayName: 'Schedule',
    group: ['trigger'],
    version: 1,
    description: 'Trigger workflow on a schedule using cron expressions',
    color: '#8b5cf6',
    defaults: { name: 'Schedule' },
    inputs: [],
    outputs: ['main'],
    properties: []
  },
  {
    name: 'httpRequest',
    displayName: 'HTTP Request',
    group: ['action', 'integration'],
    version: 1,
    description: 'Make HTTP requests to any API endpoint',
    color: '#0284c7',
    defaults: { name: 'HTTP Request' },
    inputs: ['main'],
    outputs: ['main'],
    properties: []
  },
  {
    name: 'sendEmail',
    displayName: 'Send Email',
    group: ['action', 'notification'],
    version: 1,
    description: 'Send email messages via SMTP or email service providers',
    color: '#ef4444',
    defaults: { name: 'Send Email' },
    inputs: ['main'],
    outputs: ['main'],
    properties: []
  },
  {
    name: 'if',
    displayName: 'If',
    group: ['logic'],
    version: 1,
    description: 'Route workflow based on conditional logic',
    color: '#f59e0b',
    defaults: { name: 'If' },
    inputs: ['main'],
    outputs: ['true', 'false'],
    properties: []
  },
  {
    name: 'switch',
    displayName: 'Switch',
    group: ['logic'],
    version: 1,
    description: 'Route to different paths based on multiple conditions',
    color: '#f97316',
    defaults: { name: 'Switch' },
    inputs: ['main'],
    outputs: ['output1', 'output2', 'output3'],
    properties: []
  },
  {
    name: 'set',
    displayName: 'Set',
    group: ['transform'],
    version: 1,
    description: 'Set, add, or modify data properties',
    color: '#06b6d4',
    defaults: { name: 'Set' },
    inputs: ['main'],
    outputs: ['main'],
    properties: []
  },
  {
    name: 'filter',
    displayName: 'Filter',
    group: ['transform'],
    version: 1,
    description: 'Filter items based on conditions',
    color: '#14b8a6',
    defaults: { name: 'Filter' },
    inputs: ['main'],
    outputs: ['main'],
    properties: []
  },
  {
    name: 'database',
    displayName: 'Database',
    group: ['database', 'integration'],
    version: 1,
    description: 'Execute SQL queries on various database systems',
    color: '#6366f1',
    defaults: { name: 'Database' },
    inputs: ['main'],
    outputs: ['main'],
    properties: []
  },
  {
    name: 'code',
    displayName: 'Code',
    group: ['transform', 'logic'],
    version: 1,
    description: 'Execute custom JavaScript or Python code',
    color: '#64748b',
    defaults: { name: 'Code' },
    inputs: ['main'],
    outputs: ['main'],
    properties: []
  },
  {
    name: 'merge',
    displayName: 'Merge',
    group: ['transform'],
    version: 1,
    description: 'Merge data from multiple branches',
    color: '#0891b2',
    defaults: { name: 'Merge' },
    inputs: ['main', 'secondary'],
    outputs: ['main'],
    properties: []
  },
  {
    name: 'splitInBatches',
    displayName: 'Split In Batches',
    group: ['transform'],
    version: 1,
    description: 'Process items in batches for better performance',
    color: '#0ea5e9',
    defaults: { name: 'Split In Batches' },
    inputs: ['main'],
    outputs: ['main'],
    properties: []
  },
  {
    name: 'ai-agent',
    displayName: 'AI Agent',
    group: ['ai'],
    version: 1,
    description: 'Execute AI agent with tools and memory',
    color: '#ec4899',
    defaults: { name: 'AI Agent' },
    inputs: ['main'],
    outputs: ['main'],
    properties: []
  },
  {
    name: 'llm-chat',
    displayName: 'LLM Chat',
    group: ['ai'],
    version: 1,
    description: 'Chat with language models like GPT-4 or Claude',
    color: '#d946ef',
    defaults: { name: 'LLM Chat' },
    inputs: ['main'],
    outputs: ['main'],
    properties: []
  },
]);

// Computed filtered nodes
const filteredNodes = computed(() => {
  let filtered = nodeTypes.value;

  // Filter by category
  if (selectedCategory.value !== 'all') {
    filtered = filtered.filter(node =>
      node.group.includes(selectedCategory.value)
    );
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(node =>
      node.displayName.toLowerCase().includes(query) ||
      node.description.toLowerCase().includes(query) ||
      node.group.some(g => g.toLowerCase().includes(query))
    );
  }

  return filtered;
});

// Helper functions
function getNodeIcon(nodeName: string): string {
  const iconMap: Record<string, string> = {
    webhook: 'W',
    schedule: 'S',
    httpRequest: 'H',
    sendEmail: 'E',
    if: 'IF',
    switch: 'SW',
    set: 'SET',
    filter: 'F',
    database: 'DB',
    code: '<>',
    merge: 'M',
    splitInBatches: 'SB',
    'ai-agent': 'AI',
    'llm-chat': 'LC',
  };

  return iconMap[nodeName] || nodeName.substring(0, 2).toUpperCase();
}

function getCategoryBadgeClass(category: string): string {
  const classMap: Record<string, string> = {
    trigger: 'bg-green-100 text-green-700',
    action: 'bg-blue-100 text-blue-700',
    transform: 'bg-cyan-100 text-cyan-700',
    logic: 'bg-orange-100 text-orange-700',
    ai: 'bg-pink-100 text-pink-700',
    database: 'bg-indigo-100 text-indigo-700',
    integration: 'bg-purple-100 text-purple-700',
    notification: 'bg-red-100 text-red-700',
  };

  return classMap[category] || 'bg-gray-100 text-gray-700';
}

// Drag and drop handlers
function handleDragStart(e: DragEvent, node: NodeType) {
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('nodeType', node.name);
    e.dataTransfer.setData('nodeData', JSON.stringify(node));
  }

  emit('nodeSelected', node.name);
}

function handleDragEnd(e: DragEvent) {
  // Clean up after drag
  if (e.dataTransfer) {
    e.dataTransfer.clearData();
  }
}

// Public API for fetching nodes (can be called from parent)
defineExpose({
  refreshNodes: async () => {
    // In real app, fetch from API
    // nodeTypes.value = await fetchNodesFromAPI();
  }
});
</script>

<style scoped>
.node-item {
  transition: all 0.2s ease;
}

.node-item:active {
  cursor: grabbing;
  opacity: 0.8;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>

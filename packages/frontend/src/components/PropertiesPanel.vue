<!--
  Orchestra © 2025
  Author: Orchestra Team
  License: Apache-2.0
  Description: Properties panel for editing node configuration
-->

<template>
  <div class="properties-panel h-full flex flex-col bg-white border-l border-gray-200">
    <!-- No Selection State -->
    <div v-if="!selectedNode" class="flex-1 flex items-center justify-center p-6">
      <div class="text-center">
        <svg class="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p class="text-sm text-gray-500">Select a node to view properties</p>
      </div>
    </div>

    <!-- Node Properties -->
    <div v-else class="flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-semibold text-gray-900">Node Properties</h3>
          <button
            @click="closePanel"
            class="p-1 hover:bg-gray-200 rounded transition-colors"
            title="Close"
          >
            <svg class="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Node Info -->
        <div class="flex items-center space-x-3">
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            :style="{ backgroundColor: getNodeColor(selectedNode.type) }"
          >
            {{ getNodeIcon(selectedNode.type) }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-900 truncate">{{ selectedNode.name }}</div>
            <div class="text-xs text-gray-500">{{ selectedNode.type }}</div>
          </div>
        </div>
      </div>

      <!-- Form -->
      <div class="flex-1 overflow-y-auto scrollbar-thin">
        <form @submit.prevent="handleSave" class="p-4 space-y-4">
          <!-- Node Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Node Name
            </label>
            <input
              v-model="localNode.name"
              type="text"
              class="input"
              placeholder="Enter node name"
            />
          </div>

          <!-- Node Type Properties -->
          <div v-if="nodeTypeProperties.length > 0" class="space-y-4">
            <div class="border-t border-gray-200 pt-4">
              <h4 class="text-sm font-semibold text-gray-900 mb-3">Configuration</h4>

              <div
                v-for="property in nodeTypeProperties"
                :key="property.name"
                class="mb-4"
              >
                <!-- String Input -->
                <div v-if="property.type === 'string'">
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    {{ property.displayName }}
                    <span v-if="property.required" class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="localNode.parameters[property.name]"
                    type="text"
                    class="input"
                    :placeholder="property.placeholder || property.description"
                  />
                  <p v-if="property.description" class="text-xs text-gray-500 mt-1">
                    {{ property.description }}
                  </p>
                </div>

                <!-- Number Input -->
                <div v-else-if="property.type === 'number'">
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    {{ property.displayName }}
                    <span v-if="property.required" class="text-red-500">*</span>
                  </label>
                  <input
                    v-model.number="localNode.parameters[property.name]"
                    type="number"
                    class="input"
                    :placeholder="property.placeholder"
                    :min="property.typeOptions?.minValue"
                    :max="property.typeOptions?.maxValue"
                  />
                  <p v-if="property.description" class="text-xs text-gray-500 mt-1">
                    {{ property.description }}
                  </p>
                </div>

                <!-- Boolean Checkbox -->
                <div v-else-if="property.type === 'boolean'" class="flex items-center">
                  <input
                    v-model="localNode.parameters[property.name]"
                    type="checkbox"
                    :id="`prop-${property.name}`"
                    class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label :for="`prop-${property.name}`" class="ml-2 text-sm text-gray-700">
                    {{ property.displayName }}
                  </label>
                  <p v-if="property.description" class="text-xs text-gray-500 ml-2">
                    ({{ property.description }})
                  </p>
                </div>

                <!-- Options Select -->
                <div v-else-if="property.type === 'options'">
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    {{ property.displayName }}
                    <span v-if="property.required" class="text-red-500">*</span>
                  </label>
                  <select
                    v-model="localNode.parameters[property.name]"
                    class="input"
                  >
                    <option value="">Select...</option>
                    <option
                      v-for="option in property.options"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.name }}
                    </option>
                  </select>
                  <p v-if="property.description" class="text-xs text-gray-500 mt-1">
                    {{ property.description }}
                  </p>
                </div>

                <!-- JSON Editor -->
                <div v-else-if="property.type === 'json'">
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    {{ property.displayName }}
                    <span v-if="property.required" class="text-red-500">*</span>
                  </label>
                  <textarea
                    v-model="localNode.parameters[property.name]"
                    rows="4"
                    class="input font-mono text-sm"
                    :placeholder="property.placeholder || getJsonPlaceholder()"
                  />
                  <p v-if="property.description" class="text-xs text-gray-500 mt-1">
                    {{ property.description }}
                  </p>
                </div>

                <!-- Fallback for other types -->
                <div v-else>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    {{ property.displayName }}
                    <span v-if="property.required" class="text-red-500">*</span>
                  </label>
                  <input
                    v-model="localNode.parameters[property.name]"
                    type="text"
                    class="input"
                    :placeholder="property.placeholder || property.description"
                  />
                  <p v-if="property.description" class="text-xs text-gray-500 mt-1">
                    {{ property.description }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Advanced Settings -->
          <div class="border-t border-gray-200 pt-4">
            <button
              type="button"
              @click="showAdvanced = !showAdvanced"
              class="flex items-center justify-between w-full text-sm font-semibold text-gray-900 mb-3"
            >
              <span>Advanced Settings</span>
              <svg
                class="w-4 h-4 transition-transform"
                :class="{ 'rotate-180': showAdvanced }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div v-show="showAdvanced" class="space-y-4">
              <!-- Retry on Fail -->
              <div class="flex items-center">
                <input
                  v-model="localNode.retryOnFail"
                  type="checkbox"
                  id="retry-on-fail"
                  class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label for="retry-on-fail" class="ml-2 text-sm text-gray-700">
                  Retry on fail
                </label>
              </div>

              <!-- Max Retries -->
              <div v-if="localNode.retryOnFail">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Max Retries
                </label>
                <input
                  v-model.number="localNode.maxRetries"
                  type="number"
                  class="input"
                  min="1"
                  max="10"
                />
              </div>

              <!-- Wait Between Retries -->
              <div v-if="localNode.retryOnFail">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Wait Between Retries (ms)
                </label>
                <input
                  v-model.number="localNode.waitBetweenRetries"
                  type="number"
                  class="input"
                  min="0"
                  step="100"
                />
              </div>

              <!-- Always Output Data -->
              <div class="flex items-center">
                <input
                  v-model="localNode.alwaysOutputData"
                  type="checkbox"
                  id="always-output"
                  class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label for="always-output" class="ml-2 text-sm text-gray-700">
                  Always output data
                </label>
              </div>

              <!-- Execute Once -->
              <div class="flex items-center">
                <input
                  v-model="localNode.executeOnce"
                  type="checkbox"
                  id="execute-once"
                  class="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <label for="execute-once" class="ml-2 text-sm text-gray-700">
                  Execute only once
                </label>
              </div>

              <!-- Notes -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  v-model="localNode.notes"
                  rows="3"
                  class="input"
                  placeholder="Add notes about this node..."
                />
              </div>
            </div>
          </div>
        </form>
      </div>

      <!-- Footer Actions -->
      <div class="px-4 py-3 border-t border-gray-200 bg-gray-50 flex justify-between">
        <button
          type="button"
          @click="handleDelete"
          class="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          Delete Node
        </button>
        <div class="flex space-x-2">
          <button
            type="button"
            @click="handleReset"
            class="btn-secondary"
          >
            Reset
          </button>
          <button
            type="button"
            @click="handleSave"
            class="btn-primary"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';

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

interface NodeProperty {
  displayName: string;
  name: string;
  type: string;
  default: any;
  required?: boolean;
  description?: string;
  placeholder?: string;
  options?: Array<{ name: string; value: any; description?: string }>;
  typeOptions?: {
    minValue?: number;
    maxValue?: number;
    rows?: number;
  };
}

interface Props {
  selectedNode: Node | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', node: Node): void;
  (e: 'delete', nodeId: string): void;
  (e: 'close'): void;
}>();

// Local state
const localNode = ref<Node | null>(null);
const showAdvanced = ref(false);

// Mock node type properties (in real app, fetch from node registry)
const nodeTypePropertiesMap: Record<string, NodeProperty[]> = {
  httpRequest: [
    {
      displayName: 'Method',
      name: 'method',
      type: 'options',
      default: 'GET',
      required: true,
      description: 'HTTP method to use',
      options: [
        { name: 'GET', value: 'GET' },
        { name: 'POST', value: 'POST' },
        { name: 'PUT', value: 'PUT' },
        { name: 'DELETE', value: 'DELETE' },
        { name: 'PATCH', value: 'PATCH' },
      ]
    },
    {
      displayName: 'URL',
      name: 'url',
      type: 'string',
      default: '',
      required: true,
      description: 'The URL to make the request to',
      placeholder: 'https://api.example.com/endpoint'
    },
    {
      displayName: 'Body',
      name: 'body',
      type: 'json',
      default: '',
      description: 'Request body (JSON format)',
      placeholder: '{\n  "key": "value"\n}'
    }
  ],
  sendEmail: [
    {
      displayName: 'To',
      name: 'to',
      type: 'string',
      default: '',
      required: true,
      description: 'Email recipient address',
      placeholder: 'recipient@example.com'
    },
    {
      displayName: 'Subject',
      name: 'subject',
      type: 'string',
      default: '',
      required: true,
      description: 'Email subject line',
      placeholder: 'Your subject here'
    },
    {
      displayName: 'Body',
      name: 'body',
      type: 'string',
      default: '',
      required: true,
      description: 'Email body content',
      placeholder: 'Your message here'
    }
  ],
  if: [
    {
      displayName: 'Condition',
      name: 'condition',
      type: 'string',
      default: '',
      required: true,
      description: 'Condition to evaluate (e.g., $json.status === "active")',
      placeholder: '$json.value > 100'
    }
  ],
  set: [
    {
      displayName: 'Values',
      name: 'values',
      type: 'json',
      default: '{}',
      required: true,
      description: 'Key-value pairs to set',
      placeholder: '{\n  "newKey": "newValue"\n}'
    }
  ],
  filter: [
    {
      displayName: 'Condition',
      name: 'condition',
      type: 'string',
      default: '',
      required: true,
      description: 'Filter condition',
      placeholder: '$json.status === "active"'
    }
  ],
  schedule: [
    {
      displayName: 'Cron Expression',
      name: 'cronExpression',
      type: 'string',
      default: '0 0 * * *',
      required: true,
      description: 'Cron expression for schedule',
      placeholder: '0 0 * * *'
    }
  ],
  database: [
    {
      displayName: 'Operation',
      name: 'operation',
      type: 'options',
      default: 'select',
      required: true,
      description: 'Database operation to perform',
      options: [
        { name: 'Select', value: 'select' },
        { name: 'Insert', value: 'insert' },
        { name: 'Update', value: 'update' },
        { name: 'Delete', value: 'delete' },
      ]
    },
    {
      displayName: 'Query',
      name: 'query',
      type: 'string',
      default: '',
      required: true,
      description: 'SQL query to execute',
      placeholder: 'SELECT * FROM users WHERE active = true'
    }
  ]
};

const nodeTypeProperties = computed(() => {
  if (!localNode.value) return [];
  return nodeTypePropertiesMap[localNode.value.type] || [];
});

// Watch for changes in selected node
watch(
  () => props.selectedNode,
  (newNode) => {
    if (newNode) {
      // Deep clone to avoid mutating prop
      localNode.value = JSON.parse(JSON.stringify(newNode));

      // Initialize parameters with defaults if not set
      nodeTypeProperties.value.forEach(prop => {
        if (!(prop.name in localNode.value!.parameters)) {
          localNode.value!.parameters[prop.name] = prop.default;
        }
      });
    } else {
      localNode.value = null;
    }
    showAdvanced.value = false;
  },
  { immediate: true }
);

// Helper functions
function getNodeIcon(type: string): string {
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
  };
  return iconMap[type] || type.substring(0, 2).toUpperCase();
}

function getNodeColor(type: string): string {
  const colorMap: Record<string, string> = {
    webhook: '#10b981',
    schedule: '#8b5cf6',
    httpRequest: '#0284c7',
    sendEmail: '#ef4444',
    if: '#f59e0b',
    switch: '#f97316',
    set: '#06b6d4',
    filter: '#14b8a6',
    database: '#6366f1',
  };
  return colorMap[type] || '#0284c7';
}

function getJsonPlaceholder(): string {
  return `{
  "key": "value"
}`;
}

// Actions
function handleSave() {
  if (localNode.value) {
    emit('update', localNode.value);
  }
}

function handleReset() {
  if (props.selectedNode) {
    localNode.value = JSON.parse(JSON.stringify(props.selectedNode));
  }
}

function handleDelete() {
  if (localNode.value && confirm('Are you sure you want to delete this node?')) {
    emit('delete', localNode.value.id);
  }
}

function closePanel() {
  emit('close');
}
</script>

<style scoped>
/* Custom scrollbar styling is handled by Tailwind utility classes */
</style>

<!--
  Orchestra © 2025
  Author: Orchestra Team
  License: Apache-2.0
  Description: Workflow canvas editor with drag-and-drop node support
-->

<template>
  <div class="workflow-canvas relative w-full h-full bg-gray-50 overflow-hidden" ref="canvasContainer">
    <!-- Canvas SVG Layer -->
    <svg
      class="absolute inset-0 w-full h-full pointer-events-none"
      :style="{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})` }"
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 10 3, 0 6" fill="#6b7280" />
        </marker>
      </defs>

      <!-- Connections -->
      <g v-for="connection in connections" :key="connection.id">
        <path
          :d="getConnectionPath(connection)"
          stroke="#6b7280"
          stroke-width="2"
          fill="none"
          marker-end="url(#arrowhead)"
          class="transition-all duration-200"
          :class="{ 'stroke-primary-500': selectedConnection === connection.id }"
        />
      </g>

      <!-- Temporary connection while dragging -->
      <path
        v-if="tempConnection"
        :d="tempConnection.path"
        stroke="#0284c7"
        stroke-width="2"
        stroke-dasharray="5,5"
        fill="none"
        marker-end="url(#arrowhead)"
      />
    </svg>

    <!-- Nodes Layer -->
    <div
      class="absolute inset-0"
      :style="{ transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})` }"
      @mousedown="handleCanvasMouseDown"
      @mousemove="handleCanvasMouseMove"
      @mouseup="handleCanvasMouseUp"
      @drop="handleDrop"
      @dragover.prevent
    >
      <div
        v-for="node in nodes"
        :key="node.id"
        class="absolute node-item cursor-move bg-white rounded-lg shadow-lg border-2 transition-all duration-200"
        :class="{
          'border-primary-500 shadow-xl': selectedNode === node.id,
          'border-gray-300': selectedNode !== node.id,
          'opacity-50': node.disabled
        }"
        :style="{
          left: `${node.position.x}px`,
          top: `${node.position.y}px`,
          width: '220px'
        }"
        @mousedown.stop="handleNodeMouseDown($event, node)"
      >
        <!-- Node Header -->
        <div class="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-blue-50">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2 flex-1 min-w-0">
              <div class="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-bold">
                {{ getNodeIcon(node.type) }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-sm text-gray-900 truncate">{{ node.name }}</div>
                <div class="text-xs text-gray-500 truncate">{{ node.type }}</div>
              </div>
            </div>
            <button
              @click.stop="toggleNodeDisabled(node.id)"
              class="p-1 hover:bg-white rounded"
              :title="node.disabled ? 'Enable node' : 'Disable node'"
            >
              <svg v-if="!node.disabled" class="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <svg v-else class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Node Body -->
        <div class="px-4 py-3">
          <div class="text-xs text-gray-600">
            <div v-if="Object.keys(node.parameters).length > 0" class="space-y-1">
              <div v-for="(value, key) in getLimitedParameters(node.parameters)" :key="key" class="truncate">
                <span class="font-medium">{{ key }}:</span>
                <span class="ml-1">{{ formatParameterValue(value) }}</span>
              </div>
            </div>
            <div v-else class="text-gray-400 italic">No parameters set</div>
          </div>
        </div>

        <!-- Input/Output Ports -->
        <div class="absolute -left-2 top-1/2 transform -translate-y-1/2">
          <div
            class="w-4 h-4 rounded-full bg-gray-400 border-2 border-white hover:bg-primary-500 cursor-crosshair transition-colors"
            :title="'Input port'"
          />
        </div>
        <div class="absolute -right-2 top-1/2 transform -translate-y-1/2">
          <div
            class="w-4 h-4 rounded-full bg-gray-400 border-2 border-white hover:bg-primary-500 cursor-crosshair transition-colors"
            :title="'Output port'"
            @mousedown.stop="startConnection(node.id)"
          />
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="absolute top-4 right-4 flex flex-col space-y-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2">
      <button
        @click="zoomIn"
        class="p-2 hover:bg-gray-100 rounded transition-colors"
        title="Zoom in"
      >
        <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>
      <button
        @click="zoomOut"
        class="p-2 hover:bg-gray-100 rounded transition-colors"
        title="Zoom out"
      >
        <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
        </svg>
      </button>
      <button
        @click="resetZoom"
        class="p-2 hover:bg-gray-100 rounded transition-colors"
        title="Reset zoom"
      >
        <svg class="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>
      <div class="pt-2 border-t border-gray-200 text-center">
        <div class="text-xs text-gray-600 font-medium">{{ Math.round(zoom * 100) }}%</div>
      </div>
    </div>

    <!-- Mini-map (optional) -->
    <div class="absolute bottom-4 right-4 w-48 h-32 bg-white rounded-lg shadow-lg border border-gray-200 p-2 opacity-80 hover:opacity-100 transition-opacity">
      <div class="text-xs text-gray-600 mb-1 font-medium">Mini-map</div>
      <div class="relative w-full h-full bg-gray-100 rounded overflow-hidden">
        <div
          v-for="node in nodes"
          :key="node.id"
          class="absolute bg-primary-400 rounded"
          :style="{
            left: `${(node.position.x / 20)}px`,
            top: `${(node.position.y / 20)}px`,
            width: '10px',
            height: '8px'
          }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue';

interface Node {
  id: string;
  type: string;
  name: string;
  parameters: Record<string, any>;
  position: { x: number; y: number };
  disabled?: boolean;
}

interface Connection {
  id: string;
  source: string;
  sourceOutput: string;
  target: string;
  targetInput: string;
}

interface Props {
  modelValue?: {
    nodes: Node[];
    connections: Connection[];
  };
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({ nodes: [], connections: [] })
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: { nodes: Node[]; connections: Connection[] }): void;
  (e: 'nodeSelected', nodeId: string | null): void;
  (e: 'nodeAdded', node: Node): void;
}>();

// Canvas state
const canvasContainer: Ref<HTMLElement | null> = ref(null);
const nodes = ref<Node[]>(props.modelValue.nodes);
const connections = ref<Connection[]>(props.modelValue.connections);
const selectedNode = ref<string | null>(null);
const selectedConnection = ref<string | null>(null);

// Pan and zoom
const panOffset = ref({ x: 0, y: 0 });
const zoom = ref(1);
const isPanning = ref(false);
const lastMousePos = ref({ x: 0, y: 0 });

// Node dragging
const isDragging = ref(false);
const draggedNode = ref<string | null>(null);
const dragOffset = ref({ x: 0, y: 0 });

// Connection creation
const isConnecting = ref(false);
const connectionStart = ref<string | null>(null);
const tempConnection = ref<{ path: string } | null>(null);
const mousePos = ref({ x: 0, y: 0 });

// Node icons mapping
const nodeIcons: Record<string, string> = {
  'webhook': 'W',
  'schedule': 'S',
  'httpRequest': 'H',
  'sendEmail': 'E',
  'if': 'IF',
  'switch': 'SW',
  'set': 'SET',
  'filter': 'F',
  'database': 'DB',
};

function getNodeIcon(type: string): string {
  return nodeIcons[type] || type.substring(0, 2).toUpperCase();
}

function getLimitedParameters(params: Record<string, any>): Record<string, any> {
  const entries = Object.entries(params);
  return Object.fromEntries(entries.slice(0, 3));
}

function formatParameterValue(value: any): string {
  if (typeof value === 'string' && value.length > 20) {
    return value.substring(0, 20) + '...';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value).substring(0, 20) + '...';
  }
  return String(value);
}

// Canvas interaction handlers
function handleCanvasMouseDown(e: MouseEvent) {
  if (e.button === 1 || (e.button === 0 && e.altKey)) {
    // Middle mouse or Alt+Click for panning
    isPanning.value = true;
    lastMousePos.value = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  } else if (e.button === 0 && e.target === e.currentTarget) {
    // Left click on canvas background
    selectedNode.value = null;
    selectedConnection.value = null;
    emit('nodeSelected', null);
  }
}

function handleCanvasMouseMove(e: MouseEvent) {
  mousePos.value = { x: e.clientX, y: e.clientY };

  if (isPanning.value) {
    const dx = e.clientX - lastMousePos.value.x;
    const dy = e.clientY - lastMousePos.value.y;
    panOffset.value.x += dx;
    panOffset.value.y += dy;
    lastMousePos.value = { x: e.clientX, y: e.clientY };
  } else if (isDragging.value && draggedNode.value) {
    const node = nodes.value.find(n => n.id === draggedNode.value);
    if (node) {
      node.position.x = (e.clientX - panOffset.value.x) / zoom.value - dragOffset.value.x;
      node.position.y = (e.clientY - panOffset.value.y) / zoom.value - dragOffset.value.y;
      emitUpdate();
    }
  } else if (isConnecting.value && connectionStart.value) {
    updateTempConnection();
  }
}

function handleCanvasMouseUp(e: MouseEvent) {
  isPanning.value = false;

  if (isDragging.value) {
    isDragging.value = false;
    draggedNode.value = null;
  }

  if (isConnecting.value) {
    // Try to find a node under the cursor to complete connection
    const targetElement = document.elementFromPoint(e.clientX, e.clientY);
    const nodeElement = targetElement?.closest('.node-item');

    if (nodeElement && connectionStart.value) {
      const targetNode = nodes.value.find(n =>
        nodeElement.querySelector(`[style*="left: ${n.position.x}px"]`)
      );

      if (targetNode && targetNode.id !== connectionStart.value) {
        addConnection(connectionStart.value, targetNode.id);
      }
    }

    isConnecting.value = false;
    connectionStart.value = null;
    tempConnection.value = null;
  }
}

// Node interaction handlers
function handleNodeMouseDown(e: MouseEvent, node: Node) {
  if (e.button === 0) {
    selectedNode.value = node.id;
    emit('nodeSelected', node.id);

    isDragging.value = true;
    draggedNode.value = node.id;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    dragOffset.value = {
      x: (e.clientX - rect.left) / zoom.value,
      y: (e.clientY - rect.top) / zoom.value
    };
  }
}

function toggleNodeDisabled(nodeId: string) {
  const node = nodes.value.find(n => n.id === nodeId);
  if (node) {
    node.disabled = !node.disabled;
    emitUpdate();
  }
}

// Connection management
function startConnection(nodeId: string) {
  isConnecting.value = true;
  connectionStart.value = nodeId;
}

function updateTempConnection() {
  if (!connectionStart.value) return;

  const sourceNode = nodes.value.find(n => n.id === connectionStart.value);
  if (!sourceNode) return;

  const startX = sourceNode.position.x + 220;
  const startY = sourceNode.position.y + 50;
  const endX = (mousePos.value.x - panOffset.value.x) / zoom.value;
  const endY = (mousePos.value.y - panOffset.value.y) / zoom.value;

  tempConnection.value = {
    path: createCurvedPath(startX, startY, endX, endY)
  };
}

function addConnection(sourceId: string, targetId: string) {
  const newConnection: Connection = {
    id: `conn_${Date.now()}`,
    source: sourceId,
    sourceOutput: 'main',
    target: targetId,
    targetInput: 'main'
  };

  connections.value.push(newConnection);
  emitUpdate();
}

function getConnectionPath(connection: Connection): string {
  const sourceNode = nodes.value.find(n => n.id === connection.source);
  const targetNode = nodes.value.find(n => n.id === connection.target);

  if (!sourceNode || !targetNode) return '';

  const startX = sourceNode.position.x + 220;
  const startY = sourceNode.position.y + 50;
  const endX = targetNode.position.x;
  const endY = targetNode.position.y + 50;

  return createCurvedPath(startX, startY, endX, endY);
}

function createCurvedPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = x2 - x1;
  const controlPointOffset = Math.abs(dx) / 2;

  return `M ${x1} ${y1} C ${x1 + controlPointOffset} ${y1}, ${x2 - controlPointOffset} ${y2}, ${x2} ${y2}`;
}

// Zoom controls
function zoomIn() {
  zoom.value = Math.min(zoom.value + 0.1, 2);
}

function zoomOut() {
  zoom.value = Math.max(zoom.value - 0.1, 0.5);
}

function resetZoom() {
  zoom.value = 1;
  panOffset.value = { x: 0, y: 0 };
}

// Drag and drop from node library
function handleDrop(e: DragEvent) {
  e.preventDefault();

  const nodeType = e.dataTransfer?.getData('nodeType');
  if (!nodeType) return;

  const x = (e.clientX - panOffset.value.x) / zoom.value;
  const y = (e.clientY - panOffset.value.y) / zoom.value;

  const newNode: Node = {
    id: `node_${Date.now()}`,
    type: nodeType,
    name: nodeType,
    parameters: {},
    position: { x: x - 110, y: y - 50 }
  };

  nodes.value.push(newNode);
  selectedNode.value = newNode.id;
  emit('nodeSelected', newNode.id);
  emit('nodeAdded', newNode);
  emitUpdate();
}

function emitUpdate() {
  emit('update:modelValue', {
    nodes: nodes.value,
    connections: connections.value
  });
}

// Keyboard shortcuts
function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Delete' && selectedNode.value) {
    deleteNode(selectedNode.value);
  } else if (e.key === 'Escape') {
    selectedNode.value = null;
    selectedConnection.value = null;
    emit('nodeSelected', null);
  }
}

function deleteNode(nodeId: string) {
  nodes.value = nodes.value.filter(n => n.id !== nodeId);
  connections.value = connections.value.filter(
    c => c.source !== nodeId && c.target !== nodeId
  );
  selectedNode.value = null;
  emit('nodeSelected', null);
  emitUpdate();
}

// Public methods
defineExpose({
  addNode: (node: Node) => {
    nodes.value.push(node);
    emitUpdate();
  },
  deleteNode,
  clearSelection: () => {
    selectedNode.value = null;
    selectedConnection.value = null;
    emit('nodeSelected', null);
  }
});

// Lifecycle
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.workflow-canvas {
  cursor: grab;
}

.workflow-canvas.panning {
  cursor: grabbing;
}

.node-item {
  transform-origin: center;
  user-select: none;
}

.node-item:hover {
  z-index: 10;
}
</style>

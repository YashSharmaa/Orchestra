/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Canvas editor store for managing workflow canvas state
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { WorkflowNode, WorkflowConnection, NodePosition } from '../types';

export const useCanvasStore = defineStore('canvas', () => {
  // ============================================================================
  // State
  // ============================================================================

  // Canvas viewport state
  const zoom = ref(1);
  const panX = ref(0);
  const panY = ref(0);
  const canvasWidth = ref(0);
  const canvasHeight = ref(0);

  // Node selection state
  const selectedNodeIds = ref<Set<string>>(new Set());
  const hoveredNodeId = ref<string | null>(null);
  const draggedNodeId = ref<string | null>(null);

  // Connection state
  const selectedConnectionIds = ref<Set<string>>(new Set());
  const hoveredConnectionId = ref<string | null>(null);
  const connectionDraft = ref<{
    source: string;
    sourceOutput: string;
    target?: string;
    targetInput?: string;
    mouseX?: number;
    mouseY?: number;
  } | null>(null);

  // Canvas interaction state
  const isPanning = ref(false);
  const isSelecting = ref(false);
  const isConnecting = ref(false);
  const isDraggingNode = ref(false);
  const selectionBox = ref<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);

  // Undo/Redo state
  const history = ref<{
    nodes: WorkflowNode[];
    connections: WorkflowConnection[];
  }[]>([]);
  const historyIndex = ref(-1);
  const maxHistorySize = 50;

  // Clipboard state
  const clipboard = ref<{
    nodes: WorkflowNode[];
    connections: WorkflowConnection[];
  } | null>(null);

  // Editor settings
  const snapToGrid = ref(true);
  const gridSize = ref(20);
  const showGrid = ref(true);
  const showMinimap = ref(true);
  const autoSave = ref(true);

  // ============================================================================
  // Getters
  // ============================================================================

  const hasSelection = computed(() => selectedNodeIds.value.size > 0 || selectedConnectionIds.value.size > 0);
  const selectedNodeCount = computed(() => selectedNodeIds.value.size);
  const selectedConnectionCount = computed(() => selectedConnectionIds.value.size);
  const canUndo = computed(() => historyIndex.value > 0);
  const canRedo = computed(() => historyIndex.value < history.value.length - 1);
  const hasClipboard = computed(() => !!clipboard.value && (clipboard.value.nodes.length > 0 || clipboard.value.connections.length > 0));
  const isInteracting = computed(() => isPanning.value || isSelecting.value || isConnecting.value || isDraggingNode.value);
  const zoomPercentage = computed(() => Math.round(zoom.value * 100));

  // ============================================================================
  // Actions - Canvas Viewport
  // ============================================================================

  /**
   * Set canvas zoom level
   */
  function setZoom(level: number): void {
    zoom.value = Math.max(0.1, Math.min(3, level));
  }

  /**
   * Zoom in
   */
  function zoomIn(step = 0.1): void {
    setZoom(zoom.value + step);
  }

  /**
   * Zoom out
   */
  function zoomOut(step = 0.1): void {
    setZoom(zoom.value - step);
  }

  /**
   * Reset zoom to 100%
   */
  function resetZoom(): void {
    zoom.value = 1;
  }

  /**
   * Zoom to fit all nodes
   */
  function zoomToFit(nodes: WorkflowNode[], padding = 50): void {
    if (nodes.length === 0) {
      resetZoom();
      centerCanvas();
      return;
    }

    // Calculate bounding box
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach((node) => {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + 200); // Assume node width ~200px
      maxY = Math.max(maxY, node.position.y + 100); // Assume node height ~100px
    });

    const width = maxX - minX;
    const height = maxY - minY;

    // Calculate zoom to fit
    const zoomX = (canvasWidth.value - padding * 2) / width;
    const zoomY = (canvasHeight.value - padding * 2) / height;
    const newZoom = Math.min(zoomX, zoomY, 1); // Don't zoom in beyond 100%

    setZoom(newZoom);

    // Center the content
    panX.value = -(minX * newZoom) + (canvasWidth.value - width * newZoom) / 2;
    panY.value = -(minY * newZoom) + (canvasHeight.value - height * newZoom) / 2;
  }

  /**
   * Set pan position
   */
  function setPan(x: number, y: number): void {
    panX.value = x;
    panY.value = y;
  }

  /**
   * Pan by offset
   */
  function panBy(dx: number, dy: number): void {
    panX.value += dx;
    panY.value += dy;
  }

  /**
   * Center canvas at origin
   */
  function centerCanvas(): void {
    panX.value = canvasWidth.value / 2;
    panY.value = canvasHeight.value / 2;
  }

  /**
   * Set canvas dimensions
   */
  function setCanvasDimensions(width: number, height: number): void {
    canvasWidth.value = width;
    canvasHeight.value = height;
  }

  /**
   * Convert screen coordinates to canvas coordinates
   */
  function screenToCanvas(screenX: number, screenY: number): NodePosition {
    return {
      x: (screenX - panX.value) / zoom.value,
      y: (screenY - panY.value) / zoom.value,
    };
  }

  /**
   * Convert canvas coordinates to screen coordinates
   */
  function canvasToScreen(canvasX: number, canvasY: number): NodePosition {
    return {
      x: canvasX * zoom.value + panX.value,
      y: canvasY * zoom.value + panY.value,
    };
  }

  // ============================================================================
  // Actions - Node Selection
  // ============================================================================

  /**
   * Select a node
   */
  function selectNode(nodeId: string, addToSelection = false): void {
    if (addToSelection) {
      selectedNodeIds.value.add(nodeId);
    } else {
      selectedNodeIds.value.clear();
      selectedNodeIds.value.add(nodeId);
      selectedConnectionIds.value.clear();
    }
  }

  /**
   * Deselect a node
   */
  function deselectNode(nodeId: string): void {
    selectedNodeIds.value.delete(nodeId);
  }

  /**
   * Toggle node selection
   */
  function toggleNodeSelection(nodeId: string): void {
    if (selectedNodeIds.value.has(nodeId)) {
      selectedNodeIds.value.delete(nodeId);
    } else {
      selectedNodeIds.value.add(nodeId);
    }
  }

  /**
   * Select multiple nodes
   */
  function selectNodes(nodeIds: string[], addToSelection = false): void {
    if (!addToSelection) {
      selectedNodeIds.value.clear();
      selectedConnectionIds.value.clear();
    }
    nodeIds.forEach((id) => selectedNodeIds.value.add(id));
  }

  /**
   * Clear node selection
   */
  function clearNodeSelection(): void {
    selectedNodeIds.value.clear();
  }

  /**
   * Check if node is selected
   */
  function isNodeSelected(nodeId: string): boolean {
    return selectedNodeIds.value.has(nodeId);
  }

  /**
   * Get selected node IDs as array
   */
  function getSelectedNodeIds(): string[] {
    return Array.from(selectedNodeIds.value);
  }

  // ============================================================================
  // Actions - Connection Selection
  // ============================================================================

  /**
   * Select a connection
   */
  function selectConnection(connectionId: string, addToSelection = false): void {
    if (addToSelection) {
      selectedConnectionIds.value.add(connectionId);
    } else {
      selectedConnectionIds.value.clear();
      selectedConnectionIds.value.add(connectionId);
      selectedNodeIds.value.clear();
    }
  }

  /**
   * Deselect a connection
   */
  function deselectConnection(connectionId: string): void {
    selectedConnectionIds.value.delete(connectionId);
  }

  /**
   * Toggle connection selection
   */
  function toggleConnectionSelection(connectionId: string): void {
    if (selectedConnectionIds.value.has(connectionId)) {
      selectedConnectionIds.value.delete(connectionId);
    } else {
      selectedConnectionIds.value.add(connectionId);
    }
  }

  /**
   * Clear connection selection
   */
  function clearConnectionSelection(): void {
    selectedConnectionIds.value.clear();
  }

  /**
   * Check if connection is selected
   */
  function isConnectionSelected(connectionId: string): boolean {
    return selectedConnectionIds.value.has(connectionId);
  }

  /**
   * Get selected connection IDs as array
   */
  function getSelectedConnectionIds(): string[] {
    return Array.from(selectedConnectionIds.value);
  }

  // ============================================================================
  // Actions - Selection Management
  // ============================================================================

  /**
   * Select all nodes and connections
   */
  function selectAll(nodes: WorkflowNode[], connections: WorkflowConnection[]): void {
    selectedNodeIds.value.clear();
    selectedConnectionIds.value.clear();
    nodes.forEach((node) => selectedNodeIds.value.add(node.id));
    connections.forEach((conn) => selectedConnectionIds.value.add(conn.id));
  }

  /**
   * Clear all selections
   */
  function clearSelection(): void {
    selectedNodeIds.value.clear();
    selectedConnectionIds.value.clear();
  }

  /**
   * Invert selection
   */
  function invertSelection(nodes: WorkflowNode[], connections: WorkflowConnection[]): void {
    const newSelectedNodes = new Set<string>();
    const newSelectedConnections = new Set<string>();

    nodes.forEach((node) => {
      if (!selectedNodeIds.value.has(node.id)) {
        newSelectedNodes.add(node.id);
      }
    });

    connections.forEach((conn) => {
      if (!selectedConnectionIds.value.has(conn.id)) {
        newSelectedConnections.add(conn.id);
      }
    });

    selectedNodeIds.value = newSelectedNodes;
    selectedConnectionIds.value = newSelectedConnections;
  }

  // ============================================================================
  // Actions - Connection Draft
  // ============================================================================

  /**
   * Start creating a new connection
   */
  function startConnection(source: string, sourceOutput: string, mouseX: number, mouseY: number): void {
    connectionDraft.value = {
      source,
      sourceOutput,
      mouseX,
      mouseY,
    };
    isConnecting.value = true;
  }

  /**
   * Update connection draft mouse position
   */
  function updateConnectionDraft(mouseX: number, mouseY: number): void {
    if (connectionDraft.value) {
      connectionDraft.value.mouseX = mouseX;
      connectionDraft.value.mouseY = mouseY;
    }
  }

  /**
   * Complete connection draft
   */
  function completeConnection(target: string, targetInput: string): void {
    if (connectionDraft.value) {
      connectionDraft.value.target = target;
      connectionDraft.value.targetInput = targetInput;
    }
  }

  /**
   * Cancel connection draft
   */
  function cancelConnection(): void {
    connectionDraft.value = null;
    isConnecting.value = false;
  }

  // ============================================================================
  // Actions - Hover State
  // ============================================================================

  /**
   * Set hovered node
   */
  function setHoveredNode(nodeId: string | null): void {
    hoveredNodeId.value = nodeId;
  }

  /**
   * Set hovered connection
   */
  function setHoveredConnection(connectionId: string | null): void {
    hoveredConnectionId.value = connectionId;
  }

  // ============================================================================
  // Actions - Drag State
  // ============================================================================

  /**
   * Start dragging a node
   */
  function startDraggingNode(nodeId: string): void {
    draggedNodeId.value = nodeId;
    isDraggingNode.value = true;
  }

  /**
   * Stop dragging a node
   */
  function stopDraggingNode(): void {
    draggedNodeId.value = null;
    isDraggingNode.value = false;
  }

  // ============================================================================
  // Actions - Panning State
  // ============================================================================

  /**
   * Start panning
   */
  function startPanning(): void {
    isPanning.value = true;
  }

  /**
   * Stop panning
   */
  function stopPanning(): void {
    isPanning.value = false;
  }

  // ============================================================================
  // Actions - Selection Box
  // ============================================================================

  /**
   * Start box selection
   */
  function startBoxSelection(startX: number, startY: number): void {
    selectionBox.value = { startX, startY, endX: startX, endY: startY };
    isSelecting.value = true;
  }

  /**
   * Update box selection
   */
  function updateBoxSelection(endX: number, endY: number): void {
    if (selectionBox.value) {
      selectionBox.value.endX = endX;
      selectionBox.value.endY = endY;
    }
  }

  /**
   * Complete box selection
   */
  function completeBoxSelection(nodes: WorkflowNode[], addToSelection = false): void {
    if (!selectionBox.value) return;

    const box = selectionBox.value;
    const minX = Math.min(box.startX, box.endX);
    const maxX = Math.max(box.startX, box.endX);
    const minY = Math.min(box.startY, box.endY);
    const maxY = Math.max(box.startY, box.endY);

    const selectedIds: string[] = [];

    nodes.forEach((node) => {
      const nodeScreen = canvasToScreen(node.position.x, node.position.y);
      if (
        nodeScreen.x >= minX &&
        nodeScreen.x <= maxX &&
        nodeScreen.y >= minY &&
        nodeScreen.y <= maxY
      ) {
        selectedIds.push(node.id);
      }
    });

    selectNodes(selectedIds, addToSelection);
    selectionBox.value = null;
    isSelecting.value = false;
  }

  /**
   * Cancel box selection
   */
  function cancelBoxSelection(): void {
    selectionBox.value = null;
    isSelecting.value = false;
  }

  // ============================================================================
  // Actions - Grid and Snapping
  // ============================================================================

  /**
   * Snap position to grid
   */
  function snapToGridPosition(position: NodePosition): NodePosition {
    if (!snapToGrid.value) return position;

    return {
      x: Math.round(position.x / gridSize.value) * gridSize.value,
      y: Math.round(position.y / gridSize.value) * gridSize.value,
    };
  }

  /**
   * Toggle snap to grid
   */
  function toggleSnapToGrid(): void {
    snapToGrid.value = !snapToGrid.value;
  }

  /**
   * Set grid size
   */
  function setGridSize(size: number): void {
    gridSize.value = Math.max(10, Math.min(50, size));
  }

  /**
   * Toggle grid visibility
   */
  function toggleGrid(): void {
    showGrid.value = !showGrid.value;
  }

  // ============================================================================
  // Actions - History (Undo/Redo)
  // ============================================================================

  /**
   * Save state to history
   */
  function saveToHistory(nodes: WorkflowNode[], connections: WorkflowConnection[]): void {
    // Remove any history after current index
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1);
    }

    // Add current state
    history.value.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      connections: JSON.parse(JSON.stringify(connections)),
    });

    // Limit history size
    if (history.value.length > maxHistorySize) {
      history.value.shift();
    } else {
      historyIndex.value++;
    }
  }

  /**
   * Clear history
   */
  function clearHistory(): void {
    history.value = [];
    historyIndex.value = -1;
  }

  // ============================================================================
  // Actions - Clipboard
  // ============================================================================

  /**
   * Copy selected nodes and connections to clipboard
   */
  function copyToClipboard(nodes: WorkflowNode[], connections: WorkflowConnection[]): void {
    const selectedNodes = nodes.filter((n) => selectedNodeIds.value.has(n.id));
    const selectedConnections = connections.filter((c) =>
      selectedNodeIds.value.has(c.source) && selectedNodeIds.value.has(c.target)
    );

    clipboard.value = {
      nodes: JSON.parse(JSON.stringify(selectedNodes)),
      connections: JSON.parse(JSON.stringify(selectedConnections)),
    };
  }

  /**
   * Clear clipboard
   */
  function clearClipboard(): void {
    clipboard.value = null;
  }

  /**
   * Get clipboard contents
   */
  function getClipboard(): { nodes: WorkflowNode[]; connections: WorkflowConnection[] } | null {
    return clipboard.value;
  }

  // ============================================================================
  // Actions - Settings
  // ============================================================================

  /**
   * Toggle minimap visibility
   */
  function toggleMinimap(): void {
    showMinimap.value = !showMinimap.value;
  }

  /**
   * Toggle auto-save
   */
  function toggleAutoSave(): void {
    autoSave.value = !autoSave.value;
  }

  // ============================================================================
  // Actions - Reset
  // ============================================================================

  /**
   * Reset canvas state
   */
  function $reset(): void {
    zoom.value = 1;
    panX.value = 0;
    panY.value = 0;
    selectedNodeIds.value.clear();
    hoveredNodeId.value = null;
    draggedNodeId.value = null;
    selectedConnectionIds.value.clear();
    hoveredConnectionId.value = null;
    connectionDraft.value = null;
    isPanning.value = false;
    isSelecting.value = false;
    isConnecting.value = false;
    isDraggingNode.value = false;
    selectionBox.value = null;
    history.value = [];
    historyIndex.value = -1;
    clipboard.value = null;
  }

  // ============================================================================
  // Return Store
  // ============================================================================

  return {
    // State - Viewport
    zoom,
    panX,
    panY,
    canvasWidth,
    canvasHeight,

    // State - Selection
    selectedNodeIds,
    hoveredNodeId,
    draggedNodeId,
    selectedConnectionIds,
    hoveredConnectionId,
    connectionDraft,

    // State - Interaction
    isPanning,
    isSelecting,
    isConnecting,
    isDraggingNode,
    selectionBox,

    // State - History
    history,
    historyIndex,

    // State - Clipboard
    clipboard,

    // State - Settings
    snapToGrid,
    gridSize,
    showGrid,
    showMinimap,
    autoSave,

    // Getters
    hasSelection,
    selectedNodeCount,
    selectedConnectionCount,
    canUndo,
    canRedo,
    hasClipboard,
    isInteracting,
    zoomPercentage,

    // Actions - Viewport
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    zoomToFit,
    setPan,
    panBy,
    centerCanvas,
    setCanvasDimensions,
    screenToCanvas,
    canvasToScreen,

    // Actions - Node Selection
    selectNode,
    deselectNode,
    toggleNodeSelection,
    selectNodes,
    clearNodeSelection,
    isNodeSelected,
    getSelectedNodeIds,

    // Actions - Connection Selection
    selectConnection,
    deselectConnection,
    toggleConnectionSelection,
    clearConnectionSelection,
    isConnectionSelected,
    getSelectedConnectionIds,

    // Actions - Selection Management
    selectAll,
    clearSelection,
    invertSelection,

    // Actions - Connection Draft
    startConnection,
    updateConnectionDraft,
    completeConnection,
    cancelConnection,

    // Actions - Hover State
    setHoveredNode,
    setHoveredConnection,

    // Actions - Drag State
    startDraggingNode,
    stopDraggingNode,

    // Actions - Panning State
    startPanning,
    stopPanning,

    // Actions - Selection Box
    startBoxSelection,
    updateBoxSelection,
    completeBoxSelection,
    cancelBoxSelection,

    // Actions - Grid and Snapping
    snapToGridPosition,
    toggleSnapToGrid,
    setGridSize,
    toggleGrid,

    // Actions - History
    saveToHistory,
    clearHistory,

    // Actions - Clipboard
    copyToClipboard,
    clearClipboard,
    getClipboard,

    // Actions - Settings
    toggleMinimap,
    toggleAutoSave,

    // Actions - Reset
    $reset,
  };
});

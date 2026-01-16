# Orchestra Frontend Stores

This directory contains the Pinia state management stores for the Orchestra frontend application.

## Overview

Orchestra uses [Pinia](https://pinia.vuejs.org/) for state management with a modular approach. Each store is responsible for a specific domain of the application.

## Store Architecture

All stores follow these conventions:
- **Composition API style** using `defineStore` with setup function
- **TypeScript** with full type safety
- **Reactive state** using Vue 3's `ref` and `computed`
- **Error handling** with consistent error state management
- **API integration** through the centralized API service

## Available Stores

### 1. Auth Store (`auth.ts`)

Manages authentication and user state.

**State:**
- `user` - Current user object
- `token` - Authentication token
- `loading` - Loading state
- `error` - Error messages
- `isInitialized` - Initialization status

**Key Actions:**
- `initialize()` - Initialize auth state from localStorage
- `login(credentials)` - Login with email/password
- `register(data)` - Register new user
- `logout()` - Logout current user
- `refreshProfile()` - Refresh user profile
- `updateProfile(data)` - Update user profile
- `changePassword(current, new)` - Change password
- `verifyAuth()` - Verify authentication status
- `hasPermission(role)` - Check user permissions

**Getters:**
- `isAuthenticated` - Whether user is logged in
- `isAdmin`, `isEditor`, `isDeveloper` - Role checks
- `userRole`, `userId`, `userEmail` - User properties
- `fullName` - User's full name

**Usage Example:**
```typescript
import { useAuthStore } from '@/stores';

const authStore = useAuthStore();

// Initialize on app mount
await authStore.initialize();

// Login
await authStore.login({ email: 'user@example.com', password: 'password' });

// Check authentication
if (authStore.isAuthenticated) {
  console.log('User:', authStore.user);
}

// Logout
await authStore.logout();
```

### 2. Workflows Store (`workflows.ts`)

Manages workflow state and operations.

**State:**
- `workflows` - List of all workflows
- `currentWorkflow` - Currently selected workflow
- `templates` - Workflow templates
- `loading`, `saving` - Loading states
- `error` - Error messages
- `searchQuery`, `filterTags`, `filterActive`, `filterPublic` - Filter state
- `sortBy`, `sortOrder` - Sorting options

**Key Actions:**
- `fetchWorkflows()` - Fetch all workflows
- `fetchWorkflow(id)` - Fetch single workflow
- `createWorkflow(data)` - Create new workflow
- `updateWorkflow(id, data)` - Update workflow
- `deleteWorkflow(id)` - Delete workflow
- `duplicateWorkflow(id)` - Duplicate workflow
- `toggleActive(id)` - Toggle workflow active status
- `fetchTemplates(category)` - Fetch workflow templates
- `setSearchQuery(query)` - Set search filter
- `setFilterTags(tags)` - Set tag filters
- `setSorting(by, order)` - Set sorting options

**Getters:**
- `filteredWorkflows` - Filtered and sorted workflows
- `activeWorkflows` - Only active workflows
- `publicWorkflows` - Only public workflows
- `allTags` - All available tags
- `workflowsCount` - Total workflow count

**Usage Example:**
```typescript
import { useWorkflowsStore } from '@/stores';

const workflowsStore = useWorkflowsStore();

// Fetch workflows
await workflowsStore.fetchWorkflows();

// Create workflow
const workflow = await workflowsStore.createWorkflow({
  name: 'My Workflow',
  description: 'A sample workflow',
  nodes: [],
  connections: [],
});

// Filter workflows
workflowsStore.setSearchQuery('data processing');
workflowsStore.setFilterTags(['automation', 'api']);

// Get filtered results
const filtered = workflowsStore.filteredWorkflows;
```

### 3. Executions Store (`executions.ts`)

Manages workflow execution state with real-time WebSocket updates.

**State:**
- `executions` - List of all executions
- `currentExecution` - Currently selected execution
- `stats` - Execution statistics
- `loading`, `error` - Loading and error states
- `filterWorkflowId`, `filterStatus` - Filter state
- `sortBy`, `sortOrder` - Sorting options
- `wsConnected`, `wsReconnecting` - WebSocket connection state

**Key Actions:**
- `fetchExecutions(workflowId?, limit?)` - Fetch executions
- `fetchExecution(id)` - Fetch single execution
- `startExecution(data)` - Start new execution
- `stopExecution(id)` - Stop running execution
- `retryExecution(id)` - Retry failed execution
- `deleteExecution(id)` - Delete execution
- `fetchStats(workflowId?)` - Fetch execution statistics
- `connectWebSocket()` - Connect to WebSocket for real-time updates
- `disconnectWebSocket()` - Disconnect WebSocket

**Getters:**
- `filteredExecutions` - Filtered and sorted executions
- `runningExecutions` - Only running executions
- `successfulExecutions` - Only successful executions
- `failedExecutions` - Only failed executions
- `executionsCount` - Total execution count
- `isCurrentExecutionRunning` - Whether current execution is running

**WebSocket Events:**
The store automatically handles these WebSocket events:
- `execution:started` - Execution started
- `execution:completed` - Execution completed successfully
- `execution:failed` - Execution failed
- `execution:progress` - Execution progress update
- `node:started`, `node:completed`, `node:failed`, `node:progress` - Node-level events

**Usage Example:**
```typescript
import { useExecutionsStore } from '@/stores';

const executionsStore = useExecutionsStore();

// Connect WebSocket for real-time updates
executionsStore.connectWebSocket();

// Fetch executions
await executionsStore.fetchExecutions();

// Start execution
const execution = await executionsStore.startExecution({
  workflowId: 'workflow-id',
  mode: 'manual',
});

// Stop execution
await executionsStore.stopExecution(execution.id);

// Filter by workflow
executionsStore.setFilterWorkflowId('workflow-id');

// Cleanup on unmount
onUnmounted(() => {
  executionsStore.disconnectWebSocket();
});
```

### 4. Canvas Store (`canvas.ts`)

Manages workflow canvas editor state including viewport, selections, and interactions.

**State:**
- `zoom`, `panX`, `panY` - Viewport state
- `canvasWidth`, `canvasHeight` - Canvas dimensions
- `selectedNodeIds`, `hoveredNodeId`, `draggedNodeId` - Node interaction state
- `selectedConnectionIds`, `hoveredConnectionId` - Connection interaction state
- `connectionDraft` - Draft connection being created
- `isPanning`, `isSelecting`, `isConnecting`, `isDraggingNode` - Interaction flags
- `selectionBox` - Box selection state
- `history`, `historyIndex` - Undo/redo history
- `clipboard` - Copy/paste clipboard
- `snapToGrid`, `gridSize`, `showGrid`, `showMinimap`, `autoSave` - Editor settings

**Key Actions - Viewport:**
- `setZoom(level)`, `zoomIn()`, `zoomOut()`, `resetZoom()` - Zoom controls
- `zoomToFit(nodes, padding)` - Zoom to fit all nodes
- `setPan(x, y)`, `panBy(dx, dy)` - Pan controls
- `centerCanvas()` - Center canvas
- `screenToCanvas(x, y)` - Convert screen to canvas coordinates
- `canvasToScreen(x, y)` - Convert canvas to screen coordinates

**Key Actions - Selection:**
- `selectNode(id, addToSelection)` - Select node
- `selectNodes(ids, addToSelection)` - Select multiple nodes
- `clearSelection()` - Clear all selections
- `selectAll(nodes, connections)` - Select all
- `invertSelection(nodes, connections)` - Invert selection
- `isNodeSelected(id)` - Check if node is selected

**Key Actions - Connections:**
- `startConnection(source, output, x, y)` - Start creating connection
- `updateConnectionDraft(x, y)` - Update draft connection
- `completeConnection(target, input)` - Complete connection
- `cancelConnection()` - Cancel connection draft

**Key Actions - History:**
- `saveToHistory(nodes, connections)` - Save state to history
- `clearHistory()` - Clear undo/redo history

**Key Actions - Clipboard:**
- `copyToClipboard(nodes, connections)` - Copy selection
- `getClipboard()` - Get clipboard contents
- `clearClipboard()` - Clear clipboard

**Getters:**
- `hasSelection` - Whether anything is selected
- `selectedNodeCount`, `selectedConnectionCount` - Selection counts
- `canUndo`, `canRedo` - Whether undo/redo is available
- `hasClipboard` - Whether clipboard has content
- `isInteracting` - Whether any interaction is happening
- `zoomPercentage` - Zoom level as percentage

**Usage Example:**
```typescript
import { useCanvasStore } from '@/stores';

const canvasStore = useCanvasStore();

// Initialize canvas
canvasStore.setCanvasDimensions(1920, 1080);
canvasStore.centerCanvas();

// Zoom controls
canvasStore.zoomIn();
canvasStore.zoomOut();
canvasStore.zoomToFit(nodes);

// Node selection
canvasStore.selectNode('node-1');
canvasStore.selectNodes(['node-1', 'node-2'], true); // Add to selection

// Connection creation
canvasStore.startConnection('source-node', 'output', mouseX, mouseY);
canvasStore.updateConnectionDraft(newX, newY);
canvasStore.completeConnection('target-node', 'input');

// Copy/paste
canvasStore.copyToClipboard(selectedNodes, selectedConnections);
const clipboard = canvasStore.getClipboard();

// History
canvasStore.saveToHistory(nodes, connections);
```

## Integration with Components

### Importing Stores

```typescript
// Import individual stores
import { useAuthStore, useWorkflowsStore } from '@/stores';

// Or import from index
import { useAuthStore } from '@/stores/auth';
```

### Using in Components

```vue
<script setup lang="ts">
import { useAuthStore } from '@/stores';

const authStore = useAuthStore();

// Access state
console.log(authStore.user);

// Access getters
console.log(authStore.isAuthenticated);

// Call actions
const handleLogin = async () => {
  await authStore.login({ email, password });
};
</script>
```

### Using with Vue Router Guards

```typescript
import { useAuthStore } from '@/stores';

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // Initialize auth if not done
  if (!authStore.isInitialized) {
    await authStore.initialize();
  }

  // Check authentication
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login');
  } else {
    next();
  }
});
```

## Error Handling

All stores follow consistent error handling:

```typescript
try {
  await workflowsStore.fetchWorkflows();
} catch (error) {
  // Error is already stored in workflowsStore.error
  console.error('Failed to fetch workflows:', workflowsStore.error);
}

// Clear error when done
workflowsStore.clearError();
```

## Testing

Stores can be tested using Pinia's testing utilities:

```typescript
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '@/stores/auth';

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should initialize with null user', () => {
    const authStore = useAuthStore();
    expect(authStore.user).toBeNull();
    expect(authStore.isAuthenticated).toBe(false);
  });

  it('should set user on successful login', async () => {
    const authStore = useAuthStore();
    // Mock API call
    await authStore.login({ email: 'test@example.com', password: 'password' });
    expect(authStore.isAuthenticated).toBe(true);
  });
});
```

## Best Practices

1. **Always initialize auth store** on app mount
2. **Connect WebSocket** when viewing executions
3. **Disconnect WebSocket** when leaving execution views
4. **Clear errors** after handling them
5. **Save to history** after canvas operations
6. **Use computed properties** for derived state
7. **Handle loading states** in UI
8. **Implement proper cleanup** in `onUnmounted`

## License

Apache-2.0

## Author

Orchestra Team © 2025

# Orchestra WebSocket Server

Real-time WebSocket server for Orchestra workflow execution updates.

## Overview

The WebSocket server provides real-time updates for workflow executions, node status changes, and system notifications to connected clients. It uses JWT authentication and room-based broadcasting for secure, efficient communication.

## Features

- **JWT Authentication**: Secure connection authentication using JWT tokens
- **Room-based Broadcasting**: Subscribe to specific execution IDs for targeted updates
- **Heartbeat Mechanism**: Automatic detection and cleanup of dead connections
- **Event-driven Architecture**: Emit events from anywhere in the application
- **Type-safe Events**: Fully typed event system with TypeScript

## Architecture

### Components

1. **WebSocketServer.ts**: Main WebSocket server implementation
   - Handles client connections and authentication
   - Manages subscriptions and broadcasting
   - Implements heartbeat mechanism

2. **events.ts**: Event types and emitter
   - Defines all event types and interfaces
   - Provides event emitter for publishing events
   - Includes helper functions for emitting specific events

3. **index.ts**: Module exports
   - Exports all public APIs

## Usage

### Server Integration

Add WebSocket server initialization to your main server file:

```typescript
import { createApp } from './app';
import { initializeWebSocketServer } from '@/websocket';
import { getConfig } from '@/utils/config';

const config = getConfig();
const app = createApp();

// Create HTTP server
const httpServer = app.listen(config.server.port, config.server.host, () => {
  console.log(`Server listening on ${config.server.host}:${config.server.port}`);
});

// Initialize WebSocket server
const wsServer = initializeWebSocketServer(httpServer);
console.log('WebSocket server initialized at ws://localhost:3000/ws');
```

### Emitting Events

Emit events from anywhere in your application:

```typescript
import {
  emitExecutionStarted,
  emitNodeStarted,
  emitNodeCompleted,
  emitExecutionCompleted,
} from '@/websocket';

// In your workflow execution engine
async function executeWorkflow(workflowId: string) {
  const executionId = generateId();

  // Emit execution started
  emitExecutionStarted({
    executionId,
    workflowId,
    startTime: new Date(),
    mode: 'manual',
  });

  // Execute nodes
  for (const node of workflow.nodes) {
    // Emit node started
    emitNodeStarted({
      executionId,
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      startTime: new Date(),
    });

    // Execute node...
    const result = await executeNode(node);

    // Emit node completed
    emitNodeCompleted({
      executionId,
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      startTime: result.startTime,
      endTime: new Date(),
      duration: Date.now() - result.startTime.getTime(),
      outputItemsCount: result.items.length,
    });
  }

  // Emit execution completed
  emitExecutionCompleted({
    executionId,
    workflowId,
    status: 'success',
    startTime: execution.startTime,
    endTime: new Date(),
    duration: Date.now() - execution.startTime.getTime(),
  });
}
```

### Client Connection

Clients connect to the WebSocket server with a JWT token:

```typescript
// Frontend client example
const token = localStorage.getItem('auth_token');
const ws = new WebSocket(`ws://localhost:3000/ws?token=${token}`);

ws.onopen = () => {
  console.log('WebSocket connected');

  // Subscribe to execution updates
  ws.send(JSON.stringify({
    type: 'subscribe',
    executionId: 'execution-123',
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);

  switch (message.type) {
    case 'connection:established':
      console.log('Connection established:', message.data);
      break;

    case 'execution:started':
      console.log('Execution started:', message.data);
      break;

    case 'node:started':
      console.log('Node started:', message.data);
      updateUI(message.data.nodeId, 'running');
      break;

    case 'node:completed':
      console.log('Node completed:', message.data);
      updateUI(message.data.nodeId, 'completed');
      break;

    case 'execution:completed':
      console.log('Execution completed:', message.data);
      break;
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('WebSocket disconnected');
};
```

## Event Types

### Execution Events

- **execution:started**: Workflow execution begins
- **execution:completed**: Workflow execution completes successfully
- **execution:failed**: Workflow execution fails with error
- **execution:progress**: Progress update during execution

### Node Events

- **node:started**: Node execution begins
- **node:completed**: Node execution completes successfully
- **node:failed**: Node execution fails with error
- **node:progress**: Progress update during node execution

### Other Events

- **workflow:updated**: Workflow definition is updated
- **system:notification**: System-wide notification

## Client Messages

### Subscribe to Execution

```json
{
  "type": "subscribe",
  "executionId": "execution-123"
}
```

### Unsubscribe from Execution

```json
{
  "type": "unsubscribe",
  "executionId": "execution-123"
}
```

### Ping

```json
{
  "type": "ping"
}
```

## Server Messages

### Connection Established

```json
{
  "type": "connection:established",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "data": {
    "userId": "user-123",
    "serverTime": "2025-01-15T10:30:00.000Z"
  }
}
```

### Subscription Confirmed

```json
{
  "type": "subscription:confirmed",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "data": {
    "executionId": "execution-123"
  }
}
```

### Event Message

```json
{
  "type": "node:started",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "data": {
    "executionId": "execution-123",
    "nodeId": "node-456",
    "nodeName": "HTTP Request",
    "nodeType": "http",
    "startTime": "2025-01-15T10:30:00.000Z"
  }
}
```

## Configuration

No additional configuration required. The WebSocket server uses the same JWT secret as the REST API for authentication.

## Security

- **JWT Authentication**: All connections must provide a valid JWT token
- **Room-based Broadcasting**: Clients only receive events for executions they subscribe to
- **Connection Validation**: Invalid tokens are rejected immediately
- **Heartbeat Monitoring**: Dead connections are automatically cleaned up

## Monitoring

Get server statistics:

```typescript
import { getWebSocketServer } from '@/websocket';

const wsServer = getWebSocketServer();

// Get total connected clients
const clientCount = wsServer.getClientCount();

// Get subscribers for a specific execution
const subscriberCount = wsServer.getExecutionSubscriberCount('execution-123');
```

## Shutdown

The WebSocket server gracefully closes all connections on shutdown:

```typescript
import { getWebSocketServer } from '@/websocket';

const wsServer = getWebSocketServer();

// Graceful shutdown
await wsServer.close();
```

## Testing

Example test connection using wscat:

```bash
# Install wscat
npm install -g wscat

# Connect with token
wscat -c "ws://localhost:3000/ws?token=YOUR_JWT_TOKEN"

# Send subscribe message
> {"type":"subscribe","executionId":"execution-123"}

# Send ping
> {"type":"ping"}
```

## Troubleshooting

### Connection Rejected

- Ensure JWT token is valid and not expired
- Check token is passed as query parameter: `?token=YOUR_TOKEN`
- Verify JWT secret matches between WebSocket and REST API

### Not Receiving Events

- Verify subscription to execution ID
- Check execution ID matches the actual execution
- Ensure events are being emitted in the execution engine

### Connection Drops

- Check heartbeat mechanism is working (30s interval)
- Verify network stability
- Check client is responding to pings

## Performance

- **Heartbeat Interval**: 30 seconds
- **Client Timeout**: 60 seconds
- **No Message Size Limit**: Configure in production if needed
- **Broadcast Efficiency**: O(n) where n = subscribed clients only

## License

Apache-2.0

# WebSocket Server Integration Guide

This guide shows how to integrate the WebSocket server into the Orchestra backend.

## Step 1: Update Main Server File

Modify `src/index.ts` to initialize the WebSocket server:

```typescript
import 'reflect-metadata';
import { createApp } from './app';
import { getConfig } from '@/utils/config';
import logger from '@/utils/logger';
import { initializeWebSocketServer, getWebSocketServer } from '@/websocket';

const config = getConfig();

async function start() {
  try {
    logger.info('Starting Orchestra backend...');

    // Create Express app
    const app = createApp();

    // Start HTTP server
    const httpServer = app.listen(config.server.port, config.server.host, () => {
      logger.info(`Orchestra backend listening on ${config.server.host}:${config.server.port}`);
      logger.info(`WebSocket server available at ws://${config.server.host}:${config.server.port}/ws`);
    });

    // Initialize WebSocket server
    const wsServer = initializeWebSocketServer(httpServer);
    logger.info('WebSocket server initialized', {
      path: '/ws',
      clientCount: wsServer.getClientCount(),
    });

    // Graceful shutdown handler
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown...`);

      // Close WebSocket connections first
      await wsServer.close();
      logger.info('WebSocket server closed');

      httpServer.close(() => {
        logger.info('HTTP server closed');
      });

      logger.info('Graceful shutdown complete');
      process.exit(0);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught errors
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception', { error: error.message, stack: error.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.error('Unhandled rejection', { reason, promise });
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Start the server
start();
```

## Step 2: Integrate with Workflow Engine

Add WebSocket events to your workflow execution engine:

```typescript
// src/engine/WorkflowExecutor.ts
import {
  emitExecutionStarted,
  emitExecutionCompleted,
  emitExecutionFailed,
  emitExecutionProgress,
  emitNodeStarted,
  emitNodeCompleted,
  emitNodeFailed,
} from '@/websocket';
import { IWorkflow, IExecution, INode } from '@/types';
import { log } from '@/utils/logger';

export class WorkflowExecutor {
  async execute(workflow: IWorkflow, executionId: string): Promise<IExecution> {
    const startTime = new Date();

    try {
      // Emit execution started event
      emitExecutionStarted({
        executionId,
        workflowId: workflow.id,
        startTime,
        mode: 'manual',
      });

      log.info('Workflow execution started', { executionId, workflowId: workflow.id });

      const totalNodes = workflow.nodes.filter(n => !n.disabled).length;
      let completedNodes = 0;

      // Execute nodes
      for (const node of workflow.nodes) {
        if (node.disabled) continue;

        try {
          // Emit node started event
          const nodeStartTime = new Date();
          emitNodeStarted({
            executionId,
            nodeId: node.id,
            nodeName: node.name,
            nodeType: node.type,
            startTime: nodeStartTime,
          });

          log.debug('Node execution started', { executionId, nodeId: node.id });

          // Execute the node
          const result = await this.executeNode(node, workflow, executionId);

          const nodeEndTime = new Date();
          const nodeDuration = nodeEndTime.getTime() - nodeStartTime.getTime();

          // Emit node completed event
          emitNodeCompleted({
            executionId,
            nodeId: node.id,
            nodeName: node.name,
            nodeType: node.type,
            startTime: nodeStartTime,
            endTime: nodeEndTime,
            duration: nodeDuration,
            outputItemsCount: result.data.main[0]?.length || 0,
          });

          log.debug('Node execution completed', { executionId, nodeId: node.id });

          completedNodes++;

          // Emit progress update
          emitExecutionProgress({
            executionId,
            workflowId: workflow.id,
            status: 'running',
            completedNodes,
            totalNodes,
            currentNode: node.id,
          });

        } catch (nodeError: any) {
          // Emit node failed event
          emitNodeFailed({
            executionId,
            nodeId: node.id,
            nodeName: node.name,
            nodeType: node.type,
            error: {
              message: nodeError.message,
              stack: nodeError.stack,
            },
            startTime: new Date(),
            endTime: new Date(),
          });

          log.error('Node execution failed', {
            executionId,
            nodeId: node.id,
            error: nodeError.message,
          });

          throw nodeError;
        }
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // Emit execution completed event
      emitExecutionCompleted({
        executionId,
        workflowId: workflow.id,
        status: 'success',
        startTime,
        endTime,
        duration,
      });

      log.info('Workflow execution completed', { executionId, workflowId: workflow.id });

      return {
        id: executionId,
        workflowId: workflow.id,
        mode: 'manual',
        status: 'success',
        startTime,
        endTime,
        data: {
          resultData: {},
        },
      };

    } catch (error: any) {
      const endTime = new Date();

      // Emit execution failed event
      emitExecutionFailed({
        executionId,
        workflowId: workflow.id,
        error: {
          message: error.message,
          stack: error.stack,
          node: error.node,
        },
        startTime,
        endTime,
      });

      log.error('Workflow execution failed', {
        executionId,
        workflowId: workflow.id,
        error: error.message,
      });

      throw error;
    }
  }

  private async executeNode(
    node: INode,
    workflow: IWorkflow,
    executionId: string
  ): Promise<any> {
    // Your node execution logic here
    // This is where you'd call the actual node implementations
    return {
      data: {
        main: [[{ json: { success: true } }]],
      },
    };
  }
}
```

## Step 3: Add WebSocket Status Endpoint

Add a status endpoint to your API to show WebSocket server status:

```typescript
// src/api/routes/system.ts
import { Router } from 'express';
import { getWebSocketServer } from '@/websocket';
import { authenticate } from '@/auth/middleware';

const router = Router();

router.get('/ws/status', authenticate, (req, res) => {
  const wsServer = getWebSocketServer();

  res.json({
    success: true,
    data: {
      connected: wsServer.getClientCount(),
      uptime: process.uptime(),
      timestamp: new Date(),
    },
  });
});

router.get('/ws/execution/:executionId/subscribers', authenticate, (req, res) => {
  const wsServer = getWebSocketServer();
  const { executionId } = req.params;

  res.json({
    success: true,
    data: {
      executionId,
      subscriberCount: wsServer.getExecutionSubscriberCount(executionId),
    },
  });
});

export default router;
```

## Step 4: Frontend Integration Example

Create a WebSocket service in your frontend:

```typescript
// frontend/src/services/websocket.ts
class WebSocketService {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<Function>> = new Map();

  connect(token: string) {
    this.token = token;
    const wsUrl = `ws://localhost:3000/ws?token=${token}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('connected', {});
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('WebSocket message:', message);
      this.emit(message.type, message);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.emit('disconnected', {});
      this.reconnect();
    };
  }

  subscribe(executionId: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        executionId,
      }));
    }
  }

  unsubscribe(executionId: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        executionId,
      }));
    }
  }

  on(eventType: string, callback: Function) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
  }

  off(eventType: string, callback: Function) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(eventType: string, data: any) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  private reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.token) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      console.log(`Reconnecting in ${delay}ms... (attempt ${this.reconnectAttempts})`);

      setTimeout(() => {
        this.connect(this.token!);
      }, delay);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const websocketService = new WebSocketService();
```

## Step 5: Use in React Component

```typescript
// frontend/src/components/WorkflowExecutionView.tsx
import { useEffect, useState } from 'react';
import { websocketService } from '@/services/websocket';

export function WorkflowExecutionView({ executionId }: { executionId: string }) {
  const [status, setStatus] = useState('new');
  const [nodes, setNodes] = useState<Record<string, string>>({});

  useEffect(() => {
    // Subscribe to execution updates
    websocketService.subscribe(executionId);

    // Listen for execution events
    const handleExecutionStarted = (message: any) => {
      setStatus('running');
    };

    const handleExecutionCompleted = (message: any) => {
      setStatus('success');
    };

    const handleNodeStarted = (message: any) => {
      setNodes(prev => ({
        ...prev,
        [message.data.nodeId]: 'running',
      }));
    };

    const handleNodeCompleted = (message: any) => {
      setNodes(prev => ({
        ...prev,
        [message.data.nodeId]: 'success',
      }));
    };

    websocketService.on('execution:started', handleExecutionStarted);
    websocketService.on('execution:completed', handleExecutionCompleted);
    websocketService.on('node:started', handleNodeStarted);
    websocketService.on('node:completed', handleNodeCompleted);

    return () => {
      // Cleanup
      websocketService.unsubscribe(executionId);
      websocketService.off('execution:started', handleExecutionStarted);
      websocketService.off('execution:completed', handleExecutionCompleted);
      websocketService.off('node:started', handleNodeStarted);
      websocketService.off('node:completed', handleNodeCompleted);
    };
  }, [executionId]);

  return (
    <div>
      <h2>Execution Status: {status}</h2>
      <div>
        {Object.entries(nodes).map(([nodeId, nodeStatus]) => (
          <div key={nodeId}>
            Node {nodeId}: {nodeStatus}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Testing

Test the WebSocket server:

```bash
# Install wscat for testing
npm install -g wscat

# Get a JWT token from your API
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Connect to WebSocket server
wscat -c "ws://localhost:3000/ws?token=YOUR_JWT_TOKEN"

# Send subscribe message
> {"type":"subscribe","executionId":"test-execution-123"}

# You should receive a subscription confirmation
< {"type":"subscription:confirmed","timestamp":"...","data":{"executionId":"test-execution-123"}}

# Now trigger a workflow execution and watch the events come through
```

## Monitoring

Add monitoring to track WebSocket performance:

```typescript
// Add to your monitoring service
import { getWebSocketServer } from '@/websocket';

setInterval(() => {
  const wsServer = getWebSocketServer();
  const metrics = {
    ws_connected_clients: wsServer.getClientCount(),
    timestamp: new Date(),
  };

  // Send to your monitoring service
  console.log('WebSocket metrics:', metrics);
}, 60000); // Every minute
```

## Troubleshooting

### Clients Not Receiving Events

1. Verify client is subscribed to the execution ID
2. Check that events are being emitted with the correct execution ID
3. Verify JWT token is valid

### Connection Drops

1. Check heartbeat mechanism is working
2. Verify network stability
3. Check server logs for errors

### High Memory Usage

1. Monitor number of connected clients
2. Check for memory leaks in event listeners
3. Verify connections are being cleaned up properly

## Next Steps

1. Add rate limiting for WebSocket connections
2. Implement message queuing for high-throughput scenarios
3. Add compression for large messages
4. Implement reconnection logic in clients
5. Add WebSocket metrics to monitoring dashboard

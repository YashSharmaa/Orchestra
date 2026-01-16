# Orchestra Observability Integration Guide

This guide shows how to integrate the observability features into your Orchestra backend.

## Quick Start

### 1. Initialize Observability

Add to your `src/index.ts` or main application file:

```typescript
import { initializeObservability } from '@/observability';
import logger from '@/utils/logger';

async function bootstrap() {
  try {
    // Initialize database, etc.
    await initDatabase();

    // Initialize observability
    const { tracer, metrics, monitor } = initializeObservability();

    // Start health monitoring (every 60 seconds)
    monitor.startMonitoring(60000);

    logger.info('Observability initialized', {
      tracerReady: true,
      metricsReady: true,
      monitoringActive: true,
    });

    // Create and start Express app
    const app = createApp();

    // ... rest of your bootstrap code
  } catch (error) {
    logger.error('Failed to bootstrap application', { error });
    process.exit(1);
  }
}

bootstrap();
```

### 2. Add Observability Routes

Update `src/api/routes/index.ts`:

```typescript
import { Router } from 'express';
import workflowRoutes from './workflows';
import executionRoutes from './executions';
import authRoutes from './auth';
import observabilityRoutes from './observability'; // Add this

const router = Router();

// Existing routes
router.use('/auth', authRoutes);
router.use('/workflows', workflowRoutes);
router.use('/executions', executionRoutes);

// Add observability routes
router.use('/observability', observabilityRoutes);

export default router;
```

### 3. Add HTTP Request Tracking Middleware

Update `src/app.ts`:

```typescript
import express, { Express, Request, Response, NextFunction } from 'express';
import { getMetrics } from '@/observability';
// ... other imports

export function createApp(): Express {
  const app = express();

  // ... existing middleware (helmet, cors, etc.)

  // Add metrics tracking middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    res.on('finish', () => {
      try {
        const duration = Date.now() - startTime;
        const metrics = getMetrics();

        // Sanitize path to avoid high cardinality
        const path = req.route?.path || req.path;
        metrics.recordHTTPRequest(req.method, path, res.statusCode, duration);
      } catch (error) {
        // Don't let metrics errors break the app
        logger.error('Failed to record HTTP metrics', { error });
      }
    });

    next();
  });

  // ... rest of your middleware and routes

  return app;
}
```

### 4. Update Health Check Endpoint

Replace the simple health check in `src/app.ts` with the full monitor:

```typescript
import { getMonitor } from '@/observability';

// Replace the simple health check
app.get('/health', async (req: Request, res: Response) => {
  try {
    const monitor = getMonitor();
    const health = await monitor.checkHealth();

    const statusCode = health.status === 'healthy' ? 200 :
                      health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date(),
      error: 'Health check failed',
    });
  }
});
```

## Workflow Execution Integration

### Update ExecutionController

Add tracing to `src/api/controllers/ExecutionController.ts`:

```typescript
import { getTracer, getMetrics } from '@/observability';
import logger from '@/utils/logger';

export class ExecutionController {
  async executeWorkflow(req: Request, res: Response) {
    const { workflowId } = req.params;
    const tracer = getTracer();
    const metrics = getMetrics();

    try {
      // Get workflow
      const workflow = await workflowRepo.findById(workflowId);
      if (!workflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }

      // Create execution record
      const execution = await executionRepo.create({
        workflowId,
        status: 'running',
        mode: 'manual',
        startTime: new Date(),
      });

      // Start trace
      const traceId = tracer.startTrace(execution.id, {
        workflowId: workflow.id,
        workflowName: workflow.name,
        userId: req.user?.id,
      });

      // Track active workflows
      metrics.incrementGauge('workflow_active');

      // Record workflow start
      tracer.recordWorkflowStart(
        traceId,
        workflow.id,
        workflow.name,
        'manual'
      );

      const startTime = Date.now();

      try {
        // Execute workflow
        const result = await this.executeWorkflowNodes(
          workflow,
          execution.id,
          traceId
        );

        // Calculate duration
        const duration = Date.now() - startTime;

        // Record success
        tracer.recordWorkflowEnd(traceId, workflow.id, 'success', duration);
        metrics.recordWorkflowExecution('success', 'manual', duration, workflow.id);

        // Update execution
        await executionRepo.update(execution.id, {
          status: 'success',
          endTime: new Date(),
          data: result,
        });

        res.json({
          executionId: execution.id,
          traceId,
          status: 'success',
          duration,
        });

      } catch (error: any) {
        const duration = Date.now() - startTime;

        // Record error
        tracer.recordWorkflowEnd(traceId, workflow.id, 'error', duration);
        metrics.recordWorkflowExecution('error', 'manual', duration, workflow.id);

        // Update execution
        await executionRepo.update(execution.id, {
          status: 'error',
          endTime: new Date(),
          error: {
            message: error.message,
            stack: error.stack,
            timestamp: new Date(),
          },
        });

        throw error;

      } finally {
        // End trace and decrement active workflows
        tracer.endTrace(traceId);
        metrics.decrementGauge('workflow_active');
      }

    } catch (error: any) {
      logger.error('Workflow execution failed', { error, workflowId });
      res.status(500).json({
        error: 'Execution failed',
        message: error.message,
      });
    }
  }

  private async executeWorkflowNodes(
    workflow: IWorkflow,
    executionId: string,
    traceId: string
  ) {
    const tracer = getTracer();
    const metrics = getMetrics();
    const results: any = {};

    for (const node of workflow.nodes) {
      // Skip disabled nodes
      if (node.disabled) continue;

      // Record node start
      tracer.recordNodeStart(traceId, node.id, node.name, node.type);
      const startTime = Date.now();

      try {
        // Execute node
        const nodeResult = await this.executeNode(node, executionId);
        results[node.id] = nodeResult;

        // Calculate duration
        const duration = Date.now() - startTime;

        // Record success
        tracer.recordNodeEnd(traceId, node.id, duration, 'success');
        metrics.recordNodeExecution(node.type, 'success', duration);

      } catch (error: any) {
        const duration = Date.now() - startTime;

        // Record error
        tracer.recordNodeError(traceId, node.id, error, duration);
        metrics.recordNodeExecution(node.type, 'error', duration);

        // Handle retry logic
        if (node.retryOnFail && node.maxRetries) {
          // Implement retry logic here
        } else {
          throw error;
        }
      }
    }

    return results;
  }

  private async executeNode(node: INode, executionId: string) {
    // Your node execution logic here
    // This would call the appropriate node type handler
  }
}
```

## Agent Execution Integration

### Update Agent Execution Logic

Add tracing to agent execution in `src/agents/`:

```typescript
import { getTracer, getMetrics } from '@/observability';
import logger from '@/utils/logger';

export class AgentExecutor {
  async executeAgent(
    agent: IAgent,
    message: IMessage,
    traceId: string
  ): Promise<any> {
    const tracer = getTracer();
    const metrics = getMetrics();

    // Record agent start
    tracer.recordAgentStart(traceId, agent.id, agent.name, agent.role);
    const startTime = Date.now();

    try {
      // Record incoming message
      tracer.recordAgentMessage(traceId, agent.id, message);
      metrics.recordAgentMessage(
        message.sender,
        message.receiver,
        message.performative
      );

      // Build prompt
      const prompt = this.buildPrompt(agent, message);

      // Call LLM
      const llmStart = Date.now();
      tracer.recordLLMRequest(
        traceId,
        agent.id,
        agent.model.model,
        agent.model.provider,
        prompt,
        {
          temperature: agent.model.temperature,
          maxTokens: agent.model.maxTokens,
        }
      );

      const llmResponse = await this.callLLM(agent.model, prompt);
      const llmDuration = Date.now() - llmStart;

      tracer.recordLLMResponse(
        traceId,
        agent.id,
        llmResponse.text,
        llmResponse.usage,
        llmDuration
      );

      metrics.recordLLMRequest(
        agent.model.provider,
        agent.model.model,
        'success',
        llmDuration,
        llmResponse.usage
      );

      // Parse and execute tools if needed
      const toolCalls = this.parseToolCalls(llmResponse.text);
      const toolResults = [];

      for (const toolCall of toolCalls) {
        const tool = agent.tools.find((t) => t.name === toolCall.name);
        if (!tool) continue;

        const toolStart = Date.now();
        tracer.recordToolCall(traceId, agent.id, tool.name, toolCall.params);

        try {
          const result = await tool.handler(toolCall.params);
          const toolDuration = Date.now() - toolStart;

          tracer.recordToolResult(traceId, agent.id, tool.name, result, toolDuration);
          metrics.recordToolCall(tool.name, 'success', toolDuration);

          toolResults.push({ tool: tool.name, result });

        } catch (error: any) {
          const toolDuration = Date.now() - toolStart;
          metrics.recordToolCall(tool.name, 'error', toolDuration);

          logger.error('Tool execution failed', {
            tool: tool.name,
            error: error.message,
            traceId,
          });
        }
      }

      // Record agent completion
      const duration = Date.now() - startTime;
      tracer.recordAgentEnd(traceId, agent.id, duration);
      metrics.recordAgentExecution(agent.id, 'success', duration);

      return {
        response: llmResponse.text,
        toolResults,
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;
      metrics.recordAgentExecution(agent.id, 'error', duration);

      logger.error('Agent execution failed', {
        agentId: agent.id,
        error: error.message,
        traceId,
      });

      throw error;
    }
  }

  private buildPrompt(agent: IAgent, message: IMessage): string {
    // Build prompt from system prompt, memory, and message
    return `${agent.systemPrompt}\n\nUser: ${message.content}`;
  }

  private async callLLM(
    model: IModelConfig,
    prompt: string
  ): Promise<{ text: string; usage: any }> {
    // Your LLM API call logic here
    // Return response text and token usage
    return {
      text: 'Response from LLM',
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
    };
  }

  private parseToolCalls(text: string): Array<{ name: string; params: any }> {
    // Parse tool calls from LLM response
    return [];
  }
}
```

## Environment Variables

Add to your `.env` file:

```bash
# Observability
METRICS_ENABLED=true
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE_ENABLED=true
LOG_FILE_PATH=./logs

# Optional: Disable auth for metrics endpoint in dev
# In production, protect these endpoints with authentication
```

## Docker Integration

### Docker Health Checks

Add to your `Dockerfile`:

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/observability/health || exit 1
```

### Docker Compose

Add to your `docker-compose.yml`:

```yaml
version: '3.8'

services:
  orchestra:
    build: .
    ports:
      - "3000:3000"
    environment:
      - METRICS_ENABLED=true
      - LOG_LEVEL=info
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/observability/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 40s

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana

volumes:
  grafana-storage:
```

### prometheus.yml

Create `prometheus.yml` for Prometheus configuration:

```yaml
global:
  scrape_interval: 30s
  evaluation_interval: 30s

scrape_configs:
  - job_name: 'orchestra'
    static_configs:
      - targets: ['orchestra:3000']
    metrics_path: '/api/observability/metrics'
    scrape_interval: 30s
```

## Kubernetes Integration

### Deployment with Health Probes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orchestra
  labels:
    app: orchestra
spec:
  replicas: 3
  selector:
    matchLabels:
      app: orchestra
  template:
    metadata:
      labels:
        app: orchestra
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/api/observability/metrics"
    spec:
      containers:
      - name: orchestra
        image: orchestra:latest
        ports:
        - containerPort: 3000
          name: http
        env:
        - name: METRICS_ENABLED
          value: "true"
        - name: LOG_LEVEL
          value: "info"
        livenessProbe:
          httpGet:
            path: /api/observability/live
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /api/observability/ready
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: orchestra
  labels:
    app: orchestra
spec:
  type: ClusterIP
  ports:
  - port: 3000
    targetPort: http
    protocol: TCP
    name: http
  selector:
    app: orchestra
```

## Testing Observability

### Manual Testing

```bash
# Check health
curl http://localhost:3000/api/observability/health

# Check readiness
curl http://localhost:3000/api/observability/ready

# Get metrics (Prometheus format)
curl http://localhost:3000/api/observability/metrics

# Get metrics (JSON format)
curl http://localhost:3000/api/observability/metrics/json

# Get diagnostics
curl http://localhost:3000/api/observability/diagnostics

# Get traces
curl http://localhost:3000/api/observability/traces

# Get specific trace
curl http://localhost:3000/api/observability/traces/{traceId}

# Get traces for execution
curl http://localhost:3000/api/observability/traces/execution/{executionId}
```

### Unit Tests

Create `src/observability/__tests__/`:

```typescript
import { getTracer, getMetrics, getMonitor } from '@/observability';

describe('Observability', () => {
  describe('Tracer', () => {
    it('should create and track traces', () => {
      const tracer = getTracer();
      const traceId = tracer.startTrace('exec-1', { test: true });

      tracer.recordWorkflowStart(traceId, 'wf-1', 'Test', 'manual');
      tracer.recordWorkflowEnd(traceId, 'wf-1', 'success', 1000);
      tracer.endTrace(traceId);

      const trace = tracer.getTrace(traceId);
      expect(trace).toBeDefined();
      expect(trace?.events).toHaveLength(2);
    });
  });

  describe('Metrics', () => {
    it('should record and export metrics', () => {
      const metrics = getMetrics();

      metrics.recordWorkflowExecution('success', 'manual', 1000, 'wf-1');

      const prometheus = metrics.toPrometheus();
      expect(prometheus).toContain('workflow_executions_total');
    });
  });

  describe('Monitor', () => {
    it('should check system health', async () => {
      const monitor = getMonitor();
      const health = await monitor.checkHealth();

      expect(health.status).toBeDefined();
      expect(health.components.memory).toBeDefined();
      expect(health.components.cpu).toBeDefined();
    });
  });
});
```

## Troubleshooting

### High Memory Usage

If traces consume too much memory:

1. Reduce trace TTL in `tracer.ts`
2. Decrease `maxTraces` limit
3. Implement external trace storage

### Metrics Not Appearing

1. Check `METRICS_ENABLED=true` in environment
2. Verify routes are properly mounted
3. Check Prometheus scrape configuration
4. Look for errors in application logs

### Health Checks Failing

1. Ensure database is initialized before health checks
2. Check database connection settings
3. Review component health check logs
4. Verify network connectivity

## Next Steps

1. **Set up Grafana dashboards** for visualization
2. **Configure alerting** for critical metrics
3. **Implement trace export** to external storage
4. **Add custom metrics** for your specific use cases
5. **Set up log aggregation** with ELK or similar

## Support

For issues or questions:
- Check the main README.md
- Review example integrations
- Check application logs
- Open an issue on GitHub

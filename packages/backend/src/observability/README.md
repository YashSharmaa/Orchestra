# Orchestra Observability

Comprehensive observability features for Orchestra including execution tracing, metrics collection, and system health monitoring.

## Overview

The observability module provides three main components:

1. **Tracer** - Execution tracing for workflows, nodes, and agents
2. **Metrics** - Prometheus-compatible metrics collection
3. **Monitor** - System health monitoring and diagnostics

## Components

### Tracer (`tracer.ts`)

Records detailed trace events for workflow and agent execution monitoring.

#### Features

- In-memory trace storage with automatic TTL cleanup
- Support for all trace event types (workflow, node, agent, tool, LLM)
- Trace export in JSON format
- Automatic trace lifecycle management

#### Usage

```typescript
import { getTracer } from '@/observability';

const tracer = getTracer();

// Start a new trace
const traceId = tracer.startTrace('execution-123', {
  workflowId: 'wf-456',
  user: 'user@example.com'
});

// Record workflow events
tracer.recordWorkflowStart(traceId, 'wf-456', 'My Workflow', 'manual');
tracer.recordNodeStart(traceId, 'node-1', 'HTTP Request', 'http');
tracer.recordNodeEnd(traceId, 'node-1', 1234, 'success');
tracer.recordWorkflowEnd(traceId, 'wf-456', 'success', 5678);

// Record agent events
tracer.recordAgentStart(traceId, 'agent-1', 'Assistant', 'helper');
tracer.recordAgentMessage(traceId, 'agent-1', {
  sender: 'user',
  receiver: 'agent-1',
  performative: 'request',
  content: 'Help me with this task'
});

// Record LLM events
tracer.recordLLMRequest(traceId, 'agent-1', 'gpt-4', 'openai', prompt, { temperature: 0.7 });
tracer.recordLLMResponse(traceId, 'agent-1', response, {
  promptTokens: 100,
  completionTokens: 50,
  totalTokens: 150
}, 2000);

// Record tool calls
tracer.recordToolCall(traceId, 'agent-1', 'web-search', { query: 'example' });
tracer.recordToolResult(traceId, 'agent-1', 'web-search', results, 1500);

// End the trace
tracer.endTrace(traceId);

// Retrieve traces
const trace = tracer.getTrace(traceId);
const executionTraces = tracer.getTracesByExecution('execution-123');
const allTraces = tracer.getAllTraces();

// Export traces
const jsonExport = tracer.exportTrace(traceId);
const allTracesExport = tracer.exportAllTraces();
```

#### API Methods

| Method | Description |
|--------|-------------|
| `startTrace(executionId, metadata)` | Start a new trace for an execution |
| `endTrace(traceId)` | End a trace and calculate duration |
| `recordEvent(traceId, type, data, options)` | Record a generic trace event |
| `recordWorkflowStart/End(...)` | Record workflow lifecycle events |
| `recordNodeStart/End/Error(...)` | Record node execution events |
| `recordAgentStart/End/Message(...)` | Record agent events |
| `recordToolCall/Result(...)` | Record tool execution events |
| `recordLLMRequest/Response(...)` | Record LLM API calls |
| `getTrace(traceId)` | Get a trace by ID |
| `getTracesByExecution(executionId)` | Get all traces for an execution |
| `getAllTraces()` | Get all traces |
| `clearTraces()` | Clear all traces |

### Metrics (`metrics.ts`)

Prometheus-compatible metrics collection with support for counters, gauges, and histograms.

#### Features

- Counter, Gauge, and Histogram metrics
- Label support for multi-dimensional metrics
- Automatic Prometheus format export
- JSON export for debugging
- Pre-configured Orchestra metrics

#### Default Metrics

**Workflow Metrics:**
- `workflow_executions_total` - Total workflow executions (counter)
- `workflow_errors_total` - Total workflow errors (counter)
- `workflow_duration_seconds` - Workflow duration (histogram)
- `workflow_active` - Active workflows (gauge)

**Node Metrics:**
- `node_executions_total` - Total node executions (counter)
- `node_errors_total` - Total node errors (counter)
- `node_duration_seconds` - Node duration (histogram)

**Agent Metrics:**
- `agent_executions_total` - Total agent executions (counter)
- `agent_messages_total` - Total agent messages (counter)
- `agent_duration_seconds` - Agent duration (histogram)

**LLM Metrics:**
- `llm_requests_total` - Total LLM requests (counter)
- `llm_tokens_total` - Total tokens used (counter)
- `llm_request_duration_seconds` - LLM request duration (histogram)

**Tool Metrics:**
- `tool_calls_total` - Total tool calls (counter)
- `tool_duration_seconds` - Tool duration (histogram)

**System Metrics:**
- `system_memory_usage_bytes` - Memory usage (gauge)
- `system_cpu_usage_percent` - CPU usage (gauge)
- `database_connections_active` - DB connections (gauge)
- `redis_queue_depth` - Redis queue depth (gauge)

**HTTP Metrics:**
- `http_requests_total` - Total HTTP requests (counter)
- `http_request_duration_seconds` - HTTP duration (histogram)

#### Usage

```typescript
import { getMetrics } from '@/observability';

const metrics = getMetrics();

// Record workflow execution
metrics.recordWorkflowExecution('success', 'manual', 5000, 'wf-123');

// Record node execution
metrics.recordNodeExecution('http-request', 'success', 1234);

// Record agent execution
metrics.recordAgentExecution('agent-1', 'success', 2345);
metrics.recordAgentMessage('user', 'agent-1', 'request');

// Record LLM request
metrics.recordLLMRequest('openai', 'gpt-4', 'success', 2000, {
  prompt: 100,
  completion: 50,
  total: 150
});

// Record tool call
metrics.recordToolCall('web-search', 'success', 1500);

// Record HTTP request
metrics.recordHTTPRequest('GET', '/api/workflows', 200, 234);

// Manual metric manipulation
metrics.incrementCounter('custom_counter', { label: 'value' });
metrics.setGauge('custom_gauge', 42, { label: 'value' });
metrics.observeHistogram('custom_histogram', 1.234, { label: 'value' });

// Export metrics
const prometheus = metrics.toPrometheus(); // Prometheus format
const json = metrics.toJSON(); // JSON format

// Reset metrics
metrics.reset();
```

#### Custom Metrics

```typescript
const metrics = getMetrics();

// Register custom metrics
metrics.registerCounter('my_counter', 'My custom counter', ['label1', 'label2']);
metrics.registerGauge('my_gauge', 'My custom gauge', ['label']);
metrics.registerHistogram('my_histogram', 'My custom histogram', ['label'], [0.1, 0.5, 1, 5]);

// Use custom metrics
metrics.incrementCounter('my_counter', { label1: 'a', label2: 'b' });
metrics.setGauge('my_gauge', 100, { label: 'test' });
metrics.observeHistogram('my_histogram', 2.5, { label: 'test' });
```

### Monitor (`monitor.ts`)

System health monitoring and diagnostics.

#### Features

- Database connection health checks
- Redis connection health checks (if enabled)
- Memory usage monitoring
- CPU usage monitoring
- Disk space monitoring
- Periodic health checks
- Ready/live probes for Kubernetes

#### Health Statuses

- `healthy` - System is operating normally
- `degraded` - System is operational but performance is impacted
- `unhealthy` - System has critical issues

#### Usage

```typescript
import { getMonitor } from '@/observability';

const monitor = getMonitor();

// Start periodic monitoring (every 60 seconds)
monitor.startMonitoring(60000);

// Perform health check
const health = await monitor.checkHealth();
console.log(health.status); // 'healthy', 'degraded', or 'unhealthy'
console.log(health.components.database);
console.log(health.components.memory);
console.log(health.components.cpu);

// Get last health check result
const lastHealth = monitor.getLastHealthCheck();

// Get comprehensive diagnostics
const diagnostics = await monitor.getDiagnostics();

// Kubernetes probes
const ready = await monitor.isReady(); // Readiness probe
const alive = monitor.isAlive(); // Liveness probe

// Stop monitoring
monitor.stopMonitoring();
```

#### Health Check Response

```typescript
{
  status: 'healthy',
  timestamp: Date,
  uptime: 3600, // seconds
  version: '0.1.0',
  components: {
    database: {
      status: 'healthy',
      message: 'Database connection healthy',
      details: { type: 'postgres', database: 'orchestra' },
      timestamp: Date,
      responseTime: 12 // ms
    },
    redis: {
      status: 'healthy',
      message: 'Redis connection healthy',
      details: { queueDepth: 5 },
      timestamp: Date,
      responseTime: 8
    },
    memory: {
      status: 'healthy',
      message: 'Memory usage normal',
      details: {
        heapUsed: '45.2 MB',
        heapTotal: '78.5 MB',
        heapPercent: '57.58%',
        systemUsedPercent: '65.23%'
      },
      timestamp: Date,
      responseTime: 2
    },
    cpu: {
      status: 'healthy',
      message: 'CPU usage normal',
      details: {
        cores: 8,
        usage: '23.45%',
        loadAverage: { '1min': '1.23', '5min': '1.45', '15min': '1.67' },
        normalizedLoad: '0.15'
      },
      timestamp: Date,
      responseTime: 3
    }
  },
  metrics: {
    activeWorkflows: 3,
    totalExecutions: 1234,
    errorRate: 2.5 // percentage
  }
}
```

## API Endpoints

Add the observability routes to your API:

```typescript
import { Router } from 'express';
import observabilityRoutes from './routes/observability';

const router = Router();
router.use('/observability', observabilityRoutes);
```

### Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/observability/metrics` | GET | Prometheus format metrics |
| `/api/observability/metrics/json` | GET | JSON format metrics |
| `/api/observability/metrics/reset` | POST | Reset all metrics |
| `/api/observability/health` | GET | System health status |
| `/api/observability/ready` | GET | Readiness probe |
| `/api/observability/live` | GET | Liveness probe |
| `/api/observability/diagnostics` | GET | Full system diagnostics |
| `/api/observability/traces` | GET | Get all traces |
| `/api/observability/traces/:traceId` | GET | Get specific trace |
| `/api/observability/traces/execution/:executionId` | GET | Get traces for execution |
| `/api/observability/traces/:traceId/export` | GET | Export trace as JSON |
| `/api/observability/traces` | DELETE | Clear all traces |

## Integration Examples

### Workflow Execution Tracing

```typescript
import { getTracer, getMetrics } from '@/observability';

async function executeWorkflow(workflow: IWorkflow, executionId: string) {
  const tracer = getTracer();
  const metrics = getMetrics();

  // Start trace
  const traceId = tracer.startTrace(executionId, {
    workflowId: workflow.id,
    workflowName: workflow.name,
  });

  // Track active workflows
  metrics.incrementGauge('workflow_active');

  const startTime = Date.now();

  try {
    tracer.recordWorkflowStart(traceId, workflow.id, workflow.name, 'manual');

    // Execute nodes
    for (const node of workflow.nodes) {
      await executeNode(node, traceId);
    }

    const duration = Date.now() - startTime;
    tracer.recordWorkflowEnd(traceId, workflow.id, 'success', duration);
    metrics.recordWorkflowExecution('success', 'manual', duration, workflow.id);

  } catch (error) {
    const duration = Date.now() - startTime;
    tracer.recordWorkflowEnd(traceId, workflow.id, 'error', duration);
    metrics.recordWorkflowExecution('error', 'manual', duration, workflow.id);
    throw error;

  } finally {
    tracer.endTrace(traceId);
    metrics.decrementGauge('workflow_active');
  }
}

async function executeNode(node: INode, traceId: string) {
  const tracer = getTracer();
  const metrics = getMetrics();

  tracer.recordNodeStart(traceId, node.id, node.name, node.type);
  const startTime = Date.now();

  try {
    // Execute node logic
    const result = await executeNodeLogic(node);

    const duration = Date.now() - startTime;
    tracer.recordNodeEnd(traceId, node.id, duration, 'success');
    metrics.recordNodeExecution(node.type, 'success', duration);

    return result;

  } catch (error) {
    const duration = Date.now() - startTime;
    tracer.recordNodeError(traceId, node.id, error, duration);
    metrics.recordNodeExecution(node.type, 'error', duration);
    throw error;
  }
}
```

### Agent Execution Tracing

```typescript
import { getTracer, getMetrics } from '@/observability';

async function executeAgent(agent: IAgent, traceId: string) {
  const tracer = getTracer();
  const metrics = getMetrics();

  tracer.recordAgentStart(traceId, agent.id, agent.name, agent.role);
  const startTime = Date.now();

  try {
    // Agent processes message
    const message = await receiveMessage();
    tracer.recordAgentMessage(traceId, agent.id, message);
    metrics.recordAgentMessage(message.sender, message.receiver, message.performative);

    // Call LLM
    const llmStart = Date.now();
    const response = await callLLM(agent.model, prompt);
    const llmDuration = Date.now() - llmStart;

    tracer.recordLLMRequest(traceId, agent.id, agent.model.model, agent.model.provider, prompt, {});
    tracer.recordLLMResponse(traceId, agent.id, response.text, response.usage, llmDuration);
    metrics.recordLLMRequest(agent.model.provider, agent.model.model, 'success', llmDuration, response.usage);

    // Use tools
    for (const tool of agent.tools) {
      const toolStart = Date.now();
      tracer.recordToolCall(traceId, agent.id, tool.name, params);

      const result = await tool.handler(params);
      const toolDuration = Date.now() - toolStart;

      tracer.recordToolResult(traceId, agent.id, tool.name, result, toolDuration);
      metrics.recordToolCall(tool.name, 'success', toolDuration);
    }

    const duration = Date.now() - startTime;
    tracer.recordAgentEnd(traceId, agent.id, duration);
    metrics.recordAgentExecution(agent.id, 'success', duration);

  } catch (error) {
    const duration = Date.now() - startTime;
    metrics.recordAgentExecution(agent.id, 'error', duration);
    throw error;
  }
}
```

### HTTP Request Tracking

```typescript
import { getMetrics } from '@/observability';

// Express middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const metrics = getMetrics();
    metrics.recordHTTPRequest(req.method, req.path, res.statusCode, duration);
  });

  next();
});
```

## Prometheus Integration

### Scrape Configuration

Add to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'orchestra'
    scrape_interval: 30s
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/observability/metrics'
```

### Grafana Dashboard

Import metrics into Grafana for visualization:

1. Workflow execution rate: `rate(workflow_executions_total[5m])`
2. Error rate: `rate(workflow_errors_total[5m])`
3. Average duration: `histogram_quantile(0.95, rate(workflow_duration_seconds_bucket[5m]))`
4. Active workflows: `workflow_active`
5. LLM token usage: `rate(llm_tokens_total[5m])`

## Kubernetes Health Probes

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: orchestra
    livenessProbe:
      httpGet:
        path: /api/observability/live
        port: 3000
      initialDelaySeconds: 30
      periodSeconds: 10
    readinessProbe:
      httpGet:
        path: /api/observability/ready
        port: 3000
      initialDelaySeconds: 5
      periodSeconds: 5
```

## Configuration

Enable/disable observability features in your `.env`:

```bash
# Enable metrics collection
METRICS_ENABLED=true

# Logging level
LOG_LEVEL=info
LOG_FORMAT=json
```

## Best Practices

1. **Trace Management**: Traces are kept in memory with a 24-hour TTL. For long-term storage, export traces periodically.

2. **Metric Labels**: Use meaningful labels but avoid high cardinality (e.g., don't use user IDs as labels).

3. **Performance**: Observability has minimal overhead, but be mindful of trace event volume in high-throughput scenarios.

4. **Security**: Add authentication middleware to admin endpoints (reset metrics, clear traces) in production.

5. **Monitoring**: Set up alerts for:
   - High error rates
   - Degraded/unhealthy components
   - High memory/CPU usage
   - Slow response times

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Orchestra Application                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │  Tracer  │  │ Metrics  │  │ Monitor  │                 │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                 │
│       │             │             │                         │
│  ┌────▼─────────────▼─────────────▼──────┐                │
│  │      In-Memory Storage                 │                │
│  │  - Traces (24h TTL)                    │                │
│  │  - Counters, Gauges, Histograms        │                │
│  └────────────────────────────────────────┘                │
│                       │                                      │
└───────────────────────┼──────────────────────────────────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
    ┌────▼────┐   ┌─────▼─────┐  ┌────▼────┐
    │Prometheus│   │  Grafana  │  │   API   │
    └──────────┘   └───────────┘  └─────────┘
```

## License

Apache-2.0

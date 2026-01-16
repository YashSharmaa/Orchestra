# Orchestra Node Types

This directory contains all node type implementations for the Orchestra workflow engine.

## Structure

```
src/nodes/
├── base/
│   └── NodeBase.ts          # Abstract base class for all nodes
├── actions/
│   ├── HttpRequest.ts       # HTTP API calls
│   └── SendEmail.ts         # Email sending via SMTP
├── logic/
│   ├── If.ts               # Conditional branching (true/false)
│   └── Switch.ts           # Multi-way branching (4 outputs)
├── transform/
│   ├── Set.ts              # Set/transform data fields
│   └── Filter.ts           # Filter array items
├── triggers/
│   ├── Webhook.ts          # HTTP webhook trigger
│   └── Schedule.ts         # Cron schedule trigger
├── integrations/
│   └── Database.ts         # Database queries (PostgreSQL)
├── NodeRegistry.ts         # Central registry for all node types
└── index.ts               # Export index
```

## Statistics

- Total files: 12
- Total lines of code: ~3,507
- Node types: 9 (2 triggers, 2 actions, 2 logic, 2 transform, 1 integration)

## Usage

### Registering Nodes

```typescript
import { nodeRegistry } from '@/nodes';

// Get all registered nodes
const allNodes = nodeRegistry.getAllNodes();

// Get a specific node
const httpNode = nodeRegistry.getNode('httpRequest');

// Get nodes by group
const triggers = nodeRegistry.getTriggerNodes();
```

### Executing a Node

```typescript
import { nodeRegistry } from '@/nodes';

const node = nodeRegistry.getNode('httpRequest');
const result = await node.execute(context);
```

## Node Capabilities

### Action Nodes

- **HttpRequest**: Make HTTP requests with authentication, headers, query params, and body
- **SendEmail**: Send emails via SMTP with attachments, HTML/text content, CC/BCC

### Logic Nodes

- **If**: Conditional branching with simple conditions or expressions
- **Switch**: Multi-way branching (4 outputs) based on rules or expressions

### Transform Nodes

- **Set**: Set/modify data fields with variable substitution and expressions
- **Filter**: Filter items based on conditions (simple or expression mode)

### Trigger Nodes

- **Webhook**: Receive HTTP webhooks with authentication
- **Schedule**: Cron-based scheduling with multiple configuration modes

### Integration Nodes

- **Database**: Execute PostgreSQL queries (SELECT, INSERT, UPDATE, DELETE)

## Features

All nodes include:
- Complete TypeScript types
- Error handling
- Variable substitution ({{$json.field}})
- Expression evaluation
- Input/output data handling
- Proper parameter validation
- Logging support

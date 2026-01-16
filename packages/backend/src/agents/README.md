# Orchestra Agent Orchestration Module

Complete AI/Agent orchestration system with hierarchical multi-agent coordination.

## Architecture Overview

### Core Components

1. **Agent** (`Agent.ts`)
   - Single agent with LLM integration
   - Supports both ReAct and function-calling patterns
   - Tool usage and memory management
   - Azure OpenAI integration

2. **AgentGroup** (`AgentGroup.ts`)
   - Group of agents working collaboratively
   - Coordinator-based task distribution
   - Shared blackboard memory
   - Inter-agent messaging

3. **System1** (`orchestrator/System1.ts`)
   - Tactical coordination of agent groups
   - Operational-level orchestration
   - Parallel and sequential execution strategies

4. **System2** (`orchestrator/System2.ts`)
   - Strategic coordination of System1 units
   - Department-level orchestration
   - Strategic planning and synthesis

5. **System3** (`orchestrator/System3.ts`)
   - Enterprise-wide orchestration
   - Top-level mission coordination
   - Quality assurance and validation

## Key Features

### LLM Integration
- Azure OpenAI API support
- OpenAI API support
- Function calling and tool usage
- Embedding generation for memory
- Configurable model parameters

### Memory Systems
- **Short-term Memory**: Recent conversation history
- **Long-term Memory**: Vector-based similarity search
- **Blackboard**: Shared memory pattern for collaboration

### Messaging
- **MessageBus**: Inter-agent communication
- FIPA-ACL inspired performatives
- Conversation tracking
- Event-driven architecture

### Tool System
- **ToolRegistry**: Centralized tool management
- **BasicTools**: Calculator, web search, HTTP, datetime, JSON parser, string manipulation
- Extensible tool framework
- OpenAI function format support

## Usage Examples

### Creating a Simple Agent

```typescript
import { createAgent, DefaultModels, getBasicTools } from '@/agents';

const agent = createAgent({
  name: 'Research Assistant',
  role: 'Research Specialist',
  systemPrompt: 'You are a helpful research assistant...',
  model: DefaultModels.GPT4,
  tools: getBasicTools(),
  settings: {
    maxIterations: 20,
    timeout: 120000,
    mode: 'function-calling',
  },
});

// Execute a task
const result = await agent.execute('Find information about quantum computing');
console.log(result.response);
```

### Creating an Agent Group

```typescript
import { createAgent, createAgentGroup, DefaultModels } from '@/agents';

const coordinator = createAgent({
  name: 'Team Lead',
  role: 'Coordinator',
  systemPrompt: 'You coordinate a team of specialists...',
  model: DefaultModels.GPT4,
});

const researcher = createAgent({
  name: 'Researcher',
  role: 'Research Specialist',
  systemPrompt: 'You conduct research...',
  model: DefaultModels.GPT4,
});

const analyst = createAgent({
  name: 'Analyst',
  role: 'Data Analyst',
  systemPrompt: 'You analyze data...',
  model: DefaultModels.GPT4,
});

const group = createAgentGroup({
  name: 'Research Team',
  coordinator,
  members: [researcher, analyst],
});

const result = await group.execute('Analyze market trends in AI');
```

### Creating a System1 Unit

```typescript
import { createSystem1, AgentSystem } from '@/agents';

const system1 = createSystem1({
  name: 'Operations Unit',
  coordinator: AgentSystem.createSimpleAgent(
    'Operations Coordinator',
    'Tactical Coordinator',
    'You coordinate operational tasks...',
    DefaultModels.GPT4
  ),
  agentGroups: [researchGroup, analysisGroup],
});

const result = await system1.execute('Complete market analysis project');
```

### Using Quick Start Helpers

```typescript
import { QuickStart, DefaultModels } from '@/agents';

// Create specialized agents quickly
const researcher = QuickStart.createResearchAgent(DefaultModels.GPT4);
const analyst = QuickStart.createDataAnalysisAgent(DefaultModels.GPT4);
const planner = QuickStart.createPlanningAgent(DefaultModels.GPT4);
const qa = QuickStart.createQAAgent(DefaultModels.GPT4);
```

### Initializing the System

```typescript
import { AgentSystem } from '@/agents';

// Initialize with basic tools
AgentSystem.initialize();

// Get shared resources
const toolRegistry = AgentSystem.getToolRegistry();
const messageBus = AgentSystem.getMessageBus();
```

## Configuration

Configure Azure OpenAI in your `.env` file:

```env
AZURE_OPENAI_ENABLED=true
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your_api_key
AZURE_OPENAI_DEPLOYMENT=gpt-4
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002
AZURE_OPENAI_API_VERSION=2024-02-01
```

## Tool Development

Create custom tools:

```typescript
import { ITool } from '@/types';
import { getToolRegistry } from '@/agents';

const myCustomTool: ITool = {
  name: 'my_tool',
  description: 'Does something useful',
  parameters: {
    type: 'object',
    properties: {
      input: { type: 'string', description: 'Input parameter' },
    },
    required: ['input'],
  },
  handler: async (params) => {
    // Tool implementation
    return { result: 'success' };
  },
};

// Register the tool
const registry = getToolRegistry();
registry.register(myCustomTool);
```

## Patterns

### ReAct Pattern

Agents use the ReAct (Reasoning + Acting) pattern:
1. **Thought**: Reason about what to do
2. **Action**: Select and execute a tool
3. **Observation**: Observe the result
4. Repeat until reaching final answer

### Function Calling

Modern function calling with tool use:
1. Agent receives task
2. LLM determines which tools to call
3. Tools are executed
4. Results are fed back to LLM
5. Process continues until completion

### Blackboard Pattern

Shared memory for collaboration:
- Agents write to blackboard
- Other agents read from blackboard
- Event-based subscriptions
- History tracking

## Best Practices

1. **Agent Design**
   - Give agents clear, specific roles
   - Write detailed system prompts
   - Limit tool sets to relevant tools
   - Set appropriate timeouts

2. **Memory Management**
   - Clean up short-term memory regularly
   - Use long-term memory for important information
   - Set TTLs on temporary data
   - Monitor memory usage

3. **Tool Usage**
   - Validate tool parameters
   - Handle errors gracefully
   - Log tool executions
   - Set reasonable timeouts

4. **Orchestration**
   - Start simple (single agent)
   - Add groups when needed
   - Use System1/2/3 for complex scenarios
   - Monitor execution metrics

## Performance Considerations

- **Caching**: LLM responses can be cached
- **Parallel Execution**: Use when tasks are independent
- **Tool Limits**: Set maxToolCalls to prevent loops
- **Timeouts**: Configure appropriate timeouts
- **Memory**: Monitor and clean up regularly

## Monitoring

Track execution with built-in metrics:

```typescript
// Agent stats
const stats = agent.getStats();

// Group status
const status = group.getStatus();

// System metrics
const metrics = system3.getMetrics();
```

## Error Handling

All components include comprehensive error handling:
- Timeouts
- Failed tool calls
- LLM errors
- Network issues
- Invalid configurations

## Future Enhancements

- Streaming responses
- Advanced memory systems (external vector stores)
- Multi-modal agents (vision, audio)
- Agent learning and adaptation
- Performance optimization
- Enhanced monitoring and observability

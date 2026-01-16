/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Single agent implementation with LLM integration
 */

import { v4 as uuidv4 } from 'uuid';
import { IAgent, IMessage, ITool, IAgentMemory, IAgentSettings } from '@/types';
import { log } from '@/utils/logger';
import { LLMProvider, LLMMessage } from './LLMProvider';
import { LongTermMemory } from './memory/LongTermMemory';
import { getToolRegistry } from './tools/ToolRegistry';
import { MessageBus } from './messaging/MessageBus';

/**
 * Agent execution result
 */
export interface AgentExecutionResult {
  success: boolean;
  response: string;
  toolCalls: Array<{ tool: string; params: any; result: any }>;
  iterations: number;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Single agent with LLM and tool capabilities
 */
export class Agent implements IAgent {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  model: any;
  tools: ITool[];
  memory: IAgentMemory;
  settings: IAgentSettings;

  private llmProvider: LLMProvider;
  private longTermMemory: LongTermMemory;
  private messageBus?: MessageBus;
  private toolRegistry = getToolRegistry();

  constructor(config: {
    id?: string;
    name: string;
    role: string;
    systemPrompt: string;
    model: any;
    tools?: ITool[];
    settings?: Partial<IAgentSettings>;
    messageBus?: MessageBus;
  }) {
    this.id = config.id || uuidv4();
    this.name = config.name;
    this.role = config.role;
    this.systemPrompt = config.systemPrompt;
    this.model = config.model;
    this.tools = config.tools || [];
    this.messageBus = config.messageBus;

    this.settings = {
      maxIterations: config.settings?.maxIterations || 20,
      timeout: config.settings?.timeout || 120000,
      mode: config.settings?.mode || 'function-calling',
      allowedDomains: config.settings?.allowedDomains || [],
      maxToolCalls: config.settings?.maxToolCalls || 50,
    };

    // Initialize LLM provider
    this.llmProvider = new LLMProvider(this.model);

    // Initialize memories
    this.longTermMemory = new LongTermMemory(this.id, this.llmProvider);
    this.memory = {
      shortTerm: [],
      longTerm: [],
      blackboard: {},
    };

    // Register tools
    this.tools.forEach((tool) => {
      if (!this.toolRegistry.has(tool.name)) {
        this.toolRegistry.register(tool);
      }
    });

    log.info('Agent initialized', {
      id: this.id,
      name: this.name,
      role: this.role,
      mode: this.settings.mode,
    });
  }

  /**
   * Execute agent with a task/query
   */
  async execute(input: string, context?: Record<string, any>): Promise<AgentExecutionResult> {
    log.info('Agent execution started', { agentId: this.id, name: this.name });

    const startTime = Date.now();
    const toolCalls: Array<{ tool: string; params: any; result: any }> = [];
    let iterations = 0;

    try {
      // Check timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Agent execution timeout')), this.settings.timeout);
      });

      const executionPromise = this.settings.mode === 'react'
        ? this.executeReAct(input, context, toolCalls)
        : this.executeFunctionCalling(input, context, toolCalls);

      const response = await Promise.race([executionPromise, timeoutPromise]);

      const duration = Date.now() - startTime;

      // Store in long-term memory
      await this.longTermMemory.store(
        `Input: ${input}\nOutput: ${response}`,
        { type: 'execution', context, duration }
      );

      log.info('Agent execution completed', {
        agentId: this.id,
        duration,
        toolCallCount: toolCalls.length,
      });

      return {
        success: true,
        response,
        toolCalls,
        iterations,
        metadata: { duration, agentId: this.id, name: this.name },
      };
    } catch (error: any) {
      log.error('Agent execution failed', {
        agentId: this.id,
        error: error.message,
      });

      return {
        success: false,
        response: '',
        toolCalls,
        iterations,
        error: error.message,
      };
    }
  }

  /**
   * Execute using function calling mode
   */
  private async executeFunctionCalling(
    input: string,
    context?: Record<string, any>,
    toolCalls: Array<{ tool: string; params: any; result: any }> = []
  ): Promise<string> {
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: this.buildSystemPrompt(context),
      },
      ...this.memory.shortTerm.map((msg) => ({
        role: msg.sender === this.id ? 'assistant' as const : 'user' as const,
        content: msg.content,
      })),
      {
        role: 'user',
        content: input,
      },
    ];

    let iteration = 0;
    const maxIterations = this.settings.maxIterations || 20;

    while (iteration < maxIterations) {
      iteration++;

      // Get completion from LLM
      const completion = await this.llmProvider.complete({
        messages,
        tools: this.toolRegistry.toOpenAITools(this.tools.map((t) => t.name)),
        temperature: this.model.temperature,
        maxTokens: this.model.maxTokens,
      });

      // Check if we have tool calls
      if (completion.toolCalls && completion.toolCalls.length > 0) {
        // Execute each tool call
        for (const toolCall of completion.toolCalls) {
          const toolName = toolCall.function.name;
          const toolParams = JSON.parse(toolCall.function.arguments);

          log.debug('Executing tool', { tool: toolName, params: toolParams });

          const result = await this.toolRegistry.execute(toolName, toolParams);

          toolCalls.push({
            tool: toolName,
            params: toolParams,
            result,
          });

          // Add tool result to messages
          messages.push({
            role: 'assistant',
            content: '',
            tool_calls: [toolCall],
          });

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }

        // Check if we've hit max tool calls
        if (toolCalls.length >= (this.settings.maxToolCalls || 50)) {
          log.warn('Max tool calls reached', { agentId: this.id });
          break;
        }

        // Continue loop to get next response
        continue;
      }

      // No tool calls, return the response
      return completion.content;
    }

    throw new Error('Max iterations reached without completion');
  }

  /**
   * Execute using ReAct (Reasoning + Acting) pattern
   */
  private async executeReAct(
    input: string,
    context?: Record<string, any>,
    toolCalls: Array<{ tool: string; params: any; result: any }> = []
  ): Promise<string> {
    const thoughts: string[] = [];
    let iteration = 0;
    const maxIterations = this.settings.maxIterations || 20;

    const reactPrompt = this.buildReActPrompt(input, context);
    let conversationHistory = reactPrompt;

    while (iteration < maxIterations) {
      iteration++;

      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: this.buildSystemPrompt(context),
        },
        {
          role: 'user',
          content: conversationHistory,
        },
      ];

      const completion = await this.llmProvider.complete({
        messages,
        temperature: this.model.temperature,
        maxTokens: this.model.maxTokens,
      });

      const response = completion.content;
      thoughts.push(response);

      // Parse ReAct response
      const action = this.parseReActAction(response);

      if (action.type === 'answer') {
        // Final answer reached
        return action.content;
      } else if (action.type === 'action') {
        // Execute action
        log.debug('ReAct action', { action: action.tool, params: action.params });

        const result = await this.toolRegistry.execute(action.tool!, action.params);

        toolCalls.push({
          tool: action.tool!,
          params: action.params,
          result,
        });

        // Add observation to conversation
        conversationHistory += `\n\n${response}\n\nObservation: ${JSON.stringify(result)}`;

        // Check tool call limit
        if (toolCalls.length >= (this.settings.maxToolCalls || 50)) {
          log.warn('Max tool calls reached in ReAct', { agentId: this.id });
          break;
        }
      } else {
        // Continue thinking
        conversationHistory += `\n\n${response}`;
      }
    }

    throw new Error('Max iterations reached in ReAct without final answer');
  }

  /**
   * Build system prompt with context
   */
  private buildSystemPrompt(context?: Record<string, any>): string {
    let prompt = this.systemPrompt;

    if (context) {
      prompt += `\n\nContext:\n${JSON.stringify(context, null, 2)}`;
    }

    // Add tool descriptions for ReAct mode
    if (this.settings.mode === 'react' && this.tools.length > 0) {
      prompt += '\n\nAvailable Tools:\n';
      this.tools.forEach((tool) => {
        prompt += `- ${tool.name}: ${tool.description}\n`;
      });
    }

    return prompt;
  }

  /**
   * Build ReAct prompt
   */
  private buildReActPrompt(input: string, context?: Record<string, any>): string {
    let prompt = `You are ${this.name}, ${this.role}.

Use the following format:

Thought: Your reasoning about what to do
Action: The action to take (use tool name)
Action Input: The input to the action (JSON format)
Observation: The result of the action
... (repeat Thought/Action/Action Input/Observation as needed)
Thought: I now know the final answer
Answer: The final answer to the user

Question: ${input}

Let's begin!

Thought:`;

    return prompt;
  }

  /**
   * Parse ReAct response to extract action
   */
  private parseReActAction(response: string): {
    type: 'thought' | 'action' | 'answer';
    content: string;
    tool?: string;
    params?: any;
  } {
    // Check for final answer
    if (response.includes('Answer:')) {
      const answerMatch = response.match(/Answer:\s*(.+)/s);
      return {
        type: 'answer',
        content: answerMatch ? answerMatch[1].trim() : response,
      };
    }

    // Check for action
    if (response.includes('Action:')) {
      const actionMatch = response.match(/Action:\s*(\w+)/);
      const inputMatch = response.match(/Action Input:\s*({[\s\S]*?}|\{[^}]*\}|[^\n]+)/);

      if (actionMatch) {
        let params = {};
        if (inputMatch) {
          try {
            params = JSON.parse(inputMatch[1]);
          } catch {
            // If not valid JSON, treat as string
            params = { input: inputMatch[1].trim() };
          }
        }

        return {
          type: 'action',
          content: response,
          tool: actionMatch[1],
          params,
        };
      }
    }

    // Just a thought
    return {
      type: 'thought',
      content: response,
    };
  }

  /**
   * Add message to short-term memory
   */
  addMessage(message: IMessage): void {
    this.memory.shortTerm.push(message);

    // Keep only recent messages
    const maxMessages = 50;
    if (this.memory.shortTerm.length > maxMessages) {
      this.memory.shortTerm = this.memory.shortTerm.slice(-maxMessages);
    }
  }

  /**
   * Clear short-term memory
   */
  clearShortTermMemory(): void {
    this.memory.shortTerm = [];
  }

  /**
   * Search long-term memory
   */
  async searchMemory(query: string, limit?: number): Promise<any[]> {
    const results = await this.longTermMemory.similaritySearch(query, limit);
    return results.map((r) => ({ content: r.entry.content, score: r.score }));
  }

  /**
   * Get agent statistics
   */
  getStats(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      shortTermMemorySize: this.memory.shortTerm.length,
      longTermMemorySize: this.longTermMemory.count(),
      toolCount: this.tools.length,
      settings: this.settings,
    };
  }
}

/**
 * Create a new agent instance
 */
export function createAgent(config: {
  name: string;
  role: string;
  systemPrompt: string;
  model: any;
  tools?: ITool[];
  settings?: Partial<IAgentSettings>;
  messageBus?: MessageBus;
}): Agent {
  return new Agent(config);
}

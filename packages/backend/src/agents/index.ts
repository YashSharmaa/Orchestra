/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Main export file for agent orchestration module
 */

// Core Agent Components
import { Agent, createAgent as _createAgent, AgentExecutionResult } from './Agent';
import { AgentGroup, createAgentGroup as _createAgentGroup, AgentGroupExecutionResult } from './AgentGroup';
import { log } from '@/utils/logger';

// Orchestration Systems
import { System1, createSystem1 as _createSystem1, System1ExecutionResult } from './orchestrator/System1';
import { System2, createSystem2 as _createSystem2, System2ExecutionResult } from './orchestrator/System2';
import { System3, createSystem3 as _createSystem3, System3ExecutionResult } from './orchestrator/System3';

// LLM Provider
import {
  LLMProvider,
  createLLMProvider,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResponse,
  FunctionDefinition,
  ToolCall,
} from './LLMProvider';

// Messaging
import { MessageBus, getMessageBus as _getMessageBus, createMessageBus } from './messaging/MessageBus';

// Memory
import { Blackboard, createBlackboard, BlackboardEntry } from './memory/Blackboard';
import {
  LongTermMemory,
  createLongTermMemory,
  SimilaritySearchResult,
} from './memory/LongTermMemory';

// Tools
import { ToolRegistry, getToolRegistry as _getToolRegistry } from './tools/ToolRegistry';
import {
  getBasicTools as _getBasicTools,
  calculatorTool,
  webSearchTool,
  httpRequestTool,
  stringManipulationTool,
  dateTimeTool,
  jsonParserTool,
} from './tools/BasicTools';

// Re-export everything
export {
  // Core
  Agent,
  AgentGroup,
  AgentExecutionResult,
  AgentGroupExecutionResult,
  // Systems
  System1,
  System2,
  System3,
  System1ExecutionResult,
  System2ExecutionResult,
  System3ExecutionResult,
  // LLM
  LLMProvider,
  createLLMProvider,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResponse,
  FunctionDefinition,
  ToolCall,
  // Messaging
  MessageBus,
  createMessageBus,
  // Memory
  Blackboard,
  createBlackboard,
  BlackboardEntry,
  LongTermMemory,
  createLongTermMemory,
  SimilaritySearchResult,
  // Tools
  ToolRegistry,
  calculatorTool,
  webSearchTool,
  httpRequestTool,
  stringManipulationTool,
  dateTimeTool,
  jsonParserTool,
};

// Export factory functions
export const createAgent = _createAgent;
export const createAgentGroup = _createAgentGroup;
export const createSystem1 = _createSystem1;
export const createSystem2 = _createSystem2;
export const createSystem3 = _createSystem3;
export const getToolRegistry = _getToolRegistry;
export const getMessageBus = _getMessageBus;
export const getBasicTools = _getBasicTools;

// Re-export types from @/types for convenience
export type {
  IAgent,
  IAgentGroup,
  ISystem1,
  ISystem2,
  ISystem3,
  ITool,
  IMessage,
  IModelConfig,
  IAgentMemory,
  IAgentSettings,
  IMemoryEntry,
  MessagePerformative,
} from '@/types';

/**
 * Initialize the agent system with basic tools
 */
export function initializeAgentSystem(): void {
  const toolRegistry = _getToolRegistry();
  const basicTools = _getBasicTools();

  // Register all basic tools
  toolRegistry.registerMany(basicTools);

  log.info(`Agent system initialized with ${basicTools.length} basic tools`);
}

/**
 * Agent system utilities
 */
export const AgentSystem = {
  /**
   * Initialize the system
   */
  initialize: initializeAgentSystem,

  /**
   * Get tool registry
   */
  getToolRegistry: _getToolRegistry,

  /**
   * Get message bus
   */
  getMessageBus: _getMessageBus,

  /**
   * Create a simple agent
   */
  createSimpleAgent: (
    name: string,
    role: string,
    systemPrompt: string,
    model: any
  ) => {
    const tools = _getBasicTools();
    return _createAgent({
      name,
      role,
      systemPrompt,
      model,
      tools,
      settings: {
        maxIterations: 20,
        timeout: 120000,
        mode: 'function-calling',
        maxToolCalls: 50,
      },
    });
  },

  /**
   * Create a complete agent group
   */
  createCompleteGroup: (
    groupName: string,
    coordinatorConfig: { name: string; role: string; systemPrompt: string; model: any },
    memberConfigs: Array<{ name: string; role: string; systemPrompt: string; model: any }>
  ) => {
    const tools = _getBasicTools();
    const coordinator = _createAgent({
      ...coordinatorConfig,
      tools,
    });

    const members = memberConfigs.map((config) =>
      _createAgent({
        ...config,
        tools,
      })
    );

    return _createAgentGroup({
      name: groupName,
      coordinator,
      members,
    });
  },

  /**
   * Create a complete System1 unit
   */
  createCompleteSystem1: (
    system1Name: string,
    coordinatorConfig: { name: string; role: string; systemPrompt: string; model: any },
    groupConfigs: Array<{
      name: string;
      coordinator: { name: string; role: string; systemPrompt: string; model: any };
      members: Array<{ name: string; role: string; systemPrompt: string; model: any }>;
    }>
  ) => {
    const tools = _getBasicTools();
    const coordinator = _createAgent({
      ...coordinatorConfig,
      tools,
    });

    const groups = groupConfigs.map((groupConfig) =>
      AgentSystem.createCompleteGroup(
        groupConfig.name,
        groupConfig.coordinator,
        groupConfig.members
      )
    );

    return _createSystem1({
      name: system1Name,
      coordinator,
      agentGroups: groups,
    });
  },
};

/**
 * Quick start examples
 */
export const QuickStart = {
  /**
   * Create a research agent
   */
  createResearchAgent: (model: any) => {
    return AgentSystem.createSimpleAgent(
      'Research Assistant',
      'Research Specialist',
      `You are a research assistant. Your role is to:
- Search for information on given topics
- Analyze and synthesize research findings
- Provide comprehensive, well-cited answers
- Use available tools to gather and process information`,
      model
    );
  },

  /**
   * Create a data analysis agent
   */
  createDataAnalysisAgent: (model: any) => {
    return AgentSystem.createSimpleAgent(
      'Data Analyst',
      'Data Analysis Specialist',
      `You are a data analyst. Your role is to:
- Analyze data and identify patterns
- Perform calculations and statistical analysis
- Generate insights and recommendations
- Use tools to process and manipulate data`,
      model
    );
  },

  /**
   * Create a planning agent
   */
  createPlanningAgent: (model: any) => {
    return AgentSystem.createSimpleAgent(
      'Planning Coordinator',
      'Planning Specialist',
      `You are a planning coordinator. Your role is to:
- Break down complex tasks into manageable steps
- Create detailed execution plans
- Coordinate between different components
- Ensure efficient resource allocation`,
      model
    );
  },

  /**
   * Create a quality assurance agent
   */
  createQAAgent: (model: any) => {
    return AgentSystem.createSimpleAgent(
      'Quality Assurance',
      'QA Specialist',
      `You are a quality assurance specialist. Your role is to:
- Review outputs for quality and accuracy
- Identify gaps and inconsistencies
- Validate results against requirements
- Provide improvement recommendations`,
      model
    );
  },
};

/**
 * Default model configurations
 */
export const DefaultModels = {
  /**
   * GPT-4 configuration for Azure OpenAI
   */
  GPT4: {
    provider: 'azure-openai' as const,
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },

  /**
   * GPT-4 Turbo configuration
   */
  GPT4Turbo: {
    provider: 'azure-openai' as const,
    model: 'gpt-4-turbo',
    temperature: 0.7,
    maxTokens: 4000,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },

  /**
   * GPT-3.5 Turbo configuration (faster, lower cost)
   */
  GPT35Turbo: {
    provider: 'azure-openai' as const,
    model: 'gpt-35-turbo',
    temperature: 0.7,
    maxTokens: 2000,
    topP: 1,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
};

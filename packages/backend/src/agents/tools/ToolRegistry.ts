/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Tool registry for agent tools
 */

import { ITool } from '@/types';
import { log } from '@/utils/logger';

/**
 * Tool Registry manages all available tools for agents
 */
export class ToolRegistry {
  private tools: Map<string, ITool>;
  private static instance: ToolRegistry;

  private constructor() {
    this.tools = new Map();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  /**
   * Register a tool
   */
  register(tool: ITool): void {
    if (this.tools.has(tool.name)) {
      log.warn(`Tool ${tool.name} already registered, overwriting`);
    }
    this.tools.set(tool.name, tool);
    log.info(`Tool registered: ${tool.name}`);
  }

  /**
   * Register multiple tools
   */
  registerMany(tools: ITool[]): void {
    tools.forEach((tool) => this.register(tool));
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): void {
    if (this.tools.delete(name)) {
      log.info(`Tool unregistered: ${name}`);
    } else {
      log.warn(`Tool ${name} not found`);
    }
  }

  /**
   * Get a tool by name
   */
  get(name: string): ITool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all tools
   */
  getAll(): ITool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by names
   */
  getMany(names: string[]): ITool[] {
    return names.map((name) => this.tools.get(name)).filter((tool): tool is ITool => !!tool);
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Execute a tool
   */
  async execute(name: string, params: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    try {
      log.debug(`Executing tool: ${name}`, { params });
      const result = await tool.handler(params);
      log.debug(`Tool execution successful: ${name}`);
      return result;
    } catch (error: any) {
      log.error(`Tool execution failed: ${name}`, { error: error.message });
      throw new Error(`Tool ${name} execution failed: ${error.message}`);
    }
  }

  /**
   * Convert tools to OpenAI function format
   */
  toOpenAIFunctions(toolNames?: string[]): any[] {
    const tools = toolNames ? this.getMany(toolNames) : this.getAll();
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  /**
   * Convert tools to OpenAI tool format (new format)
   */
  toOpenAITools(toolNames?: string[]): any[] {
    const tools = toolNames ? this.getMany(toolNames) : this.getAll();
    return tools.map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
    log.info('All tools cleared from registry');
  }

  /**
   * Get tool count
   */
  count(): number {
    return this.tools.size;
  }
}

/**
 * Get the global tool registry instance
 */
export function getToolRegistry(): ToolRegistry {
  return ToolRegistry.getInstance();
}

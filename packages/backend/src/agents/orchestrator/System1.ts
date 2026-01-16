/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: System1 coordinator - manages agent groups
 */

import { v4 as uuidv4 } from 'uuid';
import { ISystem1, IAgent, IAgentGroup } from '@/types';
import { log } from '@/utils/logger';
import { Agent } from '../Agent';
import { AgentGroup } from '../AgentGroup';
import { MessageBus } from '../messaging/MessageBus';
import { Blackboard } from '../memory/Blackboard';

/**
 * System1 execution result
 */
export interface System1ExecutionResult {
  success: boolean;
  result: any;
  groupResults: Array<{
    groupId: string;
    groupName: string;
    result: any;
  }>;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * System1 - Coordinates multiple agent groups
 * Handles tactical, operational-level coordination
 */
export class System1 implements ISystem1 {
  id: string;
  name: string;
  coordinator: IAgent;
  agentGroups: IAgentGroup[];
  sharedMemory: Record<string, any>;

  private messageBus: MessageBus;
  private blackboard: Blackboard;

  constructor(config: {
    id?: string;
    name: string;
    coordinator: Agent;
    agentGroups?: AgentGroup[];
    messageBus?: MessageBus;
  }) {
    this.id = config.id || uuidv4();
    this.name = config.name;
    this.coordinator = config.coordinator;
    this.agentGroups = config.agentGroups || [];
    this.sharedMemory = {};

    this.messageBus = config.messageBus || new MessageBus();
    this.blackboard = new Blackboard();

    log.info('System1 initialized', {
      id: this.id,
      name: this.name,
      coordinatorId: this.coordinator.id,
      groupCount: this.agentGroups.length,
    });
  }

  /**
   * Execute a task using System1 coordination
   */
  async execute(
    task: string,
    context?: Record<string, any>
  ): Promise<System1ExecutionResult> {
    log.info('System1 execution started', {
      system1Id: this.id,
      system1Name: this.name,
      task,
    });

    const startTime = Date.now();
    const groupResults: Array<{ groupId: string; groupName: string; result: any }> = [];

    try {
      // Write task to blackboard
      this.blackboard.write('task', task, this.coordinator.id, context);
      this.blackboard.write('status', 'analyzing', this.coordinator.id);

      // Step 1: Coordinator analyzes task and determines strategy
      const strategyPrompt = this.buildStrategyPrompt(task, context);
      const strategyResult = await (this.coordinator as Agent).execute(strategyPrompt, context);

      this.blackboard.write('strategy', strategyResult.response, this.coordinator.id);

      // Parse strategy to determine which groups to engage
      const strategy = this.parseStrategy(strategyResult.response);
      this.blackboard.write('parsed_strategy', strategy, this.coordinator.id);

      // Step 2: Engage agent groups based on strategy
      this.blackboard.write('status', 'executing', this.coordinator.id);

      if (strategy.parallel) {
        // Execute groups in parallel
        const results = await Promise.all(
          strategy.groups.map((groupAssignment) =>
            this.executeGroupTask(groupAssignment.groupId, groupAssignment.subtask, context)
          )
        );

        for (let i = 0; i < results.length; i++) {
          const group = this.agentGroups.find((g) => g.id === strategy.groups[i].groupId);
          groupResults.push({
            groupId: strategy.groups[i].groupId,
            groupName: group?.name || 'Unknown',
            result: results[i],
          });
        }
      } else {
        // Execute groups sequentially
        for (const groupAssignment of strategy.groups) {
          const result = await this.executeGroupTask(
            groupAssignment.groupId,
            groupAssignment.subtask,
            context
          );

          const group = this.agentGroups.find((g) => g.id === groupAssignment.groupId);
          groupResults.push({
            groupId: groupAssignment.groupId,
            groupName: group?.name || 'Unknown',
            result,
          });

          // Store result in blackboard for next group
          this.blackboard.write(
            `group_${groupAssignment.groupId}_result`,
            result,
            this.coordinator.id
          );
        }
      }

      // Step 3: Coordinator synthesizes all group results
      const synthesisPrompt = this.buildSynthesisPrompt(task, groupResults);
      const finalResult = await (this.coordinator as Agent).execute(synthesisPrompt, context);

      const duration = Date.now() - startTime;

      this.blackboard.write('status', 'completed', this.coordinator.id);
      this.blackboard.write('final_result', finalResult.response, this.coordinator.id);

      log.info('System1 execution completed', {
        system1Id: this.id,
        duration,
        groupCount: groupResults.length,
      });

      return {
        success: true,
        result: finalResult.response,
        groupResults,
        metadata: {
          duration,
          system1Id: this.id,
          system1Name: this.name,
          groupCount: this.agentGroups.length,
          strategy,
        },
      };
    } catch (error: any) {
      log.error('System1 execution failed', {
        system1Id: this.id,
        error: error.message,
      });

      this.blackboard.write('status', 'failed', this.coordinator.id);

      return {
        success: false,
        result: null,
        groupResults,
        error: error.message,
      };
    }
  }

  /**
   * Add an agent group to System1
   */
  addAgentGroup(group: AgentGroup): void {
    if (this.agentGroups.find((g) => g.id === group.id)) {
      log.warn('Agent group already in System1', { groupId: group.id, system1Id: this.id });
      return;
    }

    this.agentGroups.push(group);

    log.info('Agent group added to System1', {
      groupId: group.id,
      groupName: group.name,
      system1Id: this.id,
    });
  }

  /**
   * Remove an agent group from System1
   */
  removeAgentGroup(groupId: string): boolean {
    const index = this.agentGroups.findIndex((g) => g.id === groupId);
    if (index === -1) {
      return false;
    }

    this.agentGroups.splice(index, 1);

    log.info('Agent group removed from System1', {
      groupId,
      system1Id: this.id,
    });

    return true;
  }

  /**
   * Get System1 status
   */
  getStatus(): {
    groupCount: number;
    totalAgents: number;
    sharedMemorySize: number;
    blackboardStats: any;
  } {
    const totalAgents = this.agentGroups.reduce(
      (sum, group) => sum + group.members.length + 1,
      0
    );

    return {
      groupCount: this.agentGroups.length,
      totalAgents,
      sharedMemorySize: Object.keys(this.sharedMemory).length,
      blackboardStats: this.blackboard.getStats(),
    };
  }

  /**
   * Build strategy prompt for coordinator
   */
  private buildStrategyPrompt(task: string, context?: Record<string, any>): string {
    const groupDescriptions = this.agentGroups
      .map((g) => `- ${g.name} (ID: ${g.id}): Coordinator is ${g.coordinator.name} (${g.coordinator.role})`)
      .join('\n');

    return `You are the System1 coordinator managing multiple agent groups. Your task is to analyze the following task and create a strategy.

Task: ${task}

Available Agent Groups:
${groupDescriptions}

Please create a strategy that:
1. Analyzes the task requirements
2. Determines which agent groups should be engaged
3. Breaks down the task into subtasks for each group
4. Specifies whether groups should work in parallel or sequentially

Format your strategy clearly with group assignments and execution order.`;
  }

  /**
   * Build synthesis prompt for coordinator
   */
  private buildSynthesisPrompt(
    task: string,
    groupResults: Array<{ groupId: string; groupName: string; result: any }>
  ): string {
    const resultsText = groupResults
      .map((r) => `${r.groupName}:\n${JSON.stringify(r.result, null, 2)}`)
      .join('\n\n');

    return `You are the System1 coordinator. You assigned the following task to multiple agent groups: ${task}

Here are the results from each group:

${resultsText}

Please synthesize these results into a final, comprehensive answer to the original task.`;
  }

  /**
   * Parse strategy from coordinator response
   */
  private parseStrategy(strategyText: string): {
    parallel: boolean;
    groups: Array<{ groupId: string; subtask: string }>;
  } {
    // Simple parsing - check for parallel keyword
    const parallel = /parallel/i.test(strategyText);

    const groups: Array<{ groupId: string; subtask: string }> = [];

    // Try to match group assignments
    // Look for patterns like "Group: <name>" or "ID: <id>"
    const lines = strategyText.split('\n');
    let currentGroupId: string | null = null;
    let currentSubtask = '';

    for (const line of lines) {
      // Check for group ID
      const idMatch = line.match(/ID:\s*([a-f0-9-]+)/i);
      if (idMatch) {
        currentGroupId = idMatch[1];
      }

      // Check for group name (try to find matching group)
      const nameMatch = line.match(/(?:Group|Team):\s*(\w+)/i);
      if (nameMatch && !currentGroupId) {
        const group = this.agentGroups.find((g) =>
          g.name.toLowerCase().includes(nameMatch[1].toLowerCase())
        );
        if (group) {
          currentGroupId = group.id;
        }
      }

      // Collect subtask text
      if (currentGroupId && line.trim() && !idMatch && !nameMatch) {
        currentSubtask += line.trim() + ' ';
      }

      // If we have both groupId and subtask, add it
      if (currentGroupId && currentSubtask.length > 20) {
        groups.push({
          groupId: currentGroupId,
          subtask: currentSubtask.trim(),
        });
        currentGroupId = null;
        currentSubtask = '';
      }
    }

    // If no groups parsed, assign to first group
    if (groups.length === 0 && this.agentGroups.length > 0) {
      groups.push({
        groupId: this.agentGroups[0].id,
        subtask: strategyText,
      });
    }

    return { parallel, groups };
  }

  /**
   * Execute a task with a specific agent group
   */
  private async executeGroupTask(
    groupId: string,
    subtask: string,
    context?: Record<string, any>
  ): Promise<any> {
    const group = this.agentGroups.find((g) => g.id === groupId);
    if (!group) {
      throw new Error(`Agent group not found: ${groupId}`);
    }

    log.debug('Executing group task', {
      groupId,
      groupName: group.name,
      subtask,
    });

    const result = await (group as AgentGroup).execute(subtask, context);
    return result.result;
  }

  /**
   * Get the blackboard
   */
  getBlackboard(): Blackboard {
    return this.blackboard;
  }

  /**
   * Get the message bus
   */
  getMessageBus(): MessageBus {
    return this.messageBus;
  }
}

/**
 * Create a new System1 instance
 */
export function createSystem1(config: {
  name: string;
  coordinator: Agent;
  agentGroups?: AgentGroup[];
  messageBus?: MessageBus;
}): System1 {
  return new System1(config);
}

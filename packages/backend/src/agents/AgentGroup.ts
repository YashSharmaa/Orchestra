/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Group of agents working together
 */

import { v4 as uuidv4 } from 'uuid';
import { IAgent, IAgentGroup } from '@/types';
import { log } from '@/utils/logger';
import { Agent } from './Agent';
import { MessageBus } from './messaging/MessageBus';
import { Blackboard } from './memory/Blackboard';

/**
 * Agent group execution result
 */
export interface AgentGroupExecutionResult {
  success: boolean;
  result: any;
  contributions: Array<{ agentId: string; agentName: string; contribution: any }>;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Agent group for collaborative work
 */
export class AgentGroup implements IAgentGroup {
  id: string;
  name: string;
  coordinator: IAgent;
  members: IAgent[];
  sharedMemory: Record<string, any>;

  private messageBus: MessageBus;
  private blackboard: Blackboard;
  private active: boolean = false;

  constructor(config: {
    id?: string;
    name: string;
    coordinator: Agent;
    members?: Agent[];
    messageBus?: MessageBus;
  }) {
    this.id = config.id || uuidv4();
    this.name = config.name;
    this.coordinator = config.coordinator;
    this.members = config.members || [];
    this.sharedMemory = {};

    this.messageBus = config.messageBus || new MessageBus();
    this.blackboard = new Blackboard();

    // Subscribe coordinator and members to messages
    this.setupMessageHandlers();

    log.info('Agent group initialized', {
      id: this.id,
      name: this.name,
      coordinatorId: this.coordinator.id,
      memberCount: this.members.length,
    });
  }

  /**
   * Execute a task with the agent group
   */
  async execute(
    task: string,
    context?: Record<string, any>
  ): Promise<AgentGroupExecutionResult> {
    log.info('Agent group execution started', {
      groupId: this.id,
      groupName: this.name,
      task,
    });

    this.active = true;
    const startTime = Date.now();
    const contributions: Array<{ agentId: string; agentName: string; contribution: any }> = [];

    try {
      // Initialize shared memory
      this.blackboard.write('task', task, this.coordinator.id, context);
      this.blackboard.write('status', 'in_progress', this.coordinator.id);

      // Step 1: Coordinator analyzes task and creates plan
      const planningPrompt = this.buildPlanningPrompt(task, context);
      const planResult = await (this.coordinator as Agent).execute(planningPrompt, context);

      contributions.push({
        agentId: this.coordinator.id,
        agentName: this.coordinator.name,
        contribution: { type: 'planning', plan: planResult.response },
      });

      // Parse the plan
      const plan = this.parsePlan(planResult.response);
      this.blackboard.write('plan', plan, this.coordinator.id);

      // Step 2: Distribute work to members
      const memberResults = await this.distributeWork(plan, context);
      contributions.push(...memberResults);

      // Step 3: Coordinator synthesizes results
      const synthesisPrompt = this.buildSynthesisPrompt(task, memberResults);
      const finalResult = await (this.coordinator as Agent).execute(synthesisPrompt, context);

      contributions.push({
        agentId: this.coordinator.id,
        agentName: this.coordinator.name,
        contribution: { type: 'synthesis', result: finalResult.response },
      });

      const duration = Date.now() - startTime;

      this.blackboard.write('status', 'completed', this.coordinator.id);
      this.blackboard.write('result', finalResult.response, this.coordinator.id);

      log.info('Agent group execution completed', {
        groupId: this.id,
        duration,
        contributionCount: contributions.length,
      });

      this.active = false;

      return {
        success: true,
        result: finalResult.response,
        contributions,
        metadata: {
          duration,
          groupId: this.id,
          groupName: this.name,
          memberCount: this.members.length,
        },
      };
    } catch (error: any) {
      log.error('Agent group execution failed', {
        groupId: this.id,
        error: error.message,
      });

      this.blackboard.write('status', 'failed', this.coordinator.id);
      this.active = false;

      return {
        success: false,
        result: null,
        contributions,
        error: error.message,
      };
    }
  }

  /**
   * Add a member to the group
   */
  addMember(agent: Agent): void {
    if (this.members.find((m) => m.id === agent.id)) {
      log.warn('Agent already in group', { agentId: agent.id, groupId: this.id });
      return;
    }

    this.members.push(agent);
    this.setupMessageHandlerForAgent(agent);

    log.info('Agent added to group', {
      agentId: agent.id,
      agentName: agent.name,
      groupId: this.id,
    });
  }

  /**
   * Remove a member from the group
   */
  removeMember(agentId: string): boolean {
    const index = this.members.findIndex((m) => m.id === agentId);
    if (index === -1) {
      return false;
    }

    const agent = this.members[index];
    this.members.splice(index, 1);
    this.messageBus.unsubscribe(agentId);

    log.info('Agent removed from group', {
      agentId,
      groupId: this.id,
    });

    return true;
  }

  /**
   * Get group status
   */
  getStatus(): {
    active: boolean;
    memberCount: number;
    sharedMemorySize: number;
    blackboardStats: any;
  } {
    return {
      active: this.active,
      memberCount: this.members.length,
      sharedMemorySize: Object.keys(this.sharedMemory).length,
      blackboardStats: this.blackboard.getStats(),
    };
  }

  /**
   * Build planning prompt for coordinator
   */
  private buildPlanningPrompt(task: string, context?: Record<string, any>): string {
    const memberDescriptions = this.members
      .map((m) => `- ${m.name} (${m.role}): Specialized in ${m.role}`)
      .join('\n');

    return `You are the coordinator of a team of agents. Your task is to break down the following task into subtasks and assign them to team members.

Task: ${task}

Available Team Members:
${memberDescriptions}

Please create a plan with the following format:
1. Analyze the task
2. Break it into subtasks
3. Assign each subtask to the most suitable team member
4. Specify the order of execution (sequential or parallel)

Provide your plan in a structured format.`;
  }

  /**
   * Build synthesis prompt for coordinator
   */
  private buildSynthesisPrompt(
    task: string,
    memberResults: Array<{ agentId: string; agentName: string; contribution: any }>
  ): string {
    const resultsText = memberResults
      .map((r) => `${r.agentName}: ${JSON.stringify(r.contribution)}`)
      .join('\n\n');

    return `You are coordinating a team to complete this task: ${task}

Your team members have completed their assigned work. Here are their contributions:

${resultsText}

Please synthesize these contributions into a final, coherent answer to the original task.`;
  }

  /**
   * Parse plan from coordinator response
   */
  private parsePlan(planText: string): Array<{
    subtask: string;
    assignedTo?: string;
    order: number;
  }> {
    // Simple parsing - in production, use more sophisticated parsing
    const subtasks: Array<{ subtask: string; assignedTo?: string; order: number }> = [];
    const lines = planText.split('\n');

    let order = 0;
    for (const line of lines) {
      if (line.match(/^\d+\.|^-|^•/)) {
        order++;
        // Try to extract agent assignment
        const agentMatch = line.match(/assign.*?to\s+(\w+)/i);
        const assignedTo = agentMatch ? agentMatch[1] : undefined;

        subtasks.push({
          subtask: line.replace(/^\d+\.|^-|^•/, '').trim(),
          assignedTo,
          order,
        });
      }
    }

    // If no subtasks parsed, create a default one
    if (subtasks.length === 0) {
      subtasks.push({
        subtask: planText,
        order: 1,
      });
    }

    return subtasks;
  }

  /**
   * Distribute work to members
   */
  private async distributeWork(
    plan: Array<{ subtask: string; assignedTo?: string; order: number }>,
    context?: Record<string, any>
  ): Promise<Array<{ agentId: string; agentName: string; contribution: any }>> {
    const results: Array<{ agentId: string; agentName: string; contribution: any }> = [];

    // For simplicity, execute sequentially (in production, could parallelize)
    for (const subtask of plan) {
      // Find best agent for subtask
      const agent = this.selectAgentForSubtask(subtask);

      if (agent) {
        log.debug('Assigning subtask to agent', {
          subtask: subtask.subtask,
          agentId: agent.id,
          agentName: agent.name,
        });

        const result = await (agent as Agent).execute(subtask.subtask, context);

        results.push({
          agentId: agent.id,
          agentName: agent.name,
          contribution: {
            subtask: subtask.subtask,
            result: result.response,
            toolCalls: result.toolCalls,
          },
        });

        // Write to blackboard
        this.blackboard.write(
          `subtask_${subtask.order}_result`,
          result.response,
          agent.id,
          { subtask: subtask.subtask }
        );
      }
    }

    return results;
  }

  /**
   * Select best agent for a subtask
   */
  private selectAgentForSubtask(subtask: {
    subtask: string;
    assignedTo?: string;
    order: number;
  }): Agent | null {
    if (subtask.assignedTo) {
      // Try to find by name
      const agent = this.members.find(
        (m) => m.name.toLowerCase().includes(subtask.assignedTo!.toLowerCase())
      );
      if (agent) return agent as Agent;
    }

    // Return first available member, or coordinator if no members
    return (this.members[0] as Agent) || (this.coordinator as Agent);
  }

  /**
   * Setup message handlers for all agents
   */
  private setupMessageHandlers(): void {
    this.setupMessageHandlerForAgent(this.coordinator as Agent);
    this.members.forEach((agent) => this.setupMessageHandlerForAgent(agent as Agent));
  }

  /**
   * Setup message handler for a single agent
   */
  private setupMessageHandlerForAgent(agent: Agent): void {
    this.messageBus.subscribe(agent.id, (message) => {
      log.debug('Agent received message', {
        agentId: agent.id,
        messageId: message.id,
        from: message.sender,
      });
      agent.addMessage(message);
    });
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
 * Create a new agent group
 */
export function createAgentGroup(config: {
  name: string;
  coordinator: Agent;
  members?: Agent[];
  messageBus?: MessageBus;
}): AgentGroup {
  return new AgentGroup(config);
}

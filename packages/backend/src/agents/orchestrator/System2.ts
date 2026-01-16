/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: System2 coordinator - manages System1 units
 */

import { v4 as uuidv4 } from 'uuid';
import { ISystem2, IAgent, ISystem1 } from '@/types';
import { log } from '@/utils/logger';
import { Agent } from '../Agent';
import { System1 } from './System1';
import { MessageBus } from '../messaging/MessageBus';
import { Blackboard } from '../memory/Blackboard';

/**
 * System2 execution result
 */
export interface System2ExecutionResult {
  success: boolean;
  result: any;
  system1Results: Array<{
    system1Id: string;
    system1Name: string;
    result: any;
  }>;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * System2 - Coordinates multiple System1 units
 * Handles strategic, department-level coordination
 */
export class System2 implements ISystem2 {
  id: string;
  name: string;
  coordinator: IAgent;
  system1Units: ISystem1[];
  sharedMemory: Record<string, any>;

  private messageBus: MessageBus;
  private blackboard: Blackboard;

  constructor(config: {
    id?: string;
    name: string;
    coordinator: Agent;
    system1Units?: System1[];
    messageBus?: MessageBus;
  }) {
    this.id = config.id || uuidv4();
    this.name = config.name;
    this.coordinator = config.coordinator;
    this.system1Units = config.system1Units || [];
    this.sharedMemory = {};

    this.messageBus = config.messageBus || new MessageBus();
    this.blackboard = new Blackboard();

    log.info('System2 initialized', {
      id: this.id,
      name: this.name,
      coordinatorId: this.coordinator.id,
      system1Count: this.system1Units.length,
    });
  }

  /**
   * Execute a task using System2 coordination
   */
  async execute(
    task: string,
    context?: Record<string, any>
  ): Promise<System2ExecutionResult> {
    log.info('System2 execution started', {
      system2Id: this.id,
      system2Name: this.name,
      task,
    });

    const startTime = Date.now();
    const system1Results: Array<{ system1Id: string; system1Name: string; result: any }> = [];

    try {
      // Write task to blackboard
      this.blackboard.write('task', task, this.coordinator.id, context);
      this.blackboard.write('status', 'strategic_planning', this.coordinator.id);

      // Step 1: Coordinator performs strategic analysis
      const strategicPrompt = this.buildStrategicPrompt(task, context);
      const strategicResult = await (this.coordinator as Agent).execute(strategicPrompt, context);

      this.blackboard.write('strategic_plan', strategicResult.response, this.coordinator.id);

      // Parse strategic plan
      const plan = this.parseStrategicPlan(strategicResult.response);
      this.blackboard.write('parsed_plan', plan, this.coordinator.id);

      // Step 2: Engage System1 units based on strategic plan
      this.blackboard.write('status', 'tactical_execution', this.coordinator.id);

      if (plan.parallel) {
        // Execute System1 units in parallel
        const results = await Promise.all(
          plan.system1Assignments.map((assignment) =>
            this.executeSystem1Task(assignment.system1Id, assignment.objective, context)
          )
        );

        for (let i = 0; i < results.length; i++) {
          const system1 = this.system1Units.find((s) => s.id === plan.system1Assignments[i].system1Id);
          system1Results.push({
            system1Id: plan.system1Assignments[i].system1Id,
            system1Name: system1?.name || 'Unknown',
            result: results[i],
          });
        }
      } else {
        // Execute System1 units sequentially
        for (const assignment of plan.system1Assignments) {
          const result = await this.executeSystem1Task(
            assignment.system1Id,
            assignment.objective,
            context
          );

          const system1 = this.system1Units.find((s) => s.id === assignment.system1Id);
          system1Results.push({
            system1Id: assignment.system1Id,
            system1Name: system1?.name || 'Unknown',
            result,
          });

          // Store result in blackboard for dependencies
          this.blackboard.write(
            `system1_${assignment.system1Id}_result`,
            result,
            this.coordinator.id
          );
        }
      }

      // Step 3: Coordinator synthesizes strategic outcomes
      const synthesisPrompt = this.buildStrategicSynthesisPrompt(task, system1Results);
      const finalResult = await (this.coordinator as Agent).execute(synthesisPrompt, context);

      const duration = Date.now() - startTime;

      this.blackboard.write('status', 'completed', this.coordinator.id);
      this.blackboard.write('final_result', finalResult.response, this.coordinator.id);

      log.info('System2 execution completed', {
        system2Id: this.id,
        duration,
        system1Count: system1Results.length,
      });

      return {
        success: true,
        result: finalResult.response,
        system1Results,
        metadata: {
          duration,
          system2Id: this.id,
          system2Name: this.name,
          system1Count: this.system1Units.length,
          plan,
        },
      };
    } catch (error: any) {
      log.error('System2 execution failed', {
        system2Id: this.id,
        error: error.message,
      });

      this.blackboard.write('status', 'failed', this.coordinator.id);

      return {
        success: false,
        result: null,
        system1Results,
        error: error.message,
      };
    }
  }

  /**
   * Add a System1 unit to System2
   */
  addSystem1(system1: System1): void {
    if (this.system1Units.find((s) => s.id === system1.id)) {
      log.warn('System1 already in System2', { system1Id: system1.id, system2Id: this.id });
      return;
    }

    this.system1Units.push(system1);

    log.info('System1 added to System2', {
      system1Id: system1.id,
      system1Name: system1.name,
      system2Id: this.id,
    });
  }

  /**
   * Remove a System1 unit from System2
   */
  removeSystem1(system1Id: string): boolean {
    const index = this.system1Units.findIndex((s) => s.id === system1Id);
    if (index === -1) {
      return false;
    }

    this.system1Units.splice(index, 1);

    log.info('System1 removed from System2', {
      system1Id,
      system2Id: this.id,
    });

    return true;
  }

  /**
   * Get System2 status
   */
  getStatus(): {
    system1Count: number;
    totalGroups: number;
    sharedMemorySize: number;
    blackboardStats: any;
  } {
    const totalGroups = this.system1Units.reduce(
      (sum, system1) => sum + system1.agentGroups.length,
      0
    );

    return {
      system1Count: this.system1Units.length,
      totalGroups,
      sharedMemorySize: Object.keys(this.sharedMemory).length,
      blackboardStats: this.blackboard.getStats(),
    };
  }

  /**
   * Build strategic prompt for coordinator
   */
  private buildStrategicPrompt(task: string, context?: Record<string, any>): string {
    const system1Descriptions = this.system1Units
      .map(
        (s) =>
          `- ${s.name} (ID: ${s.id}): Manages ${s.agentGroups.length} agent groups, coordinated by ${s.coordinator.name}`
      )
      .join('\n');

    return `You are the System2 strategic coordinator managing multiple System1 tactical units. Your role is to create a strategic plan for the following objective.

Objective: ${task}

Available System1 Units:
${system1Descriptions}

Please create a strategic plan that:
1. Analyzes the objective from a strategic perspective
2. Identifies key strategic goals and success criteria
3. Determines which System1 units should be engaged
4. Defines clear objectives for each System1 unit
5. Specifies dependencies and execution order (parallel or sequential)
6. Identifies potential risks and mitigation strategies

Format your strategic plan clearly with System1 assignments and execution strategy.`;
  }

  /**
   * Build strategic synthesis prompt for coordinator
   */
  private buildStrategicSynthesisPrompt(
    task: string,
    system1Results: Array<{ system1Id: string; system1Name: string; result: any }>
  ): string {
    const resultsText = system1Results
      .map((r) => `${r.system1Name}:\n${JSON.stringify(r.result, null, 2)}`)
      .join('\n\n');

    return `You are the System2 strategic coordinator. You assigned the following objective to multiple System1 tactical units: ${task}

Here are the tactical outcomes from each System1 unit:

${resultsText}

Please synthesize these tactical results into a strategic outcome that:
1. Integrates all System1 results coherently
2. Evaluates achievement of strategic goals
3. Provides comprehensive strategic insights
4. Addresses the original objective at a strategic level`;
  }

  /**
   * Parse strategic plan from coordinator response
   */
  private parseStrategicPlan(planText: string): {
    parallel: boolean;
    system1Assignments: Array<{ system1Id: string; objective: string }>;
  } {
    // Check for parallel execution
    const parallel = /parallel/i.test(planText);

    const system1Assignments: Array<{ system1Id: string; objective: string }> = [];

    // Try to match System1 assignments
    const lines = planText.split('\n');
    let currentSystem1Id: string | null = null;
    let currentObjective = '';

    for (const line of lines) {
      // Check for System1 ID
      const idMatch = line.match(/(?:System1|S1)\s+ID:\s*([a-f0-9-]+)/i);
      if (idMatch) {
        currentSystem1Id = idMatch[1];
      }

      // Check for System1 name
      const nameMatch = line.match(/(?:System1|Unit):\s*(\w+)/i);
      if (nameMatch && !currentSystem1Id) {
        const system1 = this.system1Units.find((s) =>
          s.name.toLowerCase().includes(nameMatch[1].toLowerCase())
        );
        if (system1) {
          currentSystem1Id = system1.id;
        }
      }

      // Collect objective text
      if (currentSystem1Id && line.trim() && !idMatch && !nameMatch) {
        currentObjective += line.trim() + ' ';
      }

      // If we have both system1Id and objective, add it
      if (currentSystem1Id && currentObjective.length > 20) {
        system1Assignments.push({
          system1Id: currentSystem1Id,
          objective: currentObjective.trim(),
        });
        currentSystem1Id = null;
        currentObjective = '';
      }
    }

    // If no assignments parsed, assign to first System1
    if (system1Assignments.length === 0 && this.system1Units.length > 0) {
      system1Assignments.push({
        system1Id: this.system1Units[0].id,
        objective: planText,
      });
    }

    return { parallel, system1Assignments };
  }

  /**
   * Execute a task with a specific System1 unit
   */
  private async executeSystem1Task(
    system1Id: string,
    objective: string,
    context?: Record<string, any>
  ): Promise<any> {
    const system1 = this.system1Units.find((s) => s.id === system1Id);
    if (!system1) {
      throw new Error(`System1 unit not found: ${system1Id}`);
    }

    log.debug('Executing System1 task', {
      system1Id,
      system1Name: system1.name,
      objective,
    });

    const result = await (system1 as System1).execute(objective, context);
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
 * Create a new System2 instance
 */
export function createSystem2(config: {
  name: string;
  coordinator: Agent;
  system1Units?: System1[];
  messageBus?: MessageBus;
}): System2 {
  return new System2(config);
}

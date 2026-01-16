/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: System3 orchestrator - top-level multi-agent system
 */

import { v4 as uuidv4 } from 'uuid';
import { ISystem3, IAgent, ISystem2 } from '@/types';
import { log } from '@/utils/logger';
import { Agent } from '../Agent';
import { System2 } from './System2';
import { MessageBus } from '../messaging/MessageBus';
import { Blackboard } from '../memory/Blackboard';

/**
 * System3 execution result
 */
export interface System3ExecutionResult {
  success: boolean;
  result: any;
  system2Results: Array<{
    system2Id: string;
    system2Name: string;
    result: any;
  }>;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * System3 - Top-level orchestrator managing System2 units
 * Handles enterprise-wide, organizational-level orchestration
 */
export class System3 implements ISystem3 {
  id: string;
  name: string;
  orchestrator: IAgent;
  system2Units: ISystem2[];
  globalMemory: Record<string, any>;

  private messageBus: MessageBus;
  private blackboard: Blackboard;

  constructor(config: {
    id?: string;
    name: string;
    orchestrator: Agent;
    system2Units?: System2[];
    messageBus?: MessageBus;
  }) {
    this.id = config.id || uuidv4();
    this.name = config.name;
    this.orchestrator = config.orchestrator;
    this.system2Units = config.system2Units || [];
    this.globalMemory = {};

    this.messageBus = config.messageBus || new MessageBus();
    this.blackboard = new Blackboard();

    log.info('System3 initialized', {
      id: this.id,
      name: this.name,
      orchestratorId: this.orchestrator.id,
      system2Count: this.system2Units.length,
    });
  }

  /**
   * Execute a mission using System3 orchestration
   */
  async execute(
    mission: string,
    context?: Record<string, any>
  ): Promise<System3ExecutionResult> {
    log.info('System3 execution started', {
      system3Id: this.id,
      system3Name: this.name,
      mission,
    });

    const startTime = Date.now();
    const system2Results: Array<{ system2Id: string; system2Name: string; result: any }> = [];

    try {
      // Write mission to blackboard
      this.blackboard.write('mission', mission, this.orchestrator.id, context);
      this.blackboard.write('status', 'enterprise_planning', this.orchestrator.id);

      // Step 1: Orchestrator performs enterprise-level analysis
      const enterprisePrompt = this.buildEnterprisePrompt(mission, context);
      const enterpriseResult = await (this.orchestrator as Agent).execute(enterprisePrompt, context);

      this.blackboard.write('enterprise_strategy', enterpriseResult.response, this.orchestrator.id);

      // Parse enterprise strategy
      const strategy = this.parseEnterpriseStrategy(enterpriseResult.response);
      this.blackboard.write('parsed_strategy', strategy, this.orchestrator.id);

      // Step 2: Engage System2 units based on enterprise strategy
      this.blackboard.write('status', 'strategic_execution', this.orchestrator.id);

      if (strategy.parallel) {
        // Execute System2 units in parallel
        const results = await Promise.all(
          strategy.system2Assignments.map((assignment) =>
            this.executeSystem2Mission(assignment.system2Id, assignment.mission, context)
          )
        );

        for (let i = 0; i < results.length; i++) {
          const system2 = this.system2Units.find((s) => s.id === strategy.system2Assignments[i].system2Id);
          system2Results.push({
            system2Id: strategy.system2Assignments[i].system2Id,
            system2Name: system2?.name || 'Unknown',
            result: results[i],
          });
        }
      } else {
        // Execute System2 units sequentially
        for (const assignment of strategy.system2Assignments) {
          const result = await this.executeSystem2Mission(
            assignment.system2Id,
            assignment.mission,
            context
          );

          const system2 = this.system2Units.find((s) => s.id === assignment.system2Id);
          system2Results.push({
            system2Id: assignment.system2Id,
            system2Name: system2?.name || 'Unknown',
            result,
          });

          // Store result in blackboard for cross-system2 dependencies
          this.blackboard.write(
            `system2_${assignment.system2Id}_result`,
            result,
            this.orchestrator.id
          );
        }
      }

      // Step 3: Orchestrator synthesizes enterprise outcomes
      const synthesisPrompt = this.buildEnterpriseSynthesisPrompt(mission, system2Results);
      const finalResult = await (this.orchestrator as Agent).execute(synthesisPrompt, context);

      // Step 4: Quality assurance and validation
      this.blackboard.write('status', 'validation', this.orchestrator.id);
      const validationPrompt = this.buildValidationPrompt(mission, finalResult.response, system2Results);
      const validationResult = await (this.orchestrator as Agent).execute(validationPrompt, context);

      this.blackboard.write('validation', validationResult.response, this.orchestrator.id);

      const duration = Date.now() - startTime;

      this.blackboard.write('status', 'completed', this.orchestrator.id);
      this.blackboard.write('final_result', finalResult.response, this.orchestrator.id);

      log.info('System3 execution completed', {
        system3Id: this.id,
        duration,
        system2Count: system2Results.length,
      });

      return {
        success: true,
        result: finalResult.response,
        system2Results,
        metadata: {
          duration,
          system3Id: this.id,
          system3Name: this.name,
          system2Count: this.system2Units.length,
          strategy,
          validation: validationResult.response,
        },
      };
    } catch (error: any) {
      log.error('System3 execution failed', {
        system3Id: this.id,
        error: error.message,
      });

      this.blackboard.write('status', 'failed', this.orchestrator.id);

      return {
        success: false,
        result: null,
        system2Results,
        error: error.message,
      };
    }
  }

  /**
   * Add a System2 unit to System3
   */
  addSystem2(system2: System2): void {
    if (this.system2Units.find((s) => s.id === system2.id)) {
      log.warn('System2 already in System3', { system2Id: system2.id, system3Id: this.id });
      return;
    }

    this.system2Units.push(system2);

    log.info('System2 added to System3', {
      system2Id: system2.id,
      system2Name: system2.name,
      system3Id: this.id,
    });
  }

  /**
   * Remove a System2 unit from System3
   */
  removeSystem2(system2Id: string): boolean {
    const index = this.system2Units.findIndex((s) => s.id === system2Id);
    if (index === -1) {
      return false;
    }

    this.system2Units.splice(index, 1);

    log.info('System2 removed from System3', {
      system2Id,
      system3Id: this.id,
    });

    return true;
  }

  /**
   * Get System3 status
   */
  getStatus(): {
    system2Count: number;
    totalSystem1: number;
    globalMemorySize: number;
    blackboardStats: any;
  } {
    const totalSystem1 = this.system2Units.reduce(
      (sum, system2) => sum + system2.system1Units.length,
      0
    );

    return {
      system2Count: this.system2Units.length,
      totalSystem1,
      globalMemorySize: Object.keys(this.globalMemory).length,
      blackboardStats: this.blackboard.getStats(),
    };
  }

  /**
   * Build enterprise prompt for orchestrator
   */
  private buildEnterprisePrompt(mission: string, context?: Record<string, any>): string {
    const system2Descriptions = this.system2Units
      .map(
        (s) =>
          `- ${s.name} (ID: ${s.id}): Manages ${s.system1Units.length} System1 units, coordinated by ${s.coordinator.name}`
      )
      .join('\n');

    return `You are the System3 enterprise orchestrator managing multiple System2 strategic units. Your role is to create an enterprise strategy for the following mission.

Mission: ${mission}

Available System2 Units:
${system2Descriptions}

Please create an enterprise strategy that:
1. Analyzes the mission from an enterprise/organizational perspective
2. Defines the overall vision and enterprise-level goals
3. Identifies critical success factors and key performance indicators
4. Determines which System2 units should be engaged and their strategic objectives
5. Establishes governance, coordination mechanisms, and communication protocols
6. Specifies dependencies and execution approach (parallel, sequential, or hybrid)
7. Identifies enterprise-level risks, constraints, and mitigation strategies
8. Defines quality criteria and validation requirements

Format your enterprise strategy clearly with System2 assignments and orchestration approach.`;
  }

  /**
   * Build enterprise synthesis prompt for orchestrator
   */
  private buildEnterpriseSynthesisPrompt(
    mission: string,
    system2Results: Array<{ system2Id: string; system2Name: string; result: any }>
  ): string {
    const resultsText = system2Results
      .map((r) => `${r.system2Name}:\n${JSON.stringify(r.result, null, 2)}`)
      .join('\n\n');

    return `You are the System3 enterprise orchestrator. You assigned the following mission to multiple System2 strategic units: ${mission}

Here are the strategic outcomes from each System2 unit:

${resultsText}

Please synthesize these strategic results into an enterprise-level outcome that:
1. Integrates all System2 results into a unified enterprise perspective
2. Evaluates achievement of enterprise goals and KPIs
3. Provides comprehensive enterprise-wide insights and recommendations
4. Delivers a complete, high-quality answer to the original mission
5. Identifies lessons learned and future improvement opportunities`;
  }

  /**
   * Build validation prompt
   */
  private buildValidationPrompt(
    mission: string,
    result: string,
    system2Results: Array<{ system2Id: string; system2Name: string; result: any }>
  ): string {
    return `You are performing quality assurance for an enterprise mission.

Original Mission: ${mission}

Proposed Final Result:
${result}

System2 Strategic Results:
${JSON.stringify(system2Results, null, 2)}

Please validate:
1. Does the final result fully address the original mission?
2. Are all System2 contributions properly integrated?
3. Is the result coherent, complete, and actionable?
4. Are there any gaps, inconsistencies, or quality issues?
5. What is your confidence level (0-100%) in this result?

Provide a validation report with your assessment.`;
  }

  /**
   * Parse enterprise strategy from orchestrator response
   */
  private parseEnterpriseStrategy(strategyText: string): {
    parallel: boolean;
    system2Assignments: Array<{ system2Id: string; mission: string }>;
  } {
    // Check for parallel execution
    const parallel = /parallel/i.test(strategyText);

    const system2Assignments: Array<{ system2Id: string; mission: string }> = [];

    // Try to match System2 assignments
    const lines = strategyText.split('\n');
    let currentSystem2Id: string | null = null;
    let currentMission = '';

    for (const line of lines) {
      // Check for System2 ID
      const idMatch = line.match(/(?:System2|S2)\s+ID:\s*([a-f0-9-]+)/i);
      if (idMatch) {
        currentSystem2Id = idMatch[1];
      }

      // Check for System2 name
      const nameMatch = line.match(/(?:System2|Unit):\s*(\w+)/i);
      if (nameMatch && !currentSystem2Id) {
        const system2 = this.system2Units.find((s) =>
          s.name.toLowerCase().includes(nameMatch[1].toLowerCase())
        );
        if (system2) {
          currentSystem2Id = system2.id;
        }
      }

      // Collect mission text
      if (currentSystem2Id && line.trim() && !idMatch && !nameMatch) {
        currentMission += line.trim() + ' ';
      }

      // If we have both system2Id and mission, add it
      if (currentSystem2Id && currentMission.length > 20) {
        system2Assignments.push({
          system2Id: currentSystem2Id,
          mission: currentMission.trim(),
        });
        currentSystem2Id = null;
        currentMission = '';
      }
    }

    // If no assignments parsed, assign to first System2
    if (system2Assignments.length === 0 && this.system2Units.length > 0) {
      system2Assignments.push({
        system2Id: this.system2Units[0].id,
        mission: strategyText,
      });
    }

    return { parallel, system2Assignments };
  }

  /**
   * Execute a mission with a specific System2 unit
   */
  private async executeSystem2Mission(
    system2Id: string,
    mission: string,
    context?: Record<string, any>
  ): Promise<any> {
    const system2 = this.system2Units.find((s) => s.id === system2Id);
    if (!system2) {
      throw new Error(`System2 unit not found: ${system2Id}`);
    }

    log.debug('Executing System2 mission', {
      system2Id,
      system2Name: system2.name,
      mission,
    });

    const result = await (system2 as System2).execute(mission, context);
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

  /**
   * Get comprehensive system metrics
   */
  getMetrics(): {
    system2Count: number;
    totalSystem1: number;
    totalAgentGroups: number;
    messageStats: any;
    memoryStats: any;
  } {
    const totalSystem1 = this.system2Units.reduce(
      (sum, system2) => sum + system2.system1Units.length,
      0
    );

    const totalAgentGroups = this.system2Units.reduce(
      (sum, system2) =>
        sum + system2.system1Units.reduce((s, system1) => s + system1.agentGroups.length, 0),
      0
    );

    return {
      system2Count: this.system2Units.length,
      totalSystem1,
      totalAgentGroups,
      messageStats: this.messageBus.getStats(),
      memoryStats: this.blackboard.getStats(),
    };
  }
}

/**
 * Create a new System3 instance
 */
export function createSystem3(config: {
  name: string;
  orchestrator: Agent;
  system2Units?: System2[];
  messageBus?: MessageBus;
}): System3 {
  return new System3(config);
}

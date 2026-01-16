/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Node registry for managing and retrieving node types
 */

import { INodeType } from '@/types';
import { log } from '@/utils/logger';

// Import all node types
import { HttpRequest } from './actions/HttpRequest';
import { SendEmail } from './actions/SendEmail';
import { FileOperations } from './actions/FileOperations';
import { If } from './logic/If';
import { Switch } from './logic/Switch';
import { Loop } from './logic/Loop';
import { Wait } from './logic/Wait';
import { Set } from './transform/Set';
import { Filter } from './transform/Filter';
import { Webhook } from './triggers/Webhook';
import { Schedule } from './triggers/Schedule';
import { Database } from './integrations/Database';

/**
 * Node Registry - Central registry for all node types
 */
export class NodeRegistry {
  private static instance: NodeRegistry;
  private nodes: Map<string, INodeType>;

  private constructor() {
    this.nodes = new Map();
    this.registerCoreNodes();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): NodeRegistry {
    if (!NodeRegistry.instance) {
      NodeRegistry.instance = new NodeRegistry();
    }
    return NodeRegistry.instance;
  }

  /**
   * Register core node types
   */
  private registerCoreNodes(): void {
    // Action nodes
    this.register(new HttpRequest());
    this.register(new SendEmail());
    this.register(new FileOperations());

    // Logic nodes
    this.register(new If());
    this.register(new Switch());
    this.register(new Loop());
    this.register(new Wait());

    // Transform nodes
    this.register(new Set());
    this.register(new Filter());

    // Trigger nodes
    this.register(new Webhook());
    this.register(new Schedule());

    // Integration nodes
    this.register(new Database());

    log.info(`Registered ${this.nodes.size} core node types`);
  }

  /**
   * Register a node type
   */
  public register(node: INodeType): void {
    const nodeName = node.description.name;

    if (this.nodes.has(nodeName)) {
      log.warn(`Node type '${nodeName}' is already registered. Overwriting.`);
    }

    this.nodes.set(nodeName, node);
    log.info(`Registered node type: ${nodeName} (${node.description.displayName})`);
  }

  /**
   * Unregister a node type
   */
  public unregister(nodeName: string): boolean {
    const deleted = this.nodes.delete(nodeName);
    if (deleted) {
      log.info(`Unregistered node type: ${nodeName}`);
    }
    return deleted;
  }

  /**
   * Get a node type by name
   */
  public getNode(nodeName: string): INodeType | undefined {
    return this.nodes.get(nodeName);
  }

  /**
   * Check if a node type is registered
   */
  public hasNode(nodeName: string): boolean {
    return this.nodes.has(nodeName);
  }

  /**
   * Get all registered node types
   */
  public getAllNodes(): INodeType[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get all registered node names
   */
  public getAllNodeNames(): string[] {
    return Array.from(this.nodes.keys());
  }

  /**
   * Get nodes by group
   */
  public getNodesByGroup(group: string): INodeType[] {
    return this.getAllNodes().filter(node =>
      node.description.group.includes(group as any)
    );
  }

  /**
   * Get node metadata (descriptions only)
   */
  public getNodeMetadata() {
    return this.getAllNodes().map(node => ({
      name: node.description.name,
      displayName: node.description.displayName,
      group: node.description.group,
      version: node.description.version,
      description: node.description.description,
      defaults: node.description.defaults,
      inputs: node.description.inputs,
      outputs: node.description.outputs,
      properties: node.description.properties,
      webhooks: node.description.webhooks,
    }));
  }

  /**
   * Search nodes by query
   */
  public searchNodes(query: string): INodeType[] {
    const lowerQuery = query.toLowerCase();

    return this.getAllNodes().filter(node => {
      const { name, displayName, description, group } = node.description;

      return (
        name.toLowerCase().includes(lowerQuery) ||
        displayName.toLowerCase().includes(lowerQuery) ||
        description.toLowerCase().includes(lowerQuery) ||
        group.some(g => g.toLowerCase().includes(lowerQuery))
      );
    });
  }

  /**
   * Get trigger nodes
   */
  public getTriggerNodes(): INodeType[] {
    return this.getNodesByGroup('trigger');
  }

  /**
   * Get action nodes
   */
  public getActionNodes(): INodeType[] {
    return this.getNodesByGroup('action');
  }

  /**
   * Get transform nodes
   */
  public getTransformNodes(): INodeType[] {
    return this.getNodesByGroup('transform');
  }

  /**
   * Get logic nodes
   */
  public getLogicNodes(): INodeType[] {
    return this.getNodesByGroup('logic');
  }

  /**
   * Get integration nodes
   */
  public getIntegrationNodes(): INodeType[] {
    return this.getNodesByGroup('integration');
  }

  /**
   * Validate node configuration
   */
  public validateNode(nodeName: string, parameters: Record<string, any>): {
    valid: boolean;
    errors: string[];
  } {
    const node = this.getNode(nodeName);
    const errors: string[] = [];

    if (!node) {
      errors.push(`Node type '${nodeName}' not found`);
      return { valid: false, errors };
    }

    // Validate required parameters
    for (const property of node.description.properties) {
      if (property.required) {
        const value = parameters[property.name];

        if (value === undefined || value === null || value === '') {
          errors.push(`Required parameter '${property.name}' is missing`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get node version
   */
  public getNodeVersion(nodeName: string): number | undefined {
    const node = this.getNode(nodeName);
    return node?.description.version;
  }

  /**
   * Reset registry (useful for testing)
   */
  public reset(): void {
    this.nodes.clear();
    this.registerCoreNodes();
  }

  /**
   * Get registry statistics
   */
  public getStats() {
    const groups = this.getAllNodes().reduce((acc, node) => {
      node.description.group.forEach(group => {
        acc[group] = (acc[group] || 0) + 1;
      });
      return acc;
    }, {} as Record<string, number>);

    return {
      totalNodes: this.nodes.size,
      nodeNames: this.getAllNodeNames(),
      groupCounts: groups,
    };
  }
}

// Export singleton instance
export const nodeRegistry = NodeRegistry.getInstance();

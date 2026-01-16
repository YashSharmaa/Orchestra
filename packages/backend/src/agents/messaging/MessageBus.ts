/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: Message bus for inter-agent communication
 */

import { v4 as uuidv4 } from 'uuid';
import { IMessage, MessagePerformative } from '@/types';
import { log } from '@/utils/logger';
import { EventEmitter } from 'events';

/**
 * Message handler callback
 */
type MessageHandler = (message: IMessage) => void | Promise<void>;

/**
 * Message Bus for agent communication
 */
export class MessageBus extends EventEmitter {
  private messages: Map<string, IMessage[]>; // conversationId -> messages
  private handlers: Map<string, MessageHandler[]>; // agentId -> handlers
  private messageHistory: IMessage[];
  private maxHistorySize: number;

  constructor(maxHistorySize: number = 1000) {
    super();
    this.messages = new Map();
    this.handlers = new Map();
    this.messageHistory = [];
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Send a message
   */
  async send(
    sender: string,
    receiver: string,
    content: string,
    performative: MessagePerformative,
    conversationId?: string,
    metadata?: Record<string, any>
  ): Promise<IMessage> {
    const message: IMessage = {
      id: uuidv4(),
      conversationId: conversationId || uuidv4(),
      sender,
      receiver,
      performative,
      content,
      metadata,
      timestamp: new Date(),
    };

    // Store message in conversation
    if (!this.messages.has(message.conversationId)) {
      this.messages.set(message.conversationId, []);
    }
    this.messages.get(message.conversationId)!.push(message);

    // Add to global history
    this.messageHistory.push(message);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift(); // Remove oldest
    }

    // Emit event
    this.emit('message', message);
    this.emit(`message:${receiver}`, message);

    // Deliver to handlers
    await this.deliverMessage(message);

    log.debug('Message sent', {
      from: sender,
      to: receiver,
      performative,
      conversationId: message.conversationId,
    });

    return message;
  }

  /**
   * Broadcast a message to multiple receivers
   */
  async broadcast(
    sender: string,
    receivers: string[],
    content: string,
    performative: MessagePerformative,
    conversationId?: string,
    metadata?: Record<string, any>
  ): Promise<IMessage[]> {
    const messages = await Promise.all(
      receivers.map((receiver) =>
        this.send(sender, receiver, content, performative, conversationId, metadata)
      )
    );

    log.debug('Message broadcast', {
      from: sender,
      toCount: receivers.length,
      performative,
    });

    return messages;
  }

  /**
   * Subscribe to messages for an agent
   */
  subscribe(agentId: string, handler: MessageHandler): void {
    if (!this.handlers.has(agentId)) {
      this.handlers.set(agentId, []);
    }
    this.handlers.get(agentId)!.push(handler);

    log.debug('Agent subscribed to messages', { agentId });
  }

  /**
   * Unsubscribe from messages
   */
  unsubscribe(agentId: string, handler?: MessageHandler): void {
    if (!handler) {
      // Remove all handlers for this agent
      this.handlers.delete(agentId);
      log.debug('Agent unsubscribed (all handlers)', { agentId });
    } else {
      // Remove specific handler
      const handlers = this.handlers.get(agentId) || [];
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
      log.debug('Agent unsubscribed (specific handler)', { agentId });
    }
  }

  /**
   * Get messages in a conversation
   */
  getConversation(conversationId: string): IMessage[] {
    return this.messages.get(conversationId) || [];
  }

  /**
   * Get messages for an agent (where agent is sender or receiver)
   */
  getMessagesForAgent(agentId: string, limit?: number): IMessage[] {
    const agentMessages = this.messageHistory.filter(
      (msg) => msg.sender === agentId || msg.receiver === agentId
    );

    if (limit) {
      return agentMessages.slice(-limit);
    }
    return agentMessages;
  }

  /**
   * Get messages between two agents
   */
  getMessagesBetween(agentId1: string, agentId2: string, limit?: number): IMessage[] {
    const messages = this.messageHistory.filter(
      (msg) =>
        (msg.sender === agentId1 && msg.receiver === agentId2) ||
        (msg.sender === agentId2 && msg.receiver === agentId1)
    );

    if (limit) {
      return messages.slice(-limit);
    }
    return messages;
  }

  /**
   * Get recent messages
   */
  getRecentMessages(limit: number = 100): IMessage[] {
    return this.messageHistory.slice(-limit);
  }

  /**
   * Clear conversation
   */
  clearConversation(conversationId: string): void {
    this.messages.delete(conversationId);
    // Also remove from history
    this.messageHistory = this.messageHistory.filter(
      (msg) => msg.conversationId !== conversationId
    );
    log.debug('Conversation cleared', { conversationId });
  }

  /**
   * Clear all messages
   */
  clearAll(): void {
    this.messages.clear();
    this.messageHistory = [];
    log.debug('All messages cleared');
  }

  /**
   * Get conversation IDs
   */
  getConversationIds(): string[] {
    return Array.from(this.messages.keys());
  }

  /**
   * Wait for a response message
   */
  async waitForResponse(
    conversationId: string,
    sender: string,
    timeout: number = 30000
  ): Promise<IMessage> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.removeListener('message', handler);
        reject(new Error('Timeout waiting for response'));
      }, timeout);

      const handler = (message: IMessage) => {
        if (message.conversationId === conversationId && message.sender === sender) {
          clearTimeout(timer);
          this.removeListener('message', handler);
          resolve(message);
        }
      };

      this.on('message', handler);
    });
  }

  /**
   * Deliver message to registered handlers
   */
  private async deliverMessage(message: IMessage): Promise<void> {
    const handlers = this.handlers.get(message.receiver) || [];

    for (const handler of handlers) {
      try {
        await handler(message);
      } catch (error: any) {
        log.error('Message handler error', {
          receiver: message.receiver,
          error: error.message,
        });
      }
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalMessages: number;
    conversationCount: number;
    subscriberCount: number;
  } {
    return {
      totalMessages: this.messageHistory.length,
      conversationCount: this.messages.size,
      subscriberCount: this.handlers.size,
    };
  }
}

/**
 * Global message bus instance
 */
let globalMessageBus: MessageBus | null = null;

/**
 * Get the global message bus
 */
export function getMessageBus(): MessageBus {
  if (!globalMessageBus) {
    globalMessageBus = new MessageBus();
  }
  return globalMessageBus;
}

/**
 * Create a new message bus instance
 */
export function createMessageBus(maxHistorySize?: number): MessageBus {
  return new MessageBus(maxHistorySize);
}

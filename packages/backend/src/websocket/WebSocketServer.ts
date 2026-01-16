/**
 * Orchestra © 2025
 * Author: Orchestra Team
 * License: Apache-2.0
 * Description: WebSocket server for real-time updates using Socket.IO
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyToken, IJwtPayload } from '@/auth/jwt';
import { log } from '@/utils/logger';
import { wsEventEmitter, WebSocketEvent } from './events';

// ============================================================================
// Types
// ============================================================================

interface IAuthenticatedSocket extends Socket {
  userId: string;
  userEmail: string;
  userRole: string;
  subscriptions: Set<string>; // Set of execution IDs
}

interface ISubscribeMessage {
  executionId: string;
}

interface IUnsubscribeMessage {
  executionId: string;
}

// ============================================================================
// WebSocket Server Class
// ============================================================================

export class WebSocketServer {
  private io: SocketIOServer | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds

  constructor() {
    // Bind methods to preserve context
    this.handleConnection = this.handleConnection.bind(this);
    this.broadcastEvent = this.broadcastEvent.bind(this);
  }

  /**
   * Initialize and start the WebSocket server
   */
  initialize(httpServer: HTTPServer): void {
    log.info('Initializing Socket.IO server...');

    this.io = new SocketIOServer(httpServer, {
      path: '/socket.io',
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
        methods: ['GET', 'POST'],
      },
      pingInterval: this.HEARTBEAT_INTERVAL,
      pingTimeout: 60000,
      transports: ['websocket', 'polling'],
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token || typeof token !== 'string') {
          return next(new Error('Authentication error: No token provided'));
        }

        const payload = verifyToken(token);
        (socket as any).user = payload;
        next();
      } catch (error) {
        log.warn('Socket.IO authentication failed', { error });
        next(new Error('Authentication error: Invalid token'));
      }
    });

    this.io.on('connection', this.handleConnection);

    // Set up event listeners for broadcasting
    wsEventEmitter.onAny(this.broadcastEvent);

    log.info('Socket.IO server initialized successfully', {
      path: '/socket.io',
      pingInterval: this.HEARTBEAT_INTERVAL,
    });
  }

  /**
   * Handle new Socket.IO connection
   */
  private handleConnection(socket: Socket): void {
    const user = (socket as any).user as IJwtPayload;
    const authenticatedSocket = socket as IAuthenticatedSocket;

    // Initialize authenticated socket
    authenticatedSocket.userId = user.userId;
    authenticatedSocket.userEmail = user.email;
    authenticatedSocket.userRole = user.role;
    authenticatedSocket.subscriptions = new Set();

    log.info('Socket.IO client connected', {
      socketId: socket.id,
      userId: user.userId,
      email: user.email,
      totalClients: this.io?.sockets.sockets.size || 0,
    });

    // Send welcome message
    socket.emit('connection:established', {
      timestamp: new Date(),
      data: {
        userId: user.userId,
        serverTime: new Date(),
      },
    });

    // Handle subscribe events
    socket.on('subscribe', (data: ISubscribeMessage, ack?: Function) => {
      this.handleSubscribe(authenticatedSocket, data, ack);
    });

    // Handle unsubscribe events
    socket.on('unsubscribe', (data: IUnsubscribeMessage, ack?: Function) => {
      this.handleUnsubscribe(authenticatedSocket, data, ack);
    });

    // Handle ping events
    socket.on('ping', (ack?: Function) => {
      this.handlePing(socket, ack);
    });

    // Handle disconnect
    socket.on('disconnect', (reason) => {
      this.handleDisconnect(authenticatedSocket, reason);
    });

    // Handle errors
    socket.on('error', (error) => {
      this.handleError(authenticatedSocket, error);
    });
  }

  /**
   * Handle subscribe message
   */
  private handleSubscribe(
    socket: IAuthenticatedSocket,
    message: ISubscribeMessage,
    ack?: Function
  ): void {
    const { executionId } = message;

    if (!executionId) {
      socket.emit('error', {
        timestamp: new Date(),
        data: { message: 'executionId is required for subscription' },
      });
      if (ack) ack({ error: 'executionId is required' });
      return;
    }

    socket.subscriptions.add(executionId);

    // Join a Socket.IO room for this execution
    socket.join(`execution:${executionId}`);

    log.debug('Client subscribed to execution', {
      userId: socket.userId,
      executionId,
      totalSubscriptions: socket.subscriptions.size,
    });

    socket.emit('subscription:confirmed', {
      timestamp: new Date(),
      data: { executionId },
    });

    if (ack) ack({ success: true, executionId });
  }

  /**
   * Handle unsubscribe message
   */
  private handleUnsubscribe(
    socket: IAuthenticatedSocket,
    message: IUnsubscribeMessage,
    ack?: Function
  ): void {
    const { executionId } = message;

    if (!executionId) {
      socket.emit('error', {
        timestamp: new Date(),
        data: { message: 'executionId is required for unsubscription' },
      });
      if (ack) ack({ error: 'executionId is required' });
      return;
    }

    socket.subscriptions.delete(executionId);

    // Leave the Socket.IO room
    socket.leave(`execution:${executionId}`);

    log.debug('Client unsubscribed from execution', {
      userId: socket.userId,
      executionId,
      totalSubscriptions: socket.subscriptions.size,
    });

    socket.emit('subscription:removed', {
      timestamp: new Date(),
      data: { executionId },
    });

    if (ack) ack({ success: true, executionId });
  }

  /**
   * Handle ping message
   */
  private handlePing(socket: Socket, ack?: Function): void {
    const pongData = {
      type: 'pong',
      timestamp: Date.now(),
    };
    socket.emit('pong', pongData);
    if (ack) ack(pongData);
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnect(socket: IAuthenticatedSocket, reason: string): void {
    log.info('Socket.IO client disconnected', {
      socketId: socket.id,
      userId: socket.userId,
      email: socket.userEmail,
      reason,
      totalClients: this.io?.sockets.sockets.size || 0,
    });
  }

  /**
   * Handle Socket.IO errors
   */
  private handleError(socket: IAuthenticatedSocket, error: Error): void {
    log.error('Socket.IO error', {
      socketId: socket.id,
      userId: socket.userId,
      email: socket.userEmail,
      error: error.message,
      stack: error.stack,
    });
  }

  /**
   * Broadcast event to all subscribed clients
   */
  private broadcastEvent(event: WebSocketEvent): void {
    if (!this.io) return;

    // Extract executionId from event data if it exists
    const executionId = (event.data as any)?.executionId;

    if (!executionId) {
      // If no executionId, this is a system-wide event
      this.io.emit(event.type, event);
      log.debug('Event broadcasted to all clients', {
        eventType: event.type,
      });
      return;
    }

    // Broadcast to subscribed clients only (using Socket.IO rooms)
    const room = `execution:${executionId}`;
    this.io.to(room).emit(event.type, event);

    log.debug('Event broadcasted', {
      eventType: event.type,
      executionId,
      room,
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  public broadcastToAll(eventType: string, message: any): void {
    if (!this.io) return;

    this.io.emit(eventType, message);

    log.debug('Message broadcasted to all clients', {
      eventType,
    });
  }

  /**
   * Broadcast to clients subscribed to a specific execution
   */
  public broadcastToExecution(executionId: string, eventType: string, message: any): void {
    if (!this.io) return;

    const room = `execution:${executionId}`;
    this.io.to(room).emit(eventType, message);

    log.debug('Message broadcasted to execution subscribers', {
      executionId,
      eventType,
      room,
    });
  }

  /**
   * Broadcast to a specific user
   */
  public broadcastToUser(userId: string, eventType: string, message: any): void {
    if (!this.io) return;

    // Find all sockets for this user
    const sockets = Array.from(this.io.sockets.sockets.values());
    const userSockets = sockets.filter((s) => (s as IAuthenticatedSocket).userId === userId);

    userSockets.forEach((socket) => {
      socket.emit(eventType, message);
    });

    log.debug('Message broadcasted to user', {
      userId,
      eventType,
      socketCount: userSockets.length,
    });
  }

  /**
   * Get connected clients count
   */
  public getClientCount(): number {
    return this.io?.sockets.sockets.size || 0;
  }

  /**
   * Get subscribers count for a specific execution
   */
  public getExecutionSubscriberCount(executionId: string): number {
    if (!this.io) return 0;

    const room = `execution:${executionId}`;
    const sockets = this.io.sockets.adapter.rooms.get(room);
    return sockets?.size || 0;
  }

  /**
   * Close all connections and shut down the server
   */
  public async close(): Promise<void> {
    log.info('Shutting down Socket.IO server...');

    if (this.io) {
      // Disconnect all clients
      this.io.disconnectSockets(true);

      // Close the server
      await new Promise<void>((resolve) => {
        this.io!.close(() => {
          log.info('Socket.IO server shut down successfully');
          resolve();
        });
      });

      this.io = null;
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let webSocketServerInstance: WebSocketServer | null = null;

/**
 * Get the singleton WebSocket server instance
 */
export function getWebSocketServer(): WebSocketServer {
  if (!webSocketServerInstance) {
    webSocketServerInstance = new WebSocketServer();
  }
  return webSocketServerInstance;
}

/**
 * Initialize the WebSocket server with an HTTP server
 */
export function initializeWebSocketServer(httpServer: HTTPServer): WebSocketServer {
  const wsServer = getWebSocketServer();
  wsServer.initialize(httpServer);
  return wsServer;
}

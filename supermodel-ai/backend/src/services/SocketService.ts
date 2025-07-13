import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../config/logger';
import { SocketMessage } from '../types';

export class SocketService {
  private io: SocketIOServer;
  private connectedClients: Map<string, Socket> = new Map();
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(io: SocketIOServer) {
    this.io = io;
    this.setupSocketEvents();
    logger.info('SocketService initialized');
  }

  private setupSocketEvents(): void {
    this.io.on('connection', (socket: Socket) => {
      logger.info(`Client connected: ${socket.id}`);
      this.connectedClients.set(socket.id, socket);

      socket.on('authenticate', (data: { userId: string; token: string }) => {
        this.handleAuthentication(socket, data);
      });

      socket.on('join_session', (data: { sessionId: string }) => {
        this.handleJoinSession(socket, data);
      });

      socket.on('leave_session', (data: { sessionId: string }) => {
        this.handleLeaveSession(socket, data);
      });

      socket.on('ai_request', (data: any) => {
        this.handleAIRequest(socket, data);
      });

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });

      socket.on('error', (error) => {
        logger.error(`Socket error for ${socket.id}:`, error);
      });
    });
  }

  private handleAuthentication(socket: Socket, data: { userId: string; token: string }): void {
    try {
      // In a real implementation, you would verify the JWT token here
      const { userId } = data;
      
      // Associate socket with user
      socket.data.userId = userId;
      socket.data.authenticated = true;
      
      // Add to user sockets map
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);
      
      socket.emit('authenticated', { success: true, userId });
      logger.info(`User ${userId} authenticated via socket ${socket.id}`);
    } catch (error) {
      socket.emit('authentication_failed', { error: 'Authentication failed' });
      logger.error(`Authentication failed for socket ${socket.id}:`, error);
    }
  }

  private handleJoinSession(socket: Socket, data: { sessionId: string }): void {
    const { sessionId } = data;
    
    if (!socket.data.authenticated) {
      socket.emit('error', { message: 'Authentication required' });
      return;
    }
    
    socket.join(sessionId);
    socket.data.sessionId = sessionId;
    
    socket.emit('session_joined', { sessionId });
    logger.info(`Socket ${socket.id} joined session ${sessionId}`);
  }

  private handleLeaveSession(socket: Socket, data: { sessionId: string }): void {
    const { sessionId } = data;
    
    socket.leave(sessionId);
    delete socket.data.sessionId;
    
    socket.emit('session_left', { sessionId });
    logger.info(`Socket ${socket.id} left session ${sessionId}`);
  }

  private handleAIRequest(socket: Socket, data: any): void {
    if (!socket.data.authenticated) {
      socket.emit('error', { message: 'Authentication required' });
      return;
    }
    
    // Emit the request to the AI processing system
    socket.emit('ai_request_received', { requestId: data.requestId || 'unknown' });
    
    // In a real implementation, this would trigger the AI processing
    logger.info(`AI request received from socket ${socket.id}`);
  }

  private handleDisconnect(socket: Socket): void {
    logger.info(`Client disconnected: ${socket.id}`);
    
    // Remove from connected clients
    this.connectedClients.delete(socket.id);
    
    // Remove from user sockets map
    if (socket.data.userId) {
      const userSockets = this.userSockets.get(socket.data.userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          this.userSockets.delete(socket.data.userId);
        }
      }
    }
  }

  // Public methods for sending messages

  broadcastToAll(event: string, data: any): void {
    this.io.emit(event, data);
    logger.debug(`Broadcasted ${event} to all connected clients`);
  }

  sendToUser(userId: string, event: string, data: any): void {
    const userSockets = this.userSockets.get(userId);
    
    if (userSockets) {
      userSockets.forEach(socketId => {
        const socket = this.connectedClients.get(socketId);
        if (socket) {
          socket.emit(event, data);
        }
      });
      
      logger.debug(`Sent ${event} to user ${userId} (${userSockets.size} sockets)`);
    }
  }

  sendToSession(sessionId: string, event: string, data: any): void {
    this.io.to(sessionId).emit(event, data);
    logger.debug(`Sent ${event} to session ${sessionId}`);
  }

  sendToSocket(socketId: string, event: string, data: any): void {
    const socket = this.connectedClients.get(socketId);
    
    if (socket) {
      socket.emit(event, data);
      logger.debug(`Sent ${event} to socket ${socketId}`);
    }
  }

  // AI-specific methods

  sendAIResponse(sessionId: string, response: any): void {
    this.sendToSession(sessionId, 'ai_response', response);
  }

  sendAIProgress(sessionId: string, progress: any): void {
    this.sendToSession(sessionId, 'ai_progress', progress);
  }

  sendSkillPackLoaded(sessionId: string, skillPack: any): void {
    this.sendToSession(sessionId, 'skill_pack_loaded', skillPack);
  }

  sendSkillPackOffloaded(sessionId: string, skillPackId: string): void {
    this.sendToSession(sessionId, 'skill_pack_offloaded', { skillPackId });
  }

  sendError(sessionId: string, error: any): void {
    this.sendToSession(sessionId, 'error', error);
  }

  // Analytics and monitoring

  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  getAuthenticatedUsersCount(): number {
    return this.userSockets.size;
  }

  getSessionsCount(): number {
    return this.io.sockets.adapter.rooms.size;
  }

  getStats(): {
    connectedClients: number;
    authenticatedUsers: number;
    activeSessions: number;
    totalRooms: number;
  } {
    return {
      connectedClients: this.getConnectedClientsCount(),
      authenticatedUsers: this.getAuthenticatedUsersCount(),
      activeSessions: this.getSessionsCount(),
      totalRooms: this.io.sockets.adapter.rooms.size,
    };
  }

  // Utility methods

  isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  getUserSocketIds(userId: string): string[] {
    const userSockets = this.userSockets.get(userId);
    return userSockets ? Array.from(userSockets) : [];
  }

  disconnectUser(userId: string): void {
    const userSockets = this.userSockets.get(userId);
    
    if (userSockets) {
      userSockets.forEach(socketId => {
        const socket = this.connectedClients.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
      });
      
      this.userSockets.delete(userId);
      logger.info(`Disconnected all sockets for user ${userId}`);
    }
  }
}
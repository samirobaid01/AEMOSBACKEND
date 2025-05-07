import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '../utils/api/apiClient';

type EventHandler = (data: any) => void;
type EventMap = Record<string, EventHandler[]>;

// Socket server URL based on environment
const SOCKET_URL = import.meta.env.DEV 
  ? 'http://localhost:3000'  // Development - connect directly to backend
  : '/';                    // Production - relative path (served by same origin)

/**
 * Socket Service for handling real-time communications
 */
class SocketService {
  private socket: Socket | null = null;
  private eventHandlers: EventMap = {};
  private autoReconnect = true;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000; // 2 seconds

  /**
   * Initialize the socket connection
   */
  public init(): void {
    if (this.socket) {
      console.warn('Socket connection already initialized');
      return;
    }

    // Create socket instance with auth token
    const token = getAccessToken();
    this.socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: token ? { token } : undefined,
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    // Set up event listeners
    this.setupSocketEventListeners();
  }

  /**
   * Set up internal socket event listeners
   */
  private setupSocketEventListeners(): void {
    if (!this.socket) return;

    // Handle connection events
    this.socket.on('connect', () => {
      console.log(`Socket connected: ${this.socket?.id}`);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${reason}`);
      
      // Attempt to reconnect if appropriate
      if (this.autoReconnect && ['io server disconnect', 'io client disconnect'].includes(reason)) {
        this.reconnect();
      }
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    this.socket.on('reconnect_attempt', (attempt) => {
      console.log(`Socket reconnect attempt: ${attempt}`);
      this.reconnectAttempts = attempt;
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Socket reconnection failed after max attempts');
    });

    // Handle custom events from server
    this.socket.onAny((event, data) => {
      this.triggerEventHandlers(event, data);
    });
  }

  /**
   * Join rooms for targeted notifications
   * @param {string | string[]} rooms - Room name(s) to join
   */
  public joinRooms(rooms: string | string[]): void {
    if (!this.socket) {
      console.error('Socket not initialized');
      return;
    }

    this.socket.emit('join', rooms);
  }

  /**
   * Listen for an event
   * @param {string} event - Event name
   * @param {function} handler - Event handler
   */
  public on(event: string, handler: EventHandler): void {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  /**
   * Remove an event listener
   * @param {string} event - Event name
   * @param {function} handler - Event handler to remove
   */
  public off(event: string, handler: EventHandler): void {
    if (!this.eventHandlers[event]) return;

    const index = this.eventHandlers[event].indexOf(handler);
    if (index !== -1) {
      this.eventHandlers[event].splice(index, 1);
    }
  }

  /**
   * Emit an event to the server
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  public emit(event: string, data?: any): void {
    if (!this.socket) {
      console.error('Socket not initialized');
      return;
    }

    this.socket.emit(event, data);
  }

  /**
   * Trigger all handlers for an event
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  private triggerEventHandlers(event: string, data: any): void {
    if (!this.eventHandlers[event]) return;

    this.eventHandlers[event].forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in ${event} handler:`, error);
      }
    });
  }

  /**
   * Manually reconnect socket
   */
  public reconnect(): void {
    if (!this.socket) {
      this.init();
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    this.socket.connect();
  }

  /**
   * Disconnect the socket
   */
  public disconnect(): void {
    if (!this.socket) return;

    this.autoReconnect = false;
    this.socket.disconnect();
  }

  /**
   * Get the socket instance
   */
  public getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Refresh the auth token (call after login/token refresh)
   */
  public updateAuthToken(): void {
    if (!this.socket) return;

    const token = getAccessToken();
    this.socket.auth = { token };
    
    // If already connected, disconnect and reconnect with new token
    if (this.socket.connected) {
      this.socket.disconnect().connect();
    }
  }
}

// Export as singleton
export const socketService = new SocketService();

export default socketService; 
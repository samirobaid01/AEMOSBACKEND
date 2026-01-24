/**
 * Socket.io Manager for handling real-time communication
 */
const socketIo = require('socket.io');
const logger = require('./logger');

let io;

/**
 * Initialize Socket.io server with HTTP server instance
 * @param {Object} server - HTTP server instance
 */
function initialize(server) {
  io = socketIo(server, {
    path: '/socket.io',
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingInterval: 10000,
    pingTimeout: 5000
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Handle user joining specific rooms (by user ID, org ID, etc.)
    socket.on('join', (rooms) => {
      if (Array.isArray(rooms)) {
        rooms.forEach(room => {
          socket.join(room);
          logger.debug(`Socket ${socket.id} joined room: ${room}`);
        });
      } else if (typeof rooms === 'string') {
        socket.join(rooms);
        logger.debug(`Socket ${socket.id} joined room: ${rooms}`);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  logger.info('Socket.io server initialized');
  return io;
}

/**
 * Emit event to all connected clients
 * @param {String} event - Event name
 * @param {Object} data - Event data
 */
function broadcastToAll(event, data) {
  if (!io) {
    logger.debug('Socket.io not initialized');
    return false;
  }
  
  io.emit(event, data);
  logger.debug(`Broadcasting event "${event}" to all clients`);
  return true;
}

/**
 * Emit event to specific room
 * @param {String} room - Room name (can be userId, orgId, etc.)
 * @param {String} event - Event name
 * @param {Object} data - Event data
 */
function broadcastToRoom(room, event, data) {
  if (!io) {
    logger.debug('Socket.io not initialized');
    return false;
  }
  
  io.to(room).emit(event, data);
  logger.debug(`Broadcasting event "${event}" to room: ${room}`);
  return true;
}

/**
 * Emit event to specific socket
 * @param {String} socketId - Socket ID
 * @param {String} event - Event name
 * @param {Object} data - Event data
 */
function sendToClient(socketId, event, data) {
  if (!io) {
    logger.debug('Socket.io not initialized');
    return false;
  }
  
  const socket = io.sockets.sockets.get(socketId);
  if (!socket) {
    logger.warn(`Socket ${socketId} not found`);
    return false;
  }
  
  socket.emit(event, data);
  logger.debug(`Sent event "${event}" to socket: ${socketId}`);
  return true;
}

module.exports = {
  initialize,
  broadcastToAll,
  broadcastToRoom,
  sendToClient,
  getIo: () => io
}; 
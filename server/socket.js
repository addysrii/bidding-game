var { Server } = require('socket.io');

var ioInstance = null;

function init(httpServer) {
  if (ioInstance) {
    return ioInstance;
  }

  ioInstance = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    connectTimeout: 45000,
  });

  return ioInstance;
}

function getIO() {
  if (!ioInstance) {
    throw new Error('Socket.io is not initialized. Call init(httpServer) first.');
  }

  return ioInstance;
}

module.exports = {
  init: init,
  getIO: getIO
};

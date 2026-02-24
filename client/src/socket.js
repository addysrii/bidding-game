import { io } from 'socket.io-client';
import { resolveSocketUrl } from './socketUrl';

let socketInstance = null;

export const initSocket = (options = {}) => {
    if (socketInstance) {
        return socketInstance;
    }

    const isProd = import.meta.env.PROD;
    socketInstance = io(resolveSocketUrl(), {
        transports: ['websocket'],
        upgrade: !isProd,
        reconnection: true,
        reconnectionAttempts: Infinity,
        // reconnectionDelay:
        reconnectionDelayMax: 5000,
        ...options
    });

    socketInstance.on('connect', () => {
  console.log('Socket connected:',socketInstance.id);
});

socketInstance.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
});

socketInstance.on('connect_error', (err) => {
  console.error('Socket error:', err.message);
});
socketInstance.on('connect', () => {
  console.log('Socket connected:', socketInstance.id);
});

socketInstance.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
});

socketInstance.on('connect_error', (err) => {
  console.error('Socket error:', err.message);
});

    return socketInstance;
};

export const getSocket = () => {
    if (!socketInstance) {
        throw new Error('Socket client is not initialized. Call initSocket() first.');
    }

    return socketInstance;
};

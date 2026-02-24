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
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        ...options
    });

    return socketInstance;
};

export const getSocket = () => {
    if (!socketInstance) {
        throw new Error('Socket client is not initialized. Call initSocket() first.');
    }

    return socketInstance;
};

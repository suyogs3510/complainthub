import { io } from 'socket.io-client'
export const hasSocketURL = !!import.meta.env.VITE_SOCKET_URL
const url = hasSocketURL ? import.meta.env.VITE_SOCKET_URL : 'http://localhost:3006'
export const socket = io(url, { autoConnect: false, transports: ['websocket'], reconnection: true, timeout: 2000 })

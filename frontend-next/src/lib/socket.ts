import { io, type Socket } from "socket.io-client";

/**
 * Socket.IO connection to the (unchanged) backend. Mirrors the existing usage:
 * connect to the API origin (or same origin behind the reverse proxy), then
 * join/leave named rooms (e.g. `contest:<id>`). Verdict and scoreboard events
 * are emitted by the backend exactly as before.
 */
export function createSocket(): Socket {
  const url =
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return io(url, { transports: ["websocket", "polling"], autoConnect: true });
}

export function joinRoom(socket: Socket, room: string): void {
  socket.emit("join", room);
}

export function leaveRoom(socket: Socket, room: string): void {
  socket.emit("leave", room);
}

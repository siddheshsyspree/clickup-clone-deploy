import { io, type Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

let socket: Socket | null = null;

export function getSocket(accessToken: string): Socket {
  // Reuse by token identity alone, not connection state: a socket that's still
  // mid-handshake is not yet `.connected`, and tearing it down here (as this
  // used to do) meant any second getSocket() call during that brief window —
  // e.g. a workspace layout and a chat page both mounting on the same
  // navigation — killed the in-flight connection out from under whichever
  // component had just registered a "connect" listener on it, so that
  // listener (e.g. join:channel) silently never fired.
  if (socket && socket.auth && (socket.auth as { token: string }).token === accessToken) {
    return socket;
  }
  if (socket) {
    socket.disconnect();
  }
  socket = io(SOCKET_URL, {
    auth: { token: accessToken },
    transports: ["websocket", "polling"],
    autoConnect: true,
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

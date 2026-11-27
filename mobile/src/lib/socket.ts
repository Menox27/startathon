import { io, type Socket } from "socket.io-client";
import { API_URL } from "./api";

let socket: Socket | null = null;

/** One shared connection; the handshake is authenticated by the HttpOnly session cookie. */
export function getSocket() {
  socket ??= io(API_URL, { withCredentials: true, autoConnect: false });
  return socket;
}

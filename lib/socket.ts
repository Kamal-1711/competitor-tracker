import { io as createSocketClient, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export const initSocket = (workspaceId: string): Socket | null => {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    if (!backendUrl) {
      return null;
    }

    if (!socket) {
      socket = createSocketClient(backendUrl, {
        transports: ["websocket", "polling"],
      });
    }

    socket.on("connect", () => {
      try {
        socket?.emit("join_workspace", workspaceId);
      } catch (error) {
        console.error("Socket join failed", error);
      }
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection failed", error);
    });

    return socket;
  } catch (error) {
    console.error("Socket init failed", error);
    return null;
  }
};

export const getSocket = (): Socket | null => socket;

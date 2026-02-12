import { createServer, type Server as HttpServer } from "node:http";
import { Server } from "socket.io";

let httpServer: HttpServer | null = null;
let io: Server | null = null;

function getSocketPort(): number {
  const parsed = Number(process.env.SOCKET_IO_PORT ?? "4001");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 4001;
  }
  return parsed;
}

export function initializeSocketServer(): Server | null {
  if (io) return io;

  try {
    const port = getSocketPort();
    httpServer = createServer((_, res) => {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Socket server is running");
    });

    io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      console.log("Socket connected:", socket.id);

      socket.on("join_workspace", (workspaceId: string) => {
        if (!workspaceId) return;
        socket.join(workspaceId);
      });

      socket.on("disconnect", () => {
        console.log("Socket disconnected:", socket.id);
      });
    });

    httpServer.on("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`Port ${port} is already in use. Socket server will not be active for this instance.`);
      } else {
        console.error("Socket server error:", err);
      }
      io = null;
      httpServer = null;
    });

    httpServer.listen(port, () => {
      console.log(`Socket server running on port ${port}`);
    });

    return io;
  } catch (error) {
    console.error("Failed to initialize socket server", error);
    io = null;
    httpServer = null;
    return null;
  }
}

export function getSocketServer(): Server | null {
  return io;
}

export { io };

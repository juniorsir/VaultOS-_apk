import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // P2P Room Creation
  app.post("/pair/create", (req, res) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    res.json({ roomId });
  });

  // WebRTC Signaling
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
      
      const room = io.sockets.adapter.rooms.get(roomId);
      const numClients = room ? room.size : 0;
      
      if (numClients === 2) {
        const clients = Array.from(room);
        const hostId = clients[0];
        
        // Notify both clients that the peer is connected, and designate the host as initiator
        io.in(roomId).emit("peer-connected", { initiator: hostId });
      }
    });

    socket.on("offer", ({ roomId, sdp }) => {
      socket.to(roomId).emit("offer", { sdp });
    });

    socket.on("answer", ({ roomId, sdp }) => {
      socket.to(roomId).emit("answer", { sdp });
    });

    socket.on("ice-candidate", ({ roomId, candidate }) => {
      socket.to(roomId).emit("ice-candidate", { candidate });
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      // We could broadcast peer-disconnected to all rooms the socket was in,
      // but socket.rooms is empty on disconnect. We'd need to track rooms.
      // For simplicity, we can broadcast to all if needed, or track it.
    });
    
    socket.on("disconnecting", () => {
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          socket.to(room).emit("peer-disconnected");
        }
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import session from "express-session";
import cors from "cors";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@ai-dixit/shared";
import { config } from "./config.js";
import { ImageGenerator } from "./ImageGenerator.js";
import { SocketHandler } from "./SocketHandler.js";
import { httpRateLimiter } from "./rateLimiter.js";

const app = express();
const httpServer = createServer(app);

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Session middleware (shared between Express and Socket.IO)
const sessionMiddleware = session({
  secret: config.session.secret,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
    maxAge: 24 * 60 * 60 * 1000,
  },
});

app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(httpRateLimiter);
app.use(sessionMiddleware);

// Socket.IO setup
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: config.cors.origin,
    credentials: true,
  },
  maxHttpBufferSize: 1e6, // 1MB max message size
});

// Share session with Socket.IO
io.engine.use(sessionMiddleware);

// Initialize services
const imageGenerator = new ImageGenerator({
  apiKey: config.gemini.apiKey,
  dailyCapImages: config.gemini.dailyCapImages,
});

const socketHandler = new SocketHandler(io, imageGenerator);

// Health check
const startTime = Date.now();
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    env: process.env.NODE_ENV ?? "development",
    uptime: Math.floor((Date.now() - startTime) / 1000),
  });
});

// Admin stats endpoint (basic auth)
app.get("/api/admin/stats", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    res.status(401).set("WWW-Authenticate", "Basic").send("Unauthorized");
    return;
  }

  const credentials = Buffer.from(authHeader.slice(6), "base64").toString();
  const [, password] = credentials.split(":");

  if (password !== config.admin.password) {
    res.status(401).send("Unauthorized");
    return;
  }

  res.json(socketHandler.getStats());
});

// Start server
httpServer.listen(config.port, () => {
  console.log(
    JSON.stringify({
      event: "server_started",
      port: config.port,
      cors: config.cors.origin,
      env: process.env.NODE_ENV ?? "development",
    })
  );
});

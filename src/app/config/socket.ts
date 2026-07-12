import { JwtPayload } from "jsonwebtoken";
import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import prisma from "../lib/prisma";
import { corsOrigin } from "../utils/corsOrigin";
import { verifyToken } from "../utils/jwt";

export let io: SocketIOServer | null = null;

const activeUserSockets = new Map<string, Set<string>>();

const extractAccessToken = (socket: Socket) => {
  const tokenFromAuth = socket.handshake.auth?.token;

  if (typeof tokenFromAuth === "string" && tokenFromAuth.trim()) {
    return tokenFromAuth.trim();
  }

  const cookieHeader = socket.handshake.headers.cookie ?? "";
  const cookieValue = cookieHeader
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith("accessToken="));

  return cookieValue?.replace("accessToken=", "") ?? "";
};

const broadcastPresence = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      image: true,
      isOnline: true,
      lastSeenAt: true,
    },
  });

  if (!user) {
    return;
  }

  io?.emit("presence:status", {
    userId: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    image: user.image,
    isOnline: user.isOnline,
    lastSeenAt: user.lastSeenAt,
  });
};

const setUserOnline = async (userId: string) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      isOnline: true,
      lastSeenAt: new Date(),
    },
  });

  await broadcastPresence(userId);
};

const setUserOffline = async (userId: string) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      isOnline: false,
      lastSeenAt: new Date(),
    },
  });

  await broadcastPresence(userId);
};

const addSocketForUser = async (userId: string, socketId: string) => {
  const connections = activeUserSockets.get(userId) ?? new Set<string>();
  connections.add(socketId);
  activeUserSockets.set(userId, connections);

  if (connections.size === 1) {
    await setUserOnline(userId);
  }
};

const removeSocketForUser = async (userId: string, socketId: string) => {
  const connections = activeUserSockets.get(userId);

  if (!connections) {
    return;
  }

  connections.delete(socketId);

  if (connections.size === 0) {
    activeUserSockets.delete(userId);
    await setUserOffline(userId);
  }
};

export const initializeSocket = (server: HttpServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const accessToken = extractAccessToken(socket);

      if (!accessToken) {
        return next(new Error("Unauthorized"));
      }

      const payload = verifyToken(accessToken) as JwtPayload;

      if (!payload?.id) {
        return next(new Error("Unauthorized"));
      }

      socket.data.user = payload;
      socket.data.userId = payload.id as string;

      return next();
    } catch (error) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string | undefined;

    if (!userId) {
      console.log(`🚫 Socket.IO unauthorized connection rejected: ${socket.id}`);
      socket.disconnect();
      return;
    }

    console.log(`🔌 Socket.IO client connected: ${socket.id} for user ${userId}`);

    void addSocketForUser(userId, socket.id);

    socket.on("presence:heartbeat", async () => {
      await prisma.user.update({
        where: { id: userId },
        data: {
          isOnline: true,
          lastSeenAt: new Date(),
        },
      });

      await broadcastPresence(userId);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Socket.IO client disconnected: ${socket.id} for user ${userId}`);
      void removeSocketForUser(userId, socket.id);
    });
  });

  return io;
};

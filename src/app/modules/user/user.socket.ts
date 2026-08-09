import { Server as SocketIOServer, Socket } from "socket.io";
import prisma from "../../lib/prisma";
import {
  setUserOnlineInRedis,
  setUserOfflineInRedis,
  touchUserHeartbeatInRedis,
  isUserOnlineInRedis,
  getUserLastSeenFromRedis,
} from "../../services/presence.service";

const activeUserSockets = new Map<string, Set<string>>();

export const broadcastPresence = async (io: SocketIOServer, userId: string) => {
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
    },
  });

  if (!user) {
    return;
  }

  const isOnline = await isUserOnlineInRedis(userId);
  const lastSeenAt = await getUserLastSeenFromRedis(userId);

  io.emit("presence:status", {
    userId: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    image: user.image,
    isOnline,
    lastSeenAt: lastSeenAt ?? null,
  });
};

export const setUserOnline = async (io: SocketIOServer, userId: string) => {
  await setUserOnlineInRedis(userId);
  await broadcastPresence(io, userId);
};

export const setUserOffline = async (io: SocketIOServer, userId: string) => {
  await setUserOfflineInRedis(userId);
  await broadcastPresence(io, userId);
};

export const addSocketForUser = async (
  io: SocketIOServer,
  userId: string,
  socketId: string,
) => {
  const connections = activeUserSockets.get(userId) ?? new Set<string>();
  connections.add(socketId);
  activeUserSockets.set(userId, connections);

  if (connections.size === 1) {
    await setUserOnline(io, userId);
  }
};

export const removeSocketForUser = async (
  io: SocketIOServer,
  userId: string,
  socketId: string,
) => {
  const connections = activeUserSockets.get(userId);

  if (!connections) {
    return;
  }

  connections.delete(socketId);

  if (connections.size === 0) {
    activeUserSockets.delete(userId);
    await setUserOffline(io, userId);
  }
};

export const registerUserSocketHandler = (io: SocketIOServer, socket: Socket) => {
  const userId = socket.data.userId as string | undefined;

  if (!userId) {
    console.log(`🚫 Socket.IO unauthorized connection rejected: ${socket.id}`);
    socket.disconnect();
    return;
  }

  console.log(`🔌 Socket.IO client connected: ${socket.id} for user ${userId}`);

  void addSocketForUser(io, userId, socket.id);

  socket.on("presence:heartbeat", async () => {
    await touchUserHeartbeatInRedis(userId);
    await broadcastPresence(io, userId);
  });

  socket.on("disconnect", () => {
    console.log(`🔌 Socket.IO client disconnected: ${socket.id} for user ${userId}`);
    void removeSocketForUser(io, userId, socket.id);
  });
};

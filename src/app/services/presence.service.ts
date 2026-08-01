import { redisClient } from "../config/redis";
import prisma from "../lib/prisma";

const ONLINE_USERS_KEY = "presence:online_users";
const LAST_SEEN_KEY_PREFIX = "presence:lastseen:";

export const setUserOnlineInRedis = async (userId: string) => {
  const now = new Date().toISOString();
  await Promise.all([
    redisClient.sAdd(ONLINE_USERS_KEY, userId),
    redisClient.set(`${LAST_SEEN_KEY_PREFIX}${userId}`, now),
  ]);
};

export const setUserOfflineInRedis = async (userId: string) => {
  const now = new Date().toISOString();
  await Promise.all([
    redisClient.sRem(ONLINE_USERS_KEY, userId),
    redisClient.set(`${LAST_SEEN_KEY_PREFIX}${userId}`, now),
  ]);
};

export const touchUserHeartbeatInRedis = async (userId: string) => {
  const now = new Date().toISOString();
  await Promise.all([
    redisClient.sAdd(ONLINE_USERS_KEY, userId),
    redisClient.set(`${LAST_SEEN_KEY_PREFIX}${userId}`, now),
  ]);
};

export const isUserOnlineInRedis = async (userId: string): Promise<boolean> => {
  const isMember = await redisClient.sIsMember(ONLINE_USERS_KEY, userId);
  return Boolean(isMember);
};

export const getUserLastSeenFromRedis = async (userId: string): Promise<string | null> => {
  return await redisClient.get(`${LAST_SEEN_KEY_PREFIX}${userId}`);
};

export const getAllOnlineUsersFromRedis = async () => {
  const onlineUserIds = await redisClient.sMembers(ONLINE_USERS_KEY);

  if (!onlineUserIds || onlineUserIds.length === 0) {
    return [];
  }

  const users = await prisma.user.findMany({
    where: {
      id: {
        in: onlineUserIds,
      },
    },
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

  const lastSeenPromises = users.map((user) => getUserLastSeenFromRedis(user.id));
  const lastSeenResults = await Promise.all(lastSeenPromises);

  return users.map((user, idx) => ({
    ...user,
    isOnline: true,
    lastSeenAt: lastSeenResults[idx] ?? null,
  }));
};

import { Socket } from "socket.io";
import { JwtPayload } from "jsonwebtoken";
import { verifyToken } from "../app/utils/jwt";

export const extractAccessToken = (socket: Socket): string => {
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

export const socketAuthMiddleware = async (
  socket: Socket,
  next: (err?: Error) => void,
) => {
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
};

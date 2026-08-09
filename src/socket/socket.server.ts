import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { corsOrigin } from "../app/utils/corsOrigin";
import { socketAuthMiddleware } from "./socket.middleware";
import { registerUserSocketHandler } from "../app/modules/user/user.socket";
import {
  registerProductSocketHandler,
  broadcastStockUpdateToClients,
} from "../app/modules/product/product.socket";
import { StockUpdatePayload } from "./socket.types";

export let io: SocketIOServer | null = null;

export const broadcastStockUpdate = (payload: StockUpdatePayload) => {
  broadcastStockUpdateToClients(io, payload);
};

export const initializeSocket = (server: HttpServer): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  });

  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    registerUserSocketHandler(io!, socket);
    registerProductSocketHandler(io!, socket);
  });

  return io;
};

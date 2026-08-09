import { Server as SocketIOServer } from "socket.io";
import { StockUpdatePayload } from "../../../socket/socket.types";

export const registerProductSocketHandler = (
  _io: SocketIOServer,
  _socket: any,
) => {
  // Module-level socket listeners can be attached here when needed
};

export const broadcastStockUpdateToClients = (
  io: SocketIOServer | null,
  payload: StockUpdatePayload,
) => {
  io?.emit("stock:update", payload);
};

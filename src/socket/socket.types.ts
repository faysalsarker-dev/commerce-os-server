import { Socket } from "socket.io";
import { JwtPayload } from "jsonwebtoken";

export type StockUpdatePayload = {
  variantId: string;
  productId?: string;
  productName?: string;
  colorName?: string;
  size?: string;
  stockQty: number;
  movementType: "SALE_OUT" | "RETURN_IN";
  updatedAt: Date;
};

export interface AuthenticatedSocket extends Socket {
  data: {
    user?: JwtPayload;
    userId?: string;
  };
}

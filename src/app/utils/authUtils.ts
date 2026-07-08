import { User } from "../generated/prisma/client";
import { generateAccessToken, generateRefreshToken } from "./jwt";


export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export const safeUser = (user: User) => {
  const { password, ...rest } = user;
  return rest;
};

export const buildTokens = (user: User): AuthTokens => ({
  accessToken: generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
  }),
  refreshToken: generateRefreshToken({
    id: user.id,
    email: user.email,
    role: user.role,
  }),
});
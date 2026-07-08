import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";
import { config } from "../config";

type TokenPayload = Record<string, unknown>;


const generateToken = (
  payload: TokenPayload,
  secret: string,
  expiresIn: SignOptions["expiresIn"]
): string => {
  return jwt.sign(payload, secret, { expiresIn });
};


export const generateAccessToken = (payload: TokenPayload) => {
  return generateToken(payload, config.jwt.secret, config.jwt.expiresIn as SignOptions["expiresIn"]);
};

export const generateRefreshToken = (payload: TokenPayload) => {
  return generateToken(payload, config.jwt.refreshSecret, config.jwt.refreshExpiresIn as SignOptions["expiresIn"]);
};

export const generatePasswordResetToken = (payload: TokenPayload) => {
  return generateToken(payload, config.jwt.refreshSecret, "1h" as SignOptions["expiresIn"]);
};

export const verifyToken = (token: string, secret: string = config.jwt.secret) => {
  return jwt.verify(token, secret) as JwtPayload;
};

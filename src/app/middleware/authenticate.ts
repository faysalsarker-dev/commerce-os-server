

import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt";
import { JwtPayload } from "jsonwebtoken";
import { AppError } from "../errors/ApiError";

export const checkAuth =
  (authRoles?: string[]) =>
  async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const accessToken = req.cookies.accessToken;


if (!accessToken) {
  console.log("No access token found in cookies", req.originalUrl);
  throw new AppError("No token provided", 401);
}

let verifiedToken: JwtPayload;

try {
  verifiedToken = verifyToken(accessToken) as JwtPayload;
} catch (err: any) {
  if (err.name === "TokenExpiredError") {
    return next(
      new AppError("JWT expired", 401)
    );
  }

  if (err.name === "JsonWebTokenError") {
    return next(
      new AppError("Invalid token", 401)
    );
  }

  return next(
    new AppError("Unauthorized", 401)
  );
}

if (!verifiedToken) {
  throw new AppError("Invalid token", 401);
}

if (authRoles && !authRoles.includes(verifiedToken.role)) {
  throw new AppError(
    "You are not authorized to access this resource",
    403
  );
}

      req.user = verifiedToken;
      next();
    } catch (error) {
      console.log("JWT error:", error);
      next(error);
    }
  };
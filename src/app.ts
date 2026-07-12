import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import { globalErrorHandler } from "./app/errors/globalErrorHandler";
import { AppError } from "./app/errors/AppError";
import { router } from "./app/routes/index";
import { globalRateLimiter } from "./app/middleware/rateLimiter";
import { corsOrigin } from "./app/utils/corsOrigin";

const app: Application = express();

app.use(helmet());
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

app.use(globalRateLimiter);

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    version: "1.0.0",
  });
});

app.use("/api/v1", router);

app.use((req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

export default app;

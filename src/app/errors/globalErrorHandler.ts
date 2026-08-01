import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { handlePrismaError } from "./prismaErrorHandler";
import { handleZodError, TErrorSource } from "./handleZodError";
import { handleSyntaxError } from "./handleSyntaxError";
import { deleteImageFromCLoudinary } from "../config/cloudinary.config";

export const globalErrorHandler = async (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let errorSources: TErrorSource[] | undefined = undefined;

  // 1. Image cleanup on error
  if (req.file) {
    console.log(`Image delete from Cloudinary public id ${req.file.path}`);
    await deleteImageFromCLoudinary(req.file.path);
  }

  if (req.files && Array.isArray(req.files) && req.files.length) {
    const imageUrls = (req.files as Express.Multer.File[]).map(
      (file) => file.path,
    );
    await Promise.all(imageUrls.map((url) => deleteImageFromCLoudinary(url)));
  }

  // 2. Prisma Errors
  if (err instanceof PrismaClientKnownRequestError) {
    const prismaErr = handlePrismaError(err);
    statusCode = prismaErr.statusCode;
    message = prismaErr.message;
  }
  // 3. Zod Validation Errors
  else if (err instanceof ZodError) {
    const zodErr = handleZodError(err);
    statusCode = zodErr.statusCode;
    message = zodErr.message;
    errorSources = zodErr.errorSources;
  }
  // 4. Bad JSON Syntax Error
  else if (err instanceof SyntaxError && "body" in err) {
    const syntaxErr = handleSyntaxError();
    statusCode = syntaxErr.statusCode;
    message = syntaxErr.message;
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(errorSources && { errorSources }),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

import { ZodError } from "zod";
import { AppError } from "./AppError";

export const handleZodError = (err: ZodError): AppError => {
  const message = err.issues
    .map((e) => `${e.path.join(".")}: ${e.message}`)
    .join(", ");
  return new AppError(message, 400);
};
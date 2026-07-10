import { AppError } from "./AppError";

export const handleSyntaxError = (): AppError =>
  new AppError("Invalid JSON in request body. Please check your request format.", 400);

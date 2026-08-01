import { ZodError } from "zod";

export type TErrorSource = {
  path: string;
  message: string;
};

export type TGenericErrorResponse = {
  statusCode: number;
  message: string;
  errorSources: TErrorSource[];
};

export const handleZodError = (err: ZodError): TGenericErrorResponse => {
  const errorSources: TErrorSource[] = err.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "body";
    return {
      path,
      message: issue.message,
    };
  });

  const formattedDetails = errorSources
    .map((e) => `[${e.path}]: ${e.message}`)
    .join(" | ");

  return {
    statusCode: 400,
    message: `Validation Error - ${formattedDetails}`,
    errorSources,
  };
};
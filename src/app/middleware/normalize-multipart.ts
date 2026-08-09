import type { Request, Response, NextFunction } from "express"

export const normalizeMultipart = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!req.is("multipart/form-data")) {
    return next()
  }

  const fields = req.body

  for (const key of Object.keys(fields)) {
    const value = fields[key]

    if (typeof value !== "string") continue

    // JSON values: objects, arrays, booleans, numbers, null
    try {
      const parsed = JSON.parse(value)

      if (
        typeof parsed === "number" ||
        typeof parsed === "boolean" ||
        parsed === null ||
        typeof parsed === "object"
      ) {
        fields[key] = parsed
      }
    } catch {
      // Keep normal strings as strings
    }
  }

  next()
}
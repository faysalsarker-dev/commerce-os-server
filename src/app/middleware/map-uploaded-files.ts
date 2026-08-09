import type { Request, Response, NextFunction } from "express"

type FileMapping = {
  field: string
  target?: string
  multiple?: boolean
}

export const mapUploadedFiles = (...mappings: FileMapping[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    for (const mapping of mappings) {
      const target = mapping.target ?? mapping.field

      const files = req.files as
        | Express.Multer.File[]
        | Record<string, Express.Multer.File[]>
        | undefined

      let uploadedPaths: string[] = []

      if (files) {
        if (Array.isArray(files)) {
          const matchedFiles = files.filter(
            file => file.fieldname === mapping.field
          )
          uploadedPaths = matchedFiles.map(file => file.path)
        } else if (files[mapping.field]?.length) {
          uploadedPaths = files[mapping.field].map(file => file.path)
        }
      }

      if (mapping.multiple) {
        const existingKey = `existing${target.charAt(0).toUpperCase()}${target.slice(1)}`
        const rawExisting = req.body[existingKey] ?? (target !== existingKey ? req.body[target] : undefined)

        let existingUrls: string[] = []
        if (Array.isArray(rawExisting)) {
          existingUrls = rawExisting
        } else if (typeof rawExisting === "string" && rawExisting.trim()) {
          try {
            const parsed = JSON.parse(rawExisting)
            existingUrls = Array.isArray(parsed) ? parsed : [rawExisting]
          } catch {
            existingUrls = [rawExisting]
          }
        }

        if (req.body[existingKey] !== undefined || uploadedPaths.length > 0) {
          req.body[target] = [...existingUrls, ...uploadedPaths]
        }
      } else {
        if (uploadedPaths.length > 0) {
          req.body[target] = uploadedPaths[0]
        }
      }
    }

    next()
  }
}
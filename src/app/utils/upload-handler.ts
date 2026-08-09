import { multerUpload } from "../config/multer.config"
import { mapUploadedFiles } from "../middleware/map-uploaded-files"
import { normalizeMultipart } from "../middleware/normalize-multipart"


type UploadField = {
  field: string
  target?: string
  multiple?: boolean
  maxCount?: number
}

type UploadOptions = {
  fields?: UploadField[]
  multiple?: boolean
  maxCount?: number
  target?: string
}

export const uploadHandler = (
  type: "image" | "file" | string = "image",
  options?: UploadOptions
) => {
  const fields = options?.fields ?? [
    {
      field: type,
      target: options?.target ?? type,
      multiple: options?.multiple ?? false,
      maxCount: options?.maxCount ?? (options?.multiple ? 10 : 1),
    },
  ]

  const multerFields = fields.map(({ field, maxCount, multiple }) => ({
    name: field,
    maxCount: maxCount ?? (multiple ? 10 : fields.length === 1 ? 1 : 10),
  }))

  return [
    multerUpload.fields(multerFields),
    normalizeMultipart,
    mapUploadedFiles(...fields),
  ]
}
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });


type FieldType = "string" | "number" | "boolean";

interface EnvField<T extends FieldType> {
  key: string;
  type: T;
  default?: T extends "string" ? string : T extends "number" ? number : boolean;
  required?: boolean;
}

type Resolved<T extends FieldType> =
  T extends "string"  ? string  :
  T extends "number"  ? number  :
  boolean;

type ResolveSchema<S extends Record<string, Record<string, EnvField<FieldType>>>> = {
  [G in keyof S]: {
    [F in keyof S[G]]: Resolved<S[G][F]["type"]>
  }
};


const str     = (key: string, defaultVal?: string):  EnvField<"string">  => ({ key, type: "string",  default: defaultVal, required: defaultVal === undefined });
const num     = (key: string, defaultVal?: number):  EnvField<"number">  => ({ key, type: "number",  default: defaultVal, required: defaultVal === undefined });
const bool    = (key: string, defaultVal?: boolean): EnvField<"boolean"> => ({ key, type: "boolean", default: defaultVal, required: defaultVal === undefined });

const resolve = <T extends FieldType>(field: EnvField<T>): Resolved<T> => {
  const raw = process.env[field.key];

  // missing
  if (raw === undefined || raw === "") {
    if (field.required) throw new Error(`[Config] Missing required env variable: "${field.key}"`);
    return field.default as Resolved<T>;
  }

  // parse by type
  if (field.type === "number") {
    const parsed = Number(raw);
    if (isNaN(parsed)) throw new Error(`[Config] Invalid number for env variable: "${field.key}" (got "${raw}")`);
    return parsed as Resolved<T>;
  }

  if (field.type === "boolean") {
    if (!["true", "false", "1", "0"].includes(raw.toLowerCase())) {
      throw new Error(`[Config] Invalid boolean for env variable: "${field.key}" (got "${raw}")`);
    }
    return (raw.toLowerCase() === "true" || raw === "1") as Resolved<T>;
  }

  return raw as Resolved<T>;
};

const buildConfig = <S extends Record<string, Record<string, EnvField<FieldType>>>>(schema: S): ResolveSchema<S> => {
  const config = {} as any;
  for (const group in schema) {
    config[group] = {};
    for (const field in schema[group]) {
      config[group][field] = resolve(schema[group][field]);
    }
  }
  return config;
};


const resolvedConfig = buildConfig({
  app: {
    port:           num ("PORT",           3000),
    env:            str ("NODE_ENV",       "development"),
    enableSwagger:  bool("ENABLE_SWAGGER", false),
  },
  frontend: {
    url: str("FRONTEND_URL", "http://localhost:3000"),
  },
  db: {
    url:            str("DATABASE_URL"),
    redisUrl:       str("REDIS_URL"),
  },
  jwt: {
    secret:           str("JWT_SECRET"),
    expiresIn:        str("JWT_EXPIRES_IN",         "7d"),
    refreshSecret:    str("JWT_REFRESH_SECRET"),
    refreshExpiresIn: str("JWT_REFRESH_EXPIRES_IN", "30d"),
  },
  bcrypt: {
    saltRounds: num("BCRYPT_SALT_ROUNDS", 10),
  },
  email: {
    host: str("SMTP_HOST"),
    port: num("SMTP_PORT", 587),
    user: str("SMTP_USER"),
    pass: str("SMTP_PASS"),
    from: str("SMTP_FROM", "noreply@app.com"),
  },
  cloudinary: {
    cloudName: str("CLOUDINARY_CLOUD_NAME"),
    apiKey:    str("CLOUDINARY_API_KEY"),
    apiSecret: str("CLOUDINARY_API_SECRET"),
  },
  messaging: {
    tokenEncryptionKey: str("MESSAGING_TOKEN_ENCRYPTION_KEY", ""),
    retentionDays: num("MESSAGING_RETENTION_DAYS", 7),
    metaAppId: str("META_APP_ID", ""),
    metaAppSecret: str("META_APP_SECRET", ""),
    metaWebhookVerifyToken: str("META_WEBHOOK_VERIFY_TOKEN", ""),
    tiktokClientKey: str("TIKTOK_CLIENT_KEY", ""),
    tiktokClientSecret: str("TIKTOK_CLIENT_SECRET", ""),
  },
  facebook: {
    appId: str("FACEBOOK_APP_ID"),
    appSecret: str("FACEBOOK_APP_SECRET"),
  },
  courier: {
    encryptionKey: str("COURIER_ENC_KEY"),
    publicApiUrl: str("PUBLIC_API_URL", "http://localhost:3000/api/v1"),
    pathaoBaseUrl: str("PATHAO_BASE_URL", "https://api-hermes.pathao.com"),
    pathaoSandboxBaseUrl: str(
      "PATHAO_SANDBOX_BASE_URL",
      "https://hermes-sandbox.pathao.com",
    ),
    steadfastBaseUrl: str(
      "STEADFAST_BASE_URL",
      "https://portal.packzy.com/api/v1",
    ),
  },
});

if (
  !Number.isInteger(resolvedConfig.messaging.retentionDays) ||
  resolvedConfig.messaging.retentionDays < 1
) {
  throw new Error("[Config] MESSAGING_RETENTION_DAYS must be a positive integer");
}

if (!/^[0-9a-fA-F]{64}$/.test(resolvedConfig.courier.encryptionKey)) {
  throw new Error(
    "[Config] COURIER_ENC_KEY must be exactly 64 hexadecimal characters (32 bytes)",
  );
}

export const config = resolvedConfig;
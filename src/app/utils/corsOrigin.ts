const defaultOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://192.168.0.127:3000",
];

const envOrigin = process.env.FRONTEND_URL?.trim();

export const corsOrigin = envOrigin
  ? Array.from(new Set([envOrigin, ...defaultOrigins]))
  : defaultOrigins;

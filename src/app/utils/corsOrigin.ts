const defaultOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://commerce-os-dashboard.vercel.app",
  "https://max2030.faysalsarker.me",
];

const envOrigin = process.env.FRONTEND_URL?.trim();

export const corsOrigin = envOrigin
  ? Array.from(new Set([envOrigin, ...defaultOrigins]))
  : defaultOrigins;

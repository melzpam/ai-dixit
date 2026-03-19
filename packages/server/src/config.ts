import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT ?? "3000", 10),
  cors: {
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3001",
  },
  session: {
    secret: process.env.SESSION_SECRET ?? "dev-secret-change-in-production",
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? "",
    dailyCapImages: parseInt(process.env.DAILY_IMAGE_CAP ?? "2500", 10),
  },
  admin: {
    password: process.env.ADMIN_PASSWORD ?? "admin",
  },
};

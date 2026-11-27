import { z } from "zod";

try {
  process.loadEnvFile();
} catch {
  // no .env file: rely on the real environment (e.g. in production)
}

export const env = z
  .object({
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().default("redis://localhost:6379"),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    FRONTEND_ORIGIN: z.string().default("http://localhost:3000"),
    PORT: z.coerce.number().default(4000),
    NODE_ENV: z.string().default("development"),
    // Mock SSO lets anyone log in as any persona. Disable it once a real IdP is connected.
    ENABLE_MOCK_SSO: z.enum(["true", "false"]).default("true"),
  })
  .parse(process.env);

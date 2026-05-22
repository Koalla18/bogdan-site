import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DOMAIN: z.string().default("example.com"),
  LETSENCRYPT_EMAIL: z.string().default("admin@example.com"),
  NEXT_PUBLIC_SITE_NAME: z.string().default("BRANYA"),
  DATABASE_URL: z
    .string()
    .default(
      "postgresql://branya_user:change_this_database_password@localhost:55432/branya?schema=public",
    ),
  POSTGRES_DB: z.string().default("branya"),
  POSTGRES_USER: z.string().default("branya_user"),
  POSTGRES_PASSWORD: z.string().default("change_this_database_password"),
  POSTGRES_HOST: z.string().default("postgres"),
  POSTGRES_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
  ADMIN_USERNAME: z.string().min(3).default("admin"),
  ADMIN_PASSWORD: z.string().min(8).default("Branya2026!Admin"),
  ADMIN_PASSWORD_HASH: z.string().optional(),
  SESSION_SECRET: z
    .string()
    .min(32)
    .default("change-me-session-secret-at-least-32-chars"),
  RATE_LIMIT_GLOBAL_PER_MINUTE: z.coerce.number().int().min(1).default(120),
  RATE_LIMIT_ADMIN_PER_MINUTE: z.coerce.number().int().min(1).default(60),
  RATE_LIMIT_LOGIN_WINDOW_MINUTES: z.coerce.number().int().min(1).default(15),
  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().min(1).default(5),
  SITE_PUBLIC_URL: z.string().default("https://example.com"),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  DOMAIN: process.env.DOMAIN,
  LETSENCRYPT_EMAIL: process.env.LETSENCRYPT_EMAIL,
  NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
  DATABASE_URL: process.env.DATABASE_URL,
  POSTGRES_DB: process.env.POSTGRES_DB,
  POSTGRES_USER: process.env.POSTGRES_USER,
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
  POSTGRES_HOST: process.env.POSTGRES_HOST,
  POSTGRES_PORT: process.env.POSTGRES_PORT,
  ADMIN_USERNAME: process.env.ADMIN_USERNAME,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
  SESSION_SECRET: process.env.SESSION_SECRET,
  RATE_LIMIT_GLOBAL_PER_MINUTE: process.env.RATE_LIMIT_GLOBAL_PER_MINUTE,
  RATE_LIMIT_ADMIN_PER_MINUTE: process.env.RATE_LIMIT_ADMIN_PER_MINUTE,
  RATE_LIMIT_LOGIN_WINDOW_MINUTES: process.env.RATE_LIMIT_LOGIN_WINDOW_MINUTES,
  RATE_LIMIT_LOGIN_MAX: process.env.RATE_LIMIT_LOGIN_MAX,
  SITE_PUBLIC_URL: process.env.SITE_PUBLIC_URL,
});

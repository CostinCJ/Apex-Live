import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:8081'),
  OPENAI_API_KEY: z.string().default(''),
  // Email (optional in dev — emails log to stderr)
  EMAIL_FROM: z.string().default(''),
  EMAIL_PROVIDER: z.enum(['sendgrid', 'resend', 'ses', '']).default(''),
  EMAIL_API_KEY: z.string().default(''),
  // App URL for email links
  APP_URL: z.string().default('https://apexlive.app'),
  // RevenueCat
  REVENUECAT_API_KEY: z.string().default(''),
  REVENUECAT_WEBHOOK_SECRET: z.string().default(''),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const env = loadEnv();

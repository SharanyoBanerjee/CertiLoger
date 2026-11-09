import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  BASE_URL: z.string().url().default('http://localhost:5173'),
  KEYS_DIR: z.string().default('./keys'),
  STORAGE_DIR: z.string().default('./storage'),
  LEDGER_DRIVER: z.enum(['local', 'fabric']).default('local'),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function loadEnv(): Env {
  if (cachedEnv) return cachedEnv;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  cachedEnv = parsed.data;
  return cachedEnv;
}

export const env = loadEnv();

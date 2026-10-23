import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(5001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  REDIS_URI: z.string().default('redis://localhost:6379'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters long').default('your_ultra_secure_jwt_access_secret_key_minimum_32_characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters long').default('your_ultra_secure_jwt_refresh_secret_key_minimum_32_characters'),
  JWT_ACCESS_EXPIRY: z.string().default('7d'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  COOKIE_SECRET: z.string().min(16, 'COOKIE_SECRET must be at least 16 characters long').default('your_cookie_encryption_secret_key_32_chars'),
  MFS_WEBHOOK_SECRET: z.string().min(16, 'MFS_WEBHOOK_SECRET must be at least 16 characters long').default('your_shared_hmac_webhook_secret_key'),
  CSFLE_MASTER_KEY: z.string().min(32, 'CSFLE_MASTER_KEY must be at least 32 characters long').default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
  S3_BUCKET_NAME: z.string().default('buysell-media-prod'),
  S3_REGION: z.string().default('ap-southeast-1'),
  S3_ACCESS_KEY_ID: z.string().default('test_key'),
  S3_SECRET_ACCESS_KEY: z.string().default('test_secret'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
});

const parseEnv = () => {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      .map((issue) => ` - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error(`❌ Invalid Environment Variables:\n${errorDetails}`);
    process.exit(1);
  }
  return parsed.data;
};

export const env = parseEnv();
export default env;

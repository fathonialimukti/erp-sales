import * as z from 'zod';

/**
 * Fail-fast environment validation. Runs BEFORE app.listen so a
 * misconfigured deployment crashes at boot with a clear message
 * instead of silently defaulting.
 */
const envSchema = z.object({
    // Required
    DATABASE_URL: z.string().url({ message: 'DATABASE_URL must be a valid PostgreSQL connection string' }),
    JWT_SECRET: z
        .string()
        .min(16, { message: 'JWT_SECRET must be at least 16 characters (generate with: openssl rand -base64 48)' }),

    // Optional with defaults
    CORS_ORIGIN: z.string().optional(),
    PORT: z.coerce.number().int().positive().default(10022),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DB_POOL_MAX: z.coerce.number().int().positive().default(10),
    DB_POOL_IDLE_MS: z.coerce.number().int().nonnegative().default(10000),
    DB_POOL_CONNECT_TIMEOUT_MS: z.coerce.number().int().positive().default(2000),
    AI_USER_RPM: z.coerce.number().int().positive().default(10),
    AI_GLOBAL_RPM: z.coerce.number().int().positive().default(10),
    AI_QUEUE_MAX_WAIT_MS: z.coerce.number().int().positive().default(25000),
});

export type ValidatedEnv = z.infer<typeof envSchema>;

let cached: ValidatedEnv | null = null;

export function validateEnv(): ValidatedEnv {
    if (cached) return cached;

    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
        const issues = parsed.error.issues
            .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
            .join('\n');
        throw new Error(`Invalid environment configuration:\n${issues}`);
    }

    const env = parsed.data;

    if (env.NODE_ENV === 'production' && /^(your-secret|change-this|test)/i.test(env.JWT_SECRET)) {
        throw new Error('JWT_SECRET looks like a placeholder — set a real secret in production.');
    }

    cached = env;
    return env;
}

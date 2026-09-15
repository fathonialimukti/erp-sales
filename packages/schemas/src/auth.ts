import * as z from 'zod';

// Auth schemas
export const loginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Demo login (passwordless Option A) — gated by DEMO_LOGIN_ENABLED env flag.
// NOTE: schema does NOT read env; T2 router enforces the gate.

// ponytail: capabilities kept as plain permission-name strings to match the
// login output's roles[].permissions shape; the object schema below is for
// future label enrichment only.
export const demoUserCapabilitySchema = z.object({
    permission: z.string().min(1),
    label: z.string().optional(),
});

export const demoUserSchema = z.object({
    id: z.string().ulid(),
    email: z.email(),
    name: z.string(),
    role: z.string(),
    description: z.string().nullable().optional(),
    capabilities: z.array(z.string()),
});

export const listDemoUsersOutputSchema = z.array(demoUserSchema);

export const demoLoginInputSchema = z.object({
    userId: z.string().ulid(),
});

// Mirrors the existing login output shape (user + tokenExpiresAt) so the
// client session handling stays identical between password and demo login.
export const demoLoginOutputSchema = z.object({
    user: z.object({
        id: z.string(),
        email: z.email(),
        name: z.string(),
        roles: z.array(
            z.object({
                id: z.string(),
                name: z.string(),
                permissions: z.array(z.string()),
            })
        ),
    }),
    tokenExpiresAt: z.number().nullable(),
});

export type DemoUserCapability = z.infer<typeof demoUserCapabilitySchema>;
export type DemoUser = z.infer<typeof demoUserSchema>;
export type ListDemoUsersOutput = z.infer<typeof listDemoUsersOutputSchema>;
export type DemoLoginInput = z.infer<typeof demoLoginInputSchema>;
export type DemoLoginOutput = z.infer<typeof demoLoginOutputSchema>;
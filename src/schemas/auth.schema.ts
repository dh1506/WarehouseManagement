import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters')
                        .regex(/(?=.*[0-9])/, 'Password must contain at least one number')
                        .regex(/(?=.*[!@#$%^&*(),.?":{}|<>])/, 'Password must contain at least one special character'),
    full_name: z.string().min(1, 'Full name is required'),
    email: z.string().email('Invalid email format').trim().toLowerCase().optional(),
    phone: z.string().regex(/^[0-9+]+$/, 'Invalid phone number format').optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];

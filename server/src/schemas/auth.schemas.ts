import { z } from 'zod';

export const RegisterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2,  'Name must be at least 2 characters')
    .max(60, 'Name must be under 60 characters'),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email address'),

  password: z
    .string()
    .min(8,  'Password must be at least 8 characters')
    .max(72, 'Password must be under 72 characters'),  // bcrypt hard limit

  role: z.enum(['coach', 'player']),
});

export const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Invalid email address'),

  password: z
    .string()
    .min(1, 'Password is required'),
});

// Inferred types — import these in the controller for typed req.body
export type RegisterBody = z.infer<typeof RegisterSchema>;
export type LoginBody    = z.infer<typeof LoginSchema>;

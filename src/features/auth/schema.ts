import { z } from 'zod';

export const authSchema = z.object({
   email: z.email({ message: 'Email is invalid' }),
   password: z.string().min(6, 'Password must be at least 6 characters'),
   username: z.string().optional(),
});

export type AuthInput = z.infer<typeof authSchema>;
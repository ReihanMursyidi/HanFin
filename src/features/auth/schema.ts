import { z } from "zod";

export const authSchema = z.object({
  email: z
    .string({ error: "Email is required" })
    .trim()
    .toLowerCase()
    .email("Email is invalid"),
  password: z
    .string({ error: "Password is required" })
    .min(6, "Password must be at least 6 characters"),
  username: z.string().trim().optional(),
});

export type AuthInput = z.infer<typeof authSchema>;

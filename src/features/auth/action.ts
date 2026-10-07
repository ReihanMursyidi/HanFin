"use server";

import { createClient } from "@/lib/supabase/server";
import { authSchema, type AuthInput } from "./schema";

export async function loginUser(data: AuthInput) {
  const validated = authSchema.parse(data);
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: validated.email,
    password: validated.password,
  });

  if (error) {
    console.error("[Auth Login Error]:", error.message);

    if (error.message.includes("Invalid login credentials")) {
      throw new Error("Email or password is incorrect.");
    }
    throw new Error(error.message);
  }

  return { success: true, message: "Login success!" };
}

export async function registerUser(data: AuthInput) {
  const validated = authSchema.parse(data);

  if (!validated.username || validated.username.trim().length < 3) {
    throw new Error("Username must be at least 3 characters long.");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: validated.email,
    password: validated.password,
    options: {
      data: {
        username: validated.username.trim(),
      },
    },
  });

  if (error) {
    console.error("[Auth Register Error]:", error.message);

    if (error.message.includes("User already registered")) {
      throw new Error("Email is already registered. Please login.");
    }
    throw new Error(error.message);
  }

  await supabase.auth.signOut();
  return "Registration succeed! Please login.";
}

export async function logoutUser() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("[Auth Logout Error]:", error.message);
    throw new Error(error.message);
  }

  return { success: true, message: "Logout success!" };
}

export async function getCurrentUser(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const usernameFromMetadata = user.user_metadata?.username as
    string | undefined;
  const emailPrefix = user.email ? user.email.split("@")[0] : null;

  return usernameFromMetadata || emailPrefix || "User";
}

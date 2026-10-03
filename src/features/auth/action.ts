'use server';

import { createClient } from "@/lib/supabase/server";
import type { AuthInput } from './schema';

export async function loginUser(data: AuthInput) {
   const supabase = await createClient();

   const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
   });

   if (error) {
      throw new Error(error.message === 'Invalid login credentials'
         ? 'Email or password is incorrect'
         : error.message
      );
   }

   return 'Login success!';
}

export async function registerUser(data: AuthInput) {
   if (!data.username || data.username.length < 3) {
      throw new Error('Username must be at least 3 characters long.');
   }

   const supabase = await createClient();

   const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
         data: {
            username: data.username,
         }
      }
   });

   if (error) {
      throw new Error(error.message === 'User already registered'
         ? 'Email is already registered, please login.'
         : error.message
      );
   }

   return 'Registration succeed! Please login.';
}

export async function logoutUser() {
   const supabase = await createClient();
   const { error } = await supabase.auth.signOut();
   if (error) throw new Error(error.message);

   return 'Logout success!';
}

export async function getCurrentUser() {
   const supabase = await createClient();
   const { data: { user } } = await supabase.auth.getUser();

   if (!user) return null;

   return user.user_metadata?.username || user.email;
}
import { createBrowserClient } from "@supabase/ssr";
import { ENVIRONMENT } from "@/config/environment";

export const createClient = () => {
   const supabaseUrl = ENVIRONMENT.supabaseUrl;
   const supabaseKey = ENVIRONMENT.supabaseKey;
   if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase URL and publishable key must be configured");
   }

   return createBrowserClient(supabaseUrl, supabaseKey);
};
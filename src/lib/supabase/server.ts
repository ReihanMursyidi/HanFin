import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ENVIRONMENT } from '@/config/environment';

export const createClient = async () => {
  const cookieStore = await cookies();
  const supabaseUrl = ENVIRONMENT.supabaseUrl;
  const supabaseKey = ENVIRONMENT.supabaseKey;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL and publishable key must be configured');
  }

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {}
        },
      },
    },
  );
};
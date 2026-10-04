import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { ENVIRONMENT } from '@/config/environment';

export const supabaseProxy = async (request: NextRequest) => {
   const supabaseUrl = ENVIRONMENT.supabaseUrl;
   const supabaseKey = ENVIRONMENT.supabaseKey;
   if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase URL and publishable key must be configured');
   }

   let supabaseResponse = NextResponse.next({
      request: {
         headers: request.headers,
      },
   });

   const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
         cookies: {
            getAll() {
               return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
               cookiesToSet.forEach(({ name, value }) => {
                  request.cookies.set(name, value);
               });
               supabaseResponse = NextResponse.next({
                  request,
               });
               cookiesToSet.forEach(({ name, value, options }) => {
                  supabaseResponse.cookies.set(name, value, options);
               });
            }
         }
      }
   );

   const {
      data: { user },
   } = await supabase.auth.getUser();

   const isProtectedRoute = request.nextUrl.pathname.startsWith('/home');
   const isAuthRoute = request.nextUrl.pathname === '/';

   if (!user && isProtectedRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
   }

   if (user && isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/home/dashboard';
      return NextResponse.redirect(url);
   }

   return supabaseResponse;
};
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ENVIRONMENT } from "@/config/environment";

export const supabaseProxy = async (request: NextRequest) => {
  const supabaseUrl = ENVIRONMENT.supabaseUrl;
  const supabaseKey = ENVIRONMENT.supabaseKey;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL and publishable key must be configured");
  }

  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
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
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = pathname.startsWith("/home");
  const isAuthRoute = pathname === "/login";
  const isLandingPage = pathname === "/";

  if (!user && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && (isAuthRoute || isLandingPage)) {
    return NextResponse.redirect(new URL("/home/dashboard", request.url));
  }

  return supabaseResponse;
};

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

const protectedPathPrefixes = ["/dashboard", "/app", "/settings"];
const authPaths = ["/login", "/signup"];
const DUMMY_AUTH_COOKIE = "ct_dummy_auth";

function isProtectedPath(pathname: string): boolean {
  return protectedPathPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function isAuthPath(pathname: string): boolean {
  return authPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function middleware(request: NextRequest) {
  try {
    let response = NextResponse.next({
      request: { headers: request.headers },
    });

    // MVP: no onboarding. Always land in the workspace.
    if (isAuthPath(request.nextUrl.pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.searchParams.delete("redirectTo");
      return NextResponse.redirect(url);
    }

    const hasDummyAuth = request.cookies.get(DUMMY_AUTH_COOKIE)?.value === "1";

    if (hasDummyAuth) {
      return response;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      if (isProtectedPath(request.nextUrl.pathname)) {
        return new NextResponse(
          "Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the dev server.",
          { status: 500 }
        );
      }
      return response;
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              response.cookies.set(name, value)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // MVP: allow access to workspace UI without requiring auth.
    // Supabase sessions (if any) will still be refreshed by middleware.
    void isProtectedPath; // keep helper for future auth enforcement

    return response;
  } catch (err) {
    console.error("[middleware]", err);
    return new NextResponse(
      "Middleware error. Check server logs.",
      { status: 500 }
    );
  }
}

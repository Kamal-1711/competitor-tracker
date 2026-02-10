import { NextRequest, NextResponse } from "next/server";

const DUMMY_AUTH_COOKIE = "ct_dummy_auth";

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const loginUrl = new URL("/login", url.origin);
  const response = NextResponse.redirect(loginUrl);

  response.cookies.set(DUMMY_AUTH_COOKIE, "", {
    path: "/",
    maxAge: 0,
  });

  return response;
}

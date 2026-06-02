import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSession();

  // Protect /dashboard routes
  if (pathname.startsWith("/dashboard")) {
    if (!session) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Prevent logged-in users from seeing the login page (root "/") again
  if (pathname === "/") {
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/"],
};

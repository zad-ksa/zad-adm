import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSession();

  // Protect /dashboard routes
  if (pathname.startsWith("/main")) {
    if (!session) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Prevent logged-in users from seeing the login page (root "/") again
  if (pathname === "/") {
    if (session) {
      return NextResponse.redirect(new URL("/main", request.url));
    }
  }

  // Protection for portal routes
  if (pathname.startsWith("/portal/")) {
    // Only CHARITY_CLIENT can access /portal
    if (session && session.role !== "CHARITY_CLIENT") {
      return NextResponse.redirect(new URL("/main", request.url));
    }
    // If not logged in, they will be caught by root layout or auth actions,
    // but we can also explicitly redirect them here if we want.
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/main/:path*", "/", "/portal/:path*"],
};

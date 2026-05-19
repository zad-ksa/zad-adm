import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const adminToken = request.cookies.get("admin_token");

  // Protect /dashboard routes
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    if (!adminToken || adminToken.value !== "authenticated") {
      // Redirect to login page if not authenticated
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Optional: Prevent logged-in admins from seeing the login page again
  if (request.nextUrl.pathname === "/") {
    if (adminToken && adminToken.value === "authenticated") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}
//oo
export const config = {
  matcher: ["/", "/dashboard/:path*"],
};

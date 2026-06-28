import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";

export default async function middleware(request: NextRequest) {
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

  // Protection for Charity Client restricted sections
  if (pathname.startsWith("/charity/")) {
    if (session?.role === "CHARITY_CLIENT") {
      const parts = pathname.split("/");
      // Path format: /charity/[name]/[section]/...
      if (parts.length > 3) {
        const section = parts[3];
        const restrictedSections = ["strategy", "governance", "programs", "finance", "hr", "tasks"];
        if (restrictedSections.includes(section)) {
          // Redirect them back to the charity's main page
          return NextResponse.redirect(new URL(`/charity/${parts[2]}`, request.url));
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/", "/charity/:path*"],
};

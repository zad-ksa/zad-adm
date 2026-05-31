import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  if (pathname.startsWith("/dashboard")) {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }
  
  if (pathname === "/login") {
    const session = await getSession();
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};

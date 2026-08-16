import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession, decrypt, encrypt, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";

// Sliding session renewal: re-signs the session cookie with a fresh 24h
// expiration on every authenticated request to a protected route, so active
// users are never logged out mid-use while an abandoned/stolen cookie still
// expires within a day of last activity.
//
// Re-encrypts the RAW decrypted payload (not the DB-enriched getSession()
// result) so that dev-impersonation fields (originalId/originalRole, set only
// in-memory per request by getSession()) never get persisted back into the
// cookie as if they were the real logged-in identity.
async function refreshSessionCookie(request: NextRequest, response: NextResponse) {
  const raw = request.cookies.get("session")?.value;
  if (!raw) return;

  try {
    const payload = await decrypt(raw);
    const { exp, iat, nbf, ...basePayload } = payload as Record<string, unknown>;
    const refreshed = await encrypt(basePayload);
    response.cookies.set("session", refreshed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
  } catch {
    // Expired/invalid token — nothing to refresh; existing route guards below
    // (which use the DB-validated getSession()) handle redirecting as needed.
  }
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSession();

  // Protect /dashboard routes
  if (pathname.startsWith("/main")) {
    if (!session) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Root path "/" is now the public landing page. We don't redirect logged-in users away from it.

  // Protection for portal routes
  if (pathname.startsWith("/portal/")) {
    // Only CHARITY_USER can access /portal
    if (session && session.userType !== "CHARITY_USER") {
      return NextResponse.redirect(new URL("/main", request.url));
    }
    // If not logged in, they will be caught by root layout or auth actions,
    // but we can also explicitly redirect them here if we want.
  }

  const response = NextResponse.next();
  if (session) {
    await refreshSessionCookie(request, response);
  }
  return response;
}

export const config = {
  matcher: ["/main/:path*", "/", "/portal/:path*"],
};

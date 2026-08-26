import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt, encrypt, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";

// Renew a session cookie only once it is older than this. The token still lives
// 24h and the sliding window still measures from last activity — this only
// coarsens the granularity of the slide to an hour, which is far finer than the
// window it protects.
//
// Re-signing on *every* request meant a JWT signature per navigation, per server
// action and per poll, and a Set-Cookie on every response. Cookie writes are one
// of the documented ways the client router cache gets invalidated, so the churn
// also risked defeating the `staleTimes` caching enabled in next.config.ts.
const RENEW_AFTER_SECONDS = 60 * 60;

type SessionPayload = Record<string, unknown>;

function shouldRenew(payload: SessionPayload) {
  const iat = typeof payload.iat === "number" ? payload.iat : 0;
  return Date.now() / 1000 - iat > RENEW_AFTER_SECONDS;
}

// Sliding session renewal: re-signs the session cookie with a fresh 24h
// expiration, so active users are never logged out mid-use while an
// abandoned/stolen cookie still expires within a day of last activity.
//
// Re-encrypts the RAW decrypted payload (not the DB-enriched getSession()
// result) so that dev-impersonation fields (originalId/originalRole, set only
// in-memory per request by getSession()) never get persisted back into the
// cookie as if they were the real logged-in identity.
async function refreshSessionCookie(payload: SessionPayload, response: NextResponse) {
  // exp/iat/nbf are dropped so encrypt() stamps fresh ones.
  const { exp, iat, nbf, ...basePayload } = payload;

  const refreshed = await encrypt(basePayload);
  response.cookies.set("session", refreshed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * Optimistic auth check only — deliberately does not touch the database.
 *
 * This used to call `getSession()`, which reads the Employee row to confirm the
 * account is still active and to refresh its permissions. That is a full
 * database round trip, serialized ahead of every single matched request:
 * every navigation's RSC fetch, every server action, every background poll. And
 * because React's `cache()` only dedupes within one render pass — which proxy
 * is not part of — the layout then repeated the very same query.
 *
 * Next's own guidance is that proxy "is not intended for slow data fetching…
 * it should not be used as a full session management or authorization
 * solution", and points to optimistic checks here with the real check in the
 * data layer.
 *
 * Nothing is lost by trusting the signed cookie for the redirect decision: the
 * authoritative, DB-validated check still runs in both layouts that matter —
 * app/(dashboard)/layout.tsx and app/portal/[name]/layout.tsx — and each
 * redirects when `getSession()` returns null. A deactivated employee therefore
 * still gets bounced; they are bounced one hop later, by the layout instead of
 * here.
 */
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const raw = request.cookies.get("session")?.value;
  let payload: SessionPayload | null = null;

  if (raw) {
    try {
      payload = await decrypt(raw);
    } catch {
      // Expired or tampered — treated exactly like having no cookie at all.
      payload = null;
    }
  }

  if (pathname.startsWith("/main") && !payload) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Root path "/" is the public landing page. We don't redirect logged-in users away from it.

  if (pathname.startsWith("/portal/") && payload && payload.userType !== "CHARITY_USER") {
    return NextResponse.redirect(new URL("/main", request.url));
  }

  const response = NextResponse.next();
  if (payload && shouldRenew(payload)) {
    await refreshSessionCookie(payload, response);
  }
  return response;
}

export const config = {
  matcher: ["/main/:path*", "/", "/portal/:path*"],
};

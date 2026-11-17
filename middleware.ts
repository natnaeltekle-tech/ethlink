import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyRequestOrigin, isSignedWebhookRoute } from "@/lib/csrf";
import { SECURITY_HEADERS } from "@/lib/security-headers";

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function withSecurityHeaders(response: Response): Response {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isSignedWebhook = isSignedWebhookRoute(pathname);

  // 1. Rate limiting (per IP + route bucket) — only for requests that change
  //    something. Page views, prefetches and data refreshes (GET/HEAD) are never
  //    throttled: many users share one carrier IP, and blocking reads made the
  //    app show a bare "Too many requests" page during normal use.
  //    Signed webhooks are exempt so provider callbacks are never dropped.
  const isRead = ["GET", "HEAD", "OPTIONS"].includes(request.method);
  if (!isSignedWebhook && !isRead) {
    try {
      const result = await checkRateLimit(getClientIp(request), pathname);
      if (!result.allowed) {
        return withSecurityHeaders(
          new Response(JSON.stringify({ error: "Too many requests" }), {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": String(Math.max(1, result.retryAfter)),
            },
          })
        );
      }
    } catch {
      // Fail open: a rate limiter outage must never take the app down.
    }
  }

  // 2. CSRF/origin verification for mutating API calls.
  //    Signed webhooks are exempt (they use HMAC signature verification instead).
  if (
    !isSignedWebhook &&
    pathname.startsWith("/api") &&
    !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
    !verifyRequestOrigin(request)
  ) {
    return withSecurityHeaders(
      new Response(JSON.stringify({ error: "Invalid origin" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    );
  }

  // 3. Existing session refresh + auth route protection (unchanged).
  const response = await updateSession(request);

  // 4. Security headers on every outgoing response (including redirects).
  return withSecurityHeaders(response);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};


export const runtime = 'nodejs';

import { updateSession } from "@/lib/supabase/proxy";
import { NextResponse, type NextRequest } from "next/server";
import { SECURITY_HEADERS } from "@/lib/security-headers";
import { checkRateLimit } from "@/lib/rate-limit";
import { isSignedWebhookRoute, verifyRequestOrigin } from "@/lib/csrf";

function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

function rateLimitResponse(retryAfter: number): NextResponse {
  const response = new NextResponse(
    JSON.stringify({ error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    }
  );
  return applySecurityHeaders(response);
}

export async function middleware(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const pathname = request.nextUrl.pathname;

  // CSRF: verify origin on mutating API routes (except HMAC-signed webhooks)
  if (
    pathname.startsWith('/api') &&
    !isSignedWebhookRoute(pathname) &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) &&
    !verifyRequestOrigin(request)
  ) {
    const response = new NextResponse(
      JSON.stringify({ error: 'Forbidden: invalid origin', code: 'FORBIDDEN' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
    return applySecurityHeaders(response);
  }

  const { allowed, retryAfter } = await checkRateLimit(ip, pathname);

  if (!allowed) {
    return rateLimitResponse(retryAfter);
  }

  try {
    const response = await updateSession(request);
    return applySecurityHeaders(response);
  } catch {
    const response = NextResponse.next();
    return applySecurityHeaders(response);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|workbox-.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

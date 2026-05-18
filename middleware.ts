import { updateSession } from "@/lib/supabase/proxy";
import { NextResponse, type NextRequest } from "next/server";
import { SECURITY_HEADERS } from "@/lib/security-headers";

// ─── In-Memory Sliding Window Rate Limiter ─────────────────────────────────
// Edge Runtime compatible. For production scale, replace with Upstash Redis.
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

const RATE_LIMITS = {
  auth: { max: 5, windowMs: 15 * 60 * 1000 },       // 5 req / 15 min
  api: { max: 20, windowMs: 15 * 60 * 1000 },        // 20 req / 15 min (webhooks)
  default: { max: 100, windowMs: 15 * 60 * 1000 },   // 100 req / 15 min
} as const;

// Cleanup stale entries every 5 minutes to prevent memory leaks
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 5 * 60 * 1000;

function cleanupStaleEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  const maxWindow = 15 * 60 * 1000;
  for (const [key, entry] of rateLimitMap) {
    if (now - entry.windowStart > maxWindow * 2) {
      rateLimitMap.delete(key);
    }
  }
}

function getRateLimit(pathname: string) {
  if (pathname.startsWith('/auth')) return RATE_LIMITS.auth;
  if (pathname.startsWith('/api')) return RATE_LIMITS.api;
  return RATE_LIMITS.default;
}

function checkRateLimit(ip: string, pathname: string): { allowed: boolean; retryAfter: number } {
  cleanupStaleEntries();

  const limit = getRateLimit(pathname);
  const key = `${ip}:${pathname.startsWith('/auth') ? 'auth' : pathname.startsWith('/api') ? 'api' : 'default'}`;
  const now = Date.now();

  const entry = rateLimitMap.get(key);

  if (!entry || now - entry.windowStart > limit.windowMs) {
    // New window
    rateLimitMap.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfter: 0 };
  }

  if (entry.count >= limit.max) {
    const retryAfter = Math.ceil((entry.windowStart + limit.windowMs - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true, retryAfter: 0 };
}

// ─── Apply Security Headers ────────────────────────────────────────────────
function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

// ─── Middleware ─────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  // Extract client IP (Vercel provides x-forwarded-for, fallback to x-real-ip)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  // Rate limit check
  const { allowed, retryAfter } = checkRateLimit(ip, request.nextUrl.pathname);

  if (!allowed) {
    const response = new NextResponse(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
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

  try {
    const response = await updateSession(request);
    return applySecurityHeaders(response);
  } catch {
    // If anything at all throws, return a normal response — never crash the browser
    const response = NextResponse.next();
    return applySecurityHeaders(response);
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json, sw.js, workbox-* (PWA files)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|workbox-.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

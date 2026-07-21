import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Emergency QR (/e/*) must never 500 at the edge.
 * Rate-limit used to live here via Upstash; a Redis/client failure caused
 * MIDDLEWARE_INVOCATION_FAILED and blocked scanners. Fail open.
 */
export async function middleware(request: NextRequest) {
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token || !request.nextUrl.pathname.startsWith('/e/')) {
      return NextResponse.next();
    }

    // Dynamic import so a broken @upstash package never kills middleware load.
    const [{ Ratelimit }, { Redis }] = await Promise.all([
      import('@upstash/ratelimit'),
      import('@upstash/redis'),
    ]);

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      '127.0.0.1';

    const rl = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(30, '60 s'),
      prefix: 'rl:emergency',
    });

    const { success, remaining, reset } = await rl.limit(ip);
    if (!success) {
      return new NextResponse('Too many requests. Try again later.', {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      });
    }

    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    return response;
  } catch (err) {
    console.error('Emergency middleware error, allowing request:', err);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/e/:path*'],
};

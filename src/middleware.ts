import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null;
  }

  if (!ratelimit) {
    ratelimit = new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      }),
      limiter: Ratelimit.slidingWindow(30, '60 s'),
      prefix: 'rl:emergency',
    });
  }

  return ratelimit;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/e/')) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      '127.0.0.1';

    const rl = getRatelimit();
    if (rl) {
      try {
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
        console.error('Rate-limit check failed, allowing request:', err);
      }
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/e/:token*'],
};

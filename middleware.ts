import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const launchDateStr = process.env.NEXT_PUBLIC_LAUNCH_DATE;
  const launchDate = launchDateStr ? new Date(launchDateStr).getTime() : 0;
  const now = Date.now();
  const isTimerOn = now < launchDate;

  const path = request.nextUrl.pathname;

  // If timer is ON and user tries to access the landing page
  if (isTimerOn && path === '/') {
    return NextResponse.redirect(new URL('/coming-soon', request.url));
  }

  // If timer is OFF and user tries to access coming-soon, redirect to landing page
  if (!isTimerOn && path === '/coming-soon') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/', '/coming-soon'],
};

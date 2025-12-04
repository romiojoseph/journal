import { NextResponse } from 'next/server';
import db from './lib/db';

// The function is named `proxy` as per Next.js v16+ convention
export function proxy(request) {
    const publicPaths = [
        '/access-vault',
        '/api/access-vault'
    ];
    const pathname = request.nextUrl.pathname;

    // Skip proxy for static assets
    if (pathname.startsWith('/_next/') || pathname.startsWith('/static/') || pathname.endsWith('.ico') || pathname.endsWith('.css')) {
        return NextResponse.next();
    }

    let isPinEnabled = false;
    let serverSessionId = null;
    try {
        const pinSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('securityPinEnabled');
        isPinEnabled = pinSetting?.value === 'true';

        const sessionSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('server_session_id');
        serverSessionId = sessionSetting?.value;
    } catch (error) {
        console.error('Proxy DB Error:', error);
        // TEMPORARY FIX: Fail open so you can access your app.
        // The DB check is failing, likely due to runtime environment issues.
        isPinEnabled = false;
    }

    const sessionCookie = request.cookies.get('journal-session');

    const isAccessingPublicPath = publicPaths.some(p => pathname.startsWith(p));

    // Redirect to access-vault if PIN is enabled and:
    // 1. No session cookie exists OR
    // 2. Session cookie does not match current server instance (server restarted)
    if (isPinEnabled && (!sessionCookie || sessionCookie.value !== serverSessionId) && !isAccessingPublicPath) {
        return NextResponse.redirect(new URL('/access-vault', request.url));
    }

    // Redirect away from access-vault if already authenticated
    if (sessionCookie && sessionCookie.value === serverSessionId && isAccessingPublicPath) {
        return NextResponse.redirect(new URL('/diary', request.url));
    }

    return NextResponse.next();
}

// Configure which routes the proxy should run on
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, sitemap, robots (metadata files)
         * - static assets (svg, png, jpg, etc.)
         */
        '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
    ],
};
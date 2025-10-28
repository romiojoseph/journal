import { NextResponse } from 'next/server';
import db from './lib/db';

// 1. The function is now named `proxy` instead of `middleware`.
// 2. The `export const runtime = 'nodejs';` line has been completely removed.
export function proxy(request) {
    const publicPaths = [
        '/access-vault',
        '/api/access-vault'
    ];
    const pathname = request.nextUrl.pathname;

    if (pathname.startsWith('/_next/') || pathname.startsWith('/static/') || pathname.endsWith('.ico') || pathname.endsWith('.css')) {
        return NextResponse.next();
    }

    let isPinEnabled = false;
    try {
        const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('securityPinEnabled');
        isPinEnabled = setting?.value === 'true';
    } catch (error) {
        console.error('Proxy DB check failed:', error);
        isPinEnabled = true; // Fail securely
    }

    const sessionCookie = request.cookies.get('journal-session');

    const isAccessingPublicPath = publicPaths.some(p => pathname.startsWith(p));

    if (isPinEnabled && !sessionCookie && !isAccessingPublicPath) {
        return NextResponse.redirect(new URL('/access-vault', request.url));
    }

    if (sessionCookie && isAccessingPublicPath) {
        return NextResponse.redirect(new URL('/diary', request.url));
    }

    return NextResponse.next();
}
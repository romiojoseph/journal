import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { validateSession } from '@/lib/security';

const getQuery = (fileName) => require('fs').readFileSync(require('path').join(process.cwd(), 'sql', fileName), 'utf8');

export async function POST(request) {
    try {
        const isValid = await validateSession(request);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
        }

        const { maxAge = 900 } = await request.json().catch(() => ({}));
        const response = NextResponse.json({ success: true });

        const serverSessionId = db.prepare('SELECT value FROM settings WHERE key = ?').get('server_session_id')?.value;

        response.cookies.set('journal-session', serverSessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: maxAge
        });

        return response;
    } catch (error) {
        console.error('Extend Session API error:', error);
        return NextResponse.json({ error: 'Failed to extend session.' }, { status: 500 });
    }
}
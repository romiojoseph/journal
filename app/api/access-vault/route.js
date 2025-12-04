import { NextResponse } from 'next/server';
import db from '../../../lib/db';

const getQuery = (fileName) => require('fs').readFileSync(require('path').join(process.cwd(), 'sql', fileName), 'utf8');

const simpleHash = (str) => {
    return str.split('').reverse().map(char => char.charCodeAt(0)).join('.');
};

export async function POST(request) {
    try {
        const { pin } = await request.json();
        if (!pin) {
            return NextResponse.json({ error: 'PIN is required.' }, { status: 400 });
        }

        const sql = getQuery('get_setting.sql');
        const storedHash = db.prepare(sql).get('securityPinHash')?.value;

        if (simpleHash(pin) === storedHash) {
            const response = NextResponse.json({ success: true });

            // Get the current server session ID from the DB
            const serverSessionId = db.prepare('SELECT value FROM settings WHERE key = ?').get('server_session_id')?.value;

            // Session cookie that expires when browser closes (no maxAge or expires)
            // Value is tied to server instance to invalidate on restart
            response.cookies.set('journal-session', serverSessionId, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                // No maxAge or expires = session cookie (expires when browser closes)
            });

            return response;
        } else {
            return NextResponse.json({ error: 'Invalid PIN.' }, { status: 401 });
        }
    } catch (error) {
        console.error('Access Vault API error:', error);
        return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
    }
}
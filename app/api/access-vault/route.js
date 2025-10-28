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

            response.cookies.set('journal-session', 'true', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                path: '/',
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
import { NextResponse } from 'next/server';
import { clearEncryptionKey } from '../../../lib/security';
import db from '../../../lib/db';

export async function POST() {
    try {
        clearEncryptionKey();

        // Set vault_locked flag in database
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('vault_locked', 'true')").run();

        const response = NextResponse.json({ message: 'Vault locked successfully.' });

        // Clear the session cookie by setting its expiration date to the past.
        response.cookies.set('journal-session', '', {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
            expires: new Date(0),
        });

        return response;
    } catch (error) {
        console.error('Lock Vault API error:', error);
        return NextResponse.json({ error: 'Failed to lock vault.' }, { status: 500 });
    }
}

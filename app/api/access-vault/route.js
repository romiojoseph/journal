import { NextResponse } from 'next/server';
import db from '../../../lib/db';
import { verifyPin, deriveKey, getOrCreateEncryptionSalt, setEncryptionKey, migrateData } from '../../../lib/security';

const getQuery = (fileName) => require('fs').readFileSync(require('path').join(process.cwd(), 'sql', fileName), 'utf8');

export async function POST(request) {
    try {
        const body = await request.json();
        const passphrase = body.passphrase || body.pin;

        if (!passphrase) {
            return NextResponse.json({ error: 'Passphrase is required.' }, { status: 400 });
        }

        const sql = getQuery('get_setting.sql');
        const storedHash = db.prepare(sql).get('securityPinHash')?.value;

        if (await verifyPin(passphrase, storedHash)) {
            const response = NextResponse.json({ success: true });

            const salt = getOrCreateEncryptionSalt();
            const key = deriveKey(passphrase, salt);
            setEncryptionKey(key);

            migrateData(true, key);

            db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('vault_locked', 'false')").run();

            const serverSessionId = db.prepare('SELECT value FROM settings WHERE key = ?').get('server_session_id')?.value;

            response.cookies.set('journal-session', serverSessionId, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 15 * 60
            });

            return response;
        } else {
            return NextResponse.json({ error: 'Invalid Passphrase.' }, { status: 401 });
        }
    } catch (error) {
        console.error('Access Vault API error:', error);
        return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 });
    }
}
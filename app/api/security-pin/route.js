import { NextResponse } from 'next/server';
import db from '../../../lib/db';
import { hashPin, verifyPin, deriveKey, getOrCreateEncryptionSalt, setEncryptionKey, clearEncryptionKey, migrateData } from '../../../lib/security';

const getQuery = (fileName) => require('fs').readFileSync(require('path').join(process.cwd(), 'sql', fileName), 'utf8');

export async function POST(request) {
    try {
        const { passphrase } = await request.json();

        if (!passphrase || passphrase.trim().length === 0) {
            return NextResponse.json({ error: 'Passphrase is required.' }, { status: 400 });
        }

        const salt = getOrCreateEncryptionSalt();
        const key = deriveKey(passphrase, salt);
        setEncryptionKey(key);

        migrateData(true, key);

        const setSql = getQuery('set_setting.sql');
        db.prepare(setSql).run('securityPinHash', await hashPin(passphrase));
        db.prepare(setSql).run('securityPinEnabled', 'true');
        db.prepare(setSql).run('vault_locked', 'true');

        return NextResponse.json({ message: 'Encryption enabled successfully.' });
    } catch (error) {
        console.error('Enable Encryption API error:', error);
        return NextResponse.json({ error: 'Failed to enable encryption.' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { passphrase } = await request.json();

        if (!passphrase) {
            return NextResponse.json({ error: 'Passphrase is required to disable encryption.' }, { status: 400 });
        }

        const sql = getQuery('get_setting.sql');
        const storedHash = db.prepare(sql).get('securityPinHash')?.value;

        if (!await verifyPin(passphrase, storedHash)) {
            return NextResponse.json({ error: 'Invalid Passphrase. Cannot disable encryption.' }, { status: 401 });
        }

        const salt = getOrCreateEncryptionSalt();
        const key = deriveKey(passphrase, salt);

        migrateData(false, key);

        const setSql = getQuery('set_setting.sql');
        db.prepare(setSql).run('securityPinHash', '');
        db.prepare(setSql).run('securityPinEnabled', 'false');
        db.prepare(setSql).run('vault_locked', 'false');

        clearEncryptionKey();

        const response = NextResponse.json({ message: 'Encryption disabled successfully.' });

        response.cookies.set('journal-session', '', {
            httpOnly: true,
            path: '/',
            expires: new Date(0),
        });

        return response;

    } catch (error) {
        console.error('Disable Encryption API error:', error);
        return NextResponse.json({ error: `Failed to disable encryption: ${error.message}` }, { status: 500 });
    }
}
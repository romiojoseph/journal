import { NextResponse } from 'next/server';
import db from '../../../lib/db';

const getQuery = (fileName) => require('fs').readFileSync(require('path').join(process.cwd(), 'sql', fileName), 'utf8');

const simpleHash = (str) => {
    return str.split('').reverse().map(char => char.charCodeAt(0)).join('.');
};

export async function POST(request) {
    try {
        const { pin } = await request.json();
        const setSql = getQuery('set_setting.sql');

        db.prepare(setSql).run('securityPinHash', simpleHash(pin));
        db.prepare(setSql).run('securityPinEnabled', 'true');

        return NextResponse.json({ message: 'PIN enabled successfully.' });
    } catch (error) {
        console.error('Set PIN API error:', error);
        return NextResponse.json({ error: 'Failed to set PIN.' }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        const deleteSql = getQuery('delete_setting.sql');

        db.prepare(deleteSql).run('securityPinHash');
        db.prepare(deleteSql).run('securityPinEnabled');

        const response = NextResponse.json({ message: 'PIN disabled successfully.' });

        response.cookies.set('journal-session', '', {
            httpOnly: true,
            path: '/',
            expires: new Date(0),
        });

        return response;

    } catch (error) {
        console.error('Delete PIN API error:', error);
        return NextResponse.json({ error: 'Failed to disable PIN.' }, { status: 500 });
    }
}
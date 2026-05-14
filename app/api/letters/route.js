import { NextResponse } from 'next/server';
import db from '../../../lib/db';
import fs from 'fs';
import path from 'path';
import { validateSession, isPinEnabled, getEncryptionKey, encrypt, decrypt } from '../../../lib/security';

const getQuery = (fileName) => fs.readFileSync(path.join(process.cwd(), 'sql', fileName), 'utf8');

export async function GET(request) {
    if (!await validateSession(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const sql = getQuery('select_all_letters.sql');
        let letters = db.prepare(sql).all();

        if (isPinEnabled()) {
            const key = getEncryptionKey();
            letters = letters.map(l => ({
                ...l,
                title: decrypt(l.title, key),
                body: decrypt(l.body, key)
            }));
        }

        return NextResponse.json(letters);
    } catch (error) {
        console.error('Failed to fetch letters:', error);
        return NextResponse.json({ error: 'Failed to fetch letters.' }, { status: 500 });
    }
}

export async function POST(request) {
    if (!await validateSession(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const { title, body = '' } = await request.json();

        if (!title || !title.trim()) {
            return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
        }

        let finalTitle = title.trim();
        let finalBody = body;
        if (isPinEnabled()) {
            const key = getEncryptionKey();
            finalTitle = encrypt(finalTitle, key);
            finalBody = encrypt(finalBody, key);
        }

        const id = crypto.randomUUID();
        const sql = getQuery('insert_letter.sql');
        db.prepare(sql).run(id, finalTitle, finalBody);
        return NextResponse.json({ message: 'Letter created successfully', letterId: id }, { status: 201 });
    } catch (error) {
        console.error('Failed to create letter:', error);
        return NextResponse.json({ error: 'Failed to create letter.' }, { status: 500 });
    }
}

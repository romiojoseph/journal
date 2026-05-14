import { NextResponse } from 'next/server';
import db from '../../../../lib/db';
import fs from 'fs';
import path from 'path';
import { validateSession, isPinEnabled, getEncryptionKey, encrypt, decrypt } from '../../../../lib/security';

const getQuery = (fileName) => fs.readFileSync(path.join(process.cwd(), 'sql', fileName), 'utf8');

export async function GET(request, { params }) {
    if (!await validateSession(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const { id } = await params;
        const sql = getQuery('select_letter_by_id.sql');
        const letter = db.prepare(sql).get(id);
        if (!letter) return NextResponse.json({ error: 'Letter not found.' }, { status: 404 });

        if (isPinEnabled()) {
            const key = getEncryptionKey();
            letter.title = decrypt(letter.title, key);
            letter.body = decrypt(letter.body, key);
        }

        return NextResponse.json(letter);
    } catch (error) {
        console.error('Failed to fetch letter:', error);
        return NextResponse.json({ error: 'Failed to fetch letter.' }, { status: 500 });
    }
}

export async function PUT(request, { params }) {
    if (!await validateSession(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const { id } = await params;
        const { title, body } = await request.json();

        if (!title || !title.trim()) {
            return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
        }

        let finalTitle = title.trim();
        let finalBody = body ?? '';
        if (isPinEnabled()) {
            const key = getEncryptionKey();
            finalTitle = encrypt(finalTitle, key);
            finalBody = encrypt(finalBody, key);
        }

        const sql = getQuery('update_letter_by_id.sql');
        const result = db.prepare(sql).run(finalTitle, finalBody, id);

        if (result.changes === 0) {
            return NextResponse.json({ error: 'Letter not found.' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Letter updated successfully', letterId: id });
    } catch (error) {
        console.error('Failed to update letter:', error);
        return NextResponse.json({ error: 'Failed to update letter.' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    if (!await validateSession(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const { id } = await params;
        const sql = getQuery('delete_letter_by_id.sql');
        const result = db.prepare(sql).run(id);

        if (result.changes === 0) {
            return NextResponse.json({ error: 'Letter not found.' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Letter deleted successfully.' });
    } catch (error) {
        console.error('Failed to delete letter:', error);
        return NextResponse.json({ error: 'Failed to delete letter.' }, { status: 500 });
    }
}

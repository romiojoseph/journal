import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { validateSession, isPinEnabled, getEncryptionKey, encrypt, decrypt } from '@/lib/security';
import fs from 'fs';
import path from 'path';

const getQuery = (fileName) => fs.readFileSync(path.join(process.cwd(), 'sql', fileName), 'utf8');

export async function POST(request) {
    try {
        const isValid = await validateSession(request);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
        }

        const { content, tags } = await request.json();

        const key = getEncryptionKey();
        if (isPinEnabled() && !key) {
            return NextResponse.json({ error: 'Encryption key missing. Please re-access the vault.' }, { status: 403 });
        }

        let finalContent = content || '';
        if (isPinEnabled() && finalContent && key) {
            finalContent = encrypt(finalContent, key);
        }

        const setSql = getQuery('set_setting.sql');
        db.prepare(setSql).run('journal_draft_content', finalContent);
        db.prepare(setSql).run('journal_draft_tags', JSON.stringify(tags || []));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Save Journal Draft API error:', error);
        return NextResponse.json({ error: 'Failed to save journal draft.' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const isValid = await validateSession(request);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
        }

        const setSql = getQuery('set_setting.sql');
        db.prepare(setSql).run('journal_draft_content', '');
        db.prepare(setSql).run('journal_draft_tags', '[]');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete Journal Draft API error:', error);
        return NextResponse.json({ error: 'Failed to delete draft.' }, { status: 500 });
    }
}

export async function GET(request) {
    try {
        const isValid = await validateSession(request);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
        }

        const sql = getQuery('get_setting.sql');
        let content = db.prepare(sql).get('journal_draft_content')?.value || '';
        
        if (isPinEnabled() && content) {
            const key = getEncryptionKey();
            if (!key) {
                return NextResponse.json({ error: 'Encryption key missing.' }, { status: 403 });
            }
            try {
                content = decrypt(content, key);
            } catch (err) {
                console.error('Failed to decrypt journal draft', err);
                // Don't return empty content if decryption fails due to wrong key/error
                return NextResponse.json({ error: 'Decryption failed.' }, { status: 500 });
            }
        }
        const tags = JSON.parse(db.prepare(sql).get('journal_draft_tags')?.value || '[]');

        return NextResponse.json({ content, tags });
    } catch (error) {
        console.error('Get Journal Draft API error:', error);
        return NextResponse.json({ error: 'Failed to get journal draft.' }, { status: 500 });
    }
}

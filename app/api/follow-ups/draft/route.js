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

        const { journalId, content } = await request.json();

        if (!journalId) {
            return NextResponse.json({ error: 'Journal ID is required.' }, { status: 400 });
        }

        const key = getEncryptionKey();
        if (isPinEnabled() && !key) {
            return NextResponse.json({ error: 'Encryption key missing. Please re-access the vault.' }, { status: 403 });
        }

        let finalContent = content || '';
        if (isPinEnabled() && finalContent && key) {
            finalContent = encrypt(finalContent, key);
        }

        const getSql = getQuery('get_setting.sql');
        const setSql = getQuery('set_setting.sql');

        let draftsJson = db.prepare(getSql).get('follow_up_drafts')?.value || '{}';
        let drafts = {};
        try {
            drafts = JSON.parse(draftsJson);
        } catch (e) {
            drafts = {};
        }

        drafts[journalId] = {
            content: finalContent,
            savedAt: Date.now()
        };

        db.prepare(setSql).run('follow_up_drafts', JSON.stringify(drafts));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Save Follow-up Draft API error:', error);
        return NextResponse.json({ error: 'Failed to save follow-up draft.' }, { status: 500 });
    }
}

export async function GET(request) {
    try {
        const isValid = await validateSession(request);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const journalId = searchParams.get('journalId');

        if (!journalId) {
            return NextResponse.json({ error: 'Journal ID is required.' }, { status: 400 });
        }

        const getSql = getQuery('get_setting.sql');
        let draftsJson = db.prepare(getSql).get('follow_up_drafts')?.value || '{}';
        let drafts = {};
        try {
            drafts = JSON.parse(draftsJson);
        } catch (e) {
            drafts = {};
        }

        const draft = drafts[journalId];

        if (!draft) {
            return NextResponse.json({ content: '' });
        }

        let content = draft.content || '';

        if (isPinEnabled() && content) {
            const key = getEncryptionKey();
            if (!key) {
                return NextResponse.json({ error: 'Encryption key missing.' }, { status: 403 });
            }
            try {
                content = decrypt(content, key);
            } catch (err) {
                console.error('Failed to decrypt follow-up draft', err);
                return NextResponse.json({ error: 'Decryption failed.' }, { status: 500 });
            }
        }

        return NextResponse.json({ content });
    } catch (error) {
        console.error('Get Follow-up Draft API error:', error);
        return NextResponse.json({ error: 'Failed to get follow-up draft.' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const isValid = await validateSession(request);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid session.' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const journalId = searchParams.get('journalId');

        if (!journalId) {
            return NextResponse.json({ error: 'Journal ID is required.' }, { status: 400 });
        }

        const getSql = getQuery('get_setting.sql');
        const setSql = getQuery('set_setting.sql');

        let draftsJson = db.prepare(getSql).get('follow_up_drafts')?.value || '{}';
        let drafts = {};
        try {
            drafts = JSON.parse(draftsJson);
        } catch (e) {
            drafts = {};
        }

        delete drafts[journalId];

        db.prepare(setSql).run('follow_up_drafts', JSON.stringify(drafts));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete Follow-up Draft API error:', error);
        return NextResponse.json({ error: 'Failed to delete follow-up draft.' }, { status: 500 });
    }
}
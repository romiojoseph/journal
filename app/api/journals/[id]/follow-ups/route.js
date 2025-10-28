import { NextResponse } from 'next/server';
import db from '../../../../../lib/db';
import fs from 'fs';
import path from 'path';

const getQuery = (fileName) => fs.readFileSync(path.join(process.cwd(), 'sql', fileName), 'utf8');

// GET all follow-ups for a journal
export async function GET(request, { params }) {
    try {
        const resolvedParams = await params;
        const journalId = resolvedParams.id;
        const sql = getQuery('select_follow_ups_by_journal_id.sql');
        const followUps = db.prepare(sql).all(journalId);
        return NextResponse.json(followUps);
    } catch (error) {
        console.error('Failed to fetch follow-ups:', error);
        return NextResponse.json({ error: 'Failed to fetch follow-ups.' }, { status: 500 });
    }
}

// POST a new follow-up for a journal
export async function POST(request, { params }) {
    try {
        const resolvedParams = await params;
        const journalId = resolvedParams.id;
        const { content } = await request.json();

        if (!content) {
            return NextResponse.json({ error: 'Content is required.' }, { status: 400 });
        }

        const sql = getQuery('insert_follow_up.sql');
        const result = db.prepare(sql).run(journalId, content);

        return NextResponse.json({ message: 'Follow-up created.', followUpId: result.lastInsertRowid }, { status: 201 });
    } catch (error) {
        console.error('Failed to create follow-up:', error);
        return NextResponse.json({ error: 'Failed to create follow-up.' }, { status: 500 });
    }
}
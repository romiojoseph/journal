import { NextResponse } from 'next/server';
import db from '../../../../lib/db';
import fs from 'fs';
import path from 'path';

const getQuery = (fileName) => fs.readFileSync(path.join(process.cwd(), 'sql', fileName), 'utf8');

// PUT (update) a specific follow-up
export async function PUT(request, { params }) {
    try {
        const resolvedParams = await params;
        const followUpId = resolvedParams.followUpId;
        const { content } = await request.json();

        if (!content) {
            return NextResponse.json({ error: 'Content is required.' }, { status: 400 });
        }

        const sql = getQuery('update_follow_up_by_id.sql');
        db.prepare(sql).run(content, followUpId);

        return NextResponse.json({ message: 'Follow-up updated.' });
    } catch (error) {
        console.error('Failed to update follow-up:', error);
        return NextResponse.json({ error: 'Failed to update follow-up.' }, { status: 500 });
    }
}

// DELETE a specific follow-up
export async function DELETE(request, { params }) {
    try {
        const resolvedParams = await params;
        const followUpId = resolvedParams.followUpId;

        const sql = getQuery('delete_follow_up_by_id.sql');
        const result = db.prepare(sql).run(followUpId);

        if (result.changes === 0) {
            return NextResponse.json({ error: 'Follow-up not found.' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Follow-up deleted.' });
    } catch (error) {
        console.error('Failed to delete follow-up:', error);
        return NextResponse.json({ error: 'Failed to delete follow-up.' }, { status: 500 });
    }
}
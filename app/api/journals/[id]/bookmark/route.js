import { NextResponse } from 'next/server';
import db from '../../../../../lib/db';
import fs from 'fs';
import path from 'path';

const getQuery = (fileName) => fs.readFileSync(path.join(process.cwd(), 'sql', fileName), 'utf8');

export async function POST(request, { params }) {
    try {
        const resolvedParams = await params;
        const journalId = resolvedParams.id;

        const sql = getQuery('toggle_bookmark_by_id.sql');
        const stmt = db.prepare(sql);
        stmt.run(journalId);

        // We can get the new status to return to the client if needed
        const updatedJournal = db.prepare('SELECT isBookmarked FROM journals WHERE id = ?').get(journalId);

        return NextResponse.json({
            message: 'Bookmark status toggled.',
            isBookmarked: updatedJournal.isBookmarked
        });

    } catch (error) {
        console.error('Failed to toggle bookmark:', error);
        return NextResponse.json({ error: 'Failed to toggle bookmark.' }, { status: 500 });
    }
}
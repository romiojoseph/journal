import { NextResponse } from 'next/server';
import db from '../../../../lib/db';
import fs from 'fs';
import path from 'path';

const getQuery = (fileName) => fs.readFileSync(path.join(process.cwd(), 'sql', fileName), 'utf8');

export async function POST(request) {
    try {
        // Accept the new optional field
        const { content, tags, quotedJournalId = null } = await request.json();

        if (!content || !tags || tags.length === 0) {
            return NextResponse.json({ error: 'Content and at least one tag are required.' }, { status: 400 });
        }

        const insertJournalSql = getQuery('insert_journal.sql');
        const findTagSql = getQuery('find_tag_by_name_and_type.sql');
        const insertTagSql = getQuery('insert_tag.sql');
        const linkTagSql = getQuery('link_journal_to_tag.sql');

        const transaction = db.transaction((journalData) => {
            const journalStmt = db.prepare(insertJournalSql);
            // Pass the new field to the query
            const journalResult = journalStmt.run(journalData.content, journalData.quotedJournalId);
            const journalId = journalResult.lastInsertRowid;

            const findTagStmt = db.prepare(findTagSql);
            const insertTagStmt = db.prepare(insertTagSql);
            const linkTagStmt = db.prepare(linkTagSql);

            for (const tag of journalData.tags) {
                let tagRecord = findTagStmt.get(tag.name, tag.type);
                let tagId = tagRecord ? tagRecord.id : insertTagStmt.run(tag.name, tag.type).lastInsertRowid;
                linkTagStmt.run(journalId, tagId);
            }
            return journalId;
        });

        const newJournalId = transaction({ content, tags, quotedJournalId });

        return NextResponse.json({ message: 'Journal created successfully', journalId: newJournalId }, { status: 201 });

    } catch (error) {
        console.error('Failed to create journal:', error);
        return NextResponse.json({ error: 'Failed to create journal.' }, { status: 500 });
    }
}
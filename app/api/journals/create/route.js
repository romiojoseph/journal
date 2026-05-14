import { NextResponse } from 'next/server';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { getClosestMoodSentence } from '@/lib/mood-scoring';

import { validateSession, isPinEnabled, getEncryptionKey, encrypt } from '@/lib/security';

const getQuery = (fileName) => fs.readFileSync(path.join(process.cwd(), 'sql', fileName), 'utf8');

export async function POST(request) {
    if (!await validateSession(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        // Accept the new optional field
        const { content, tags, quotedJournalId = null } = await request.json();

        if (!tags || tags.length === 0) {
            return NextResponse.json({ error: 'At least one tag is required.' }, { status: 400 });
        }
        if (!tags.some(t => t.type === 'mood')) {
            return NextResponse.json({ error: 'At least one mood tag is required.' }, { status: 400 });
        }

        let finalContent = content;
        if (isPinEnabled()) {
            finalContent = encrypt(content, getEncryptionKey());
        }

        const journalId = crypto.randomUUID();
        const closestSentence = getClosestMoodSentence(db, tags, journalId);
        const moodSentenceId = closestSentence ? closestSentence.id : null;

        const insertJournalSql = getQuery('insert_journal.sql');
        const findTagSql = getQuery('find_tag_by_name_and_type.sql');
        const insertTagSql = getQuery('insert_tag.sql');
        const linkTagSql = getQuery('link_journal_to_tag.sql');

        const transaction = db.transaction((journalData) => {
            const journalStmt = db.prepare(insertJournalSql);
            const journalResult = journalStmt.run(
                journalData.id, 
                journalData.content, 
                journalData.quotedJournalId,
                journalData.moodSentenceId
            );
            const journalId = journalData.id;

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

        const newJournalId = transaction({ 
            id: journalId, 
            content: finalContent, 
            tags, 
            quotedJournalId,
            moodSentenceId
        });

        return NextResponse.json({ message: 'Journal created successfully', journalId: newJournalId }, { status: 201 });

    } catch (error) {
        console.error('Failed to create journal:', error);
        return NextResponse.json({ error: 'Failed to create journal.' }, { status: 500 });
    }
}
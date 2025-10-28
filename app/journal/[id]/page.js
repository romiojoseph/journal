import db from '../../../lib/db';
import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import JournalView from '../../../components/JournalView';

export const dynamic = 'force-dynamic';

function parseJournal(journal) {
    if (!journal) return null;

    const tagsArray = journal.tags
        ? journal.tags.split('|').map(tagString => {
            const [type, name] = tagString.split(':');
            return { type, name };
        })
        : [];

    const quotedJournal = journal.quoted_id
        ? {
            id: journal.quoted_id,
            content: journal.quoted_content,
            createdAt: journal.quoted_createdAt,
        }
        : null;

    return {
        id: journal.id,
        content: journal.content,
        createdAt: journal.createdAt,
        updatedAt: journal.updatedAt,
        isBookmarked: journal.isBookmarked,
        tags: tagsArray,
        quotedJournal: quotedJournal,
    };
}

function getJournal(id) {
    try {
        const sql = fs.readFileSync(path.join(process.cwd(), 'sql', 'select_journal_by_id.sql'), 'utf8');
        const journalData = db.prepare(sql).get(id);
        return parseJournal(journalData);
    } catch (error) {
        console.error("Failed to fetch journal:", error);
        return null;
    }
}

export default async function JournalDetailPage({ params }) {
    const resolvedParams = await params;
    const journalId = parseInt(resolvedParams.id, 10);

    if (isNaN(journalId)) {
        notFound();
    }

    const journal = getJournal(journalId);

    if (!journal) {
        notFound();
    }

    return <JournalView journal={journal} />;
}
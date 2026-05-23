import { notFound, redirect } from 'next/navigation';
import db from '../../../../lib/db';
import fs from 'fs';
import path from 'path';
import JournalForm from '../../../../components/JournalForm';
import { getTags } from '../../../../lib/tags';
import { validateSession, isPinEnabled, getEncryptionKey, decrypt } from '../../../../lib/security';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function parseJournal(journal, key) {
    if (!journal) return null;

    const tagsArray = journal.tags
        ? journal.tags.split('|').map(tagString => {
            const [type, name] = tagString.split(':');
            return { type, name };
        })
        : [];

    let content = journal.content;
    let quotedContent = journal.quoted_content;
    let quotedFollowUpContent = journal.quoted_follow_up_content;
    if (key) {
        content = decrypt(content, key);
        if (quotedContent) quotedContent = decrypt(quotedContent, key);
        if (quotedFollowUpContent) quotedFollowUpContent = decrypt(quotedFollowUpContent, key);
    }

    const quotedJournal = journal.quoted_id
        ? {
            id: journal.quoted_id,
            content: quotedContent,
            createdAt: journal.quoted_createdAt,
        }
        : null;

    const quotedFollowUp = journal.quoted_follow_up_id
        ? {
            id: journal.quoted_follow_up_id,
            journalId: journal.quoted_follow_up_journal_id,
            content: quotedFollowUpContent,
            createdAt: journal.quoted_follow_up_createdAt,
        }
        : null;

    return {
        id: journal.id,
        content: content,
        createdAt: journal.createdAt,
        updatedAt: journal.updatedAt,
        isBookmarked: journal.isBookmarked,
        tags: tagsArray,
        quotedJournal: quotedJournal,
        quotedFollowUp: quotedFollowUp,
    };
}

function getJournal(id) {
    try {
        const key = isPinEnabled() ? getEncryptionKey() : null;
        const sql = fs.readFileSync(path.join(process.cwd(), 'sql', 'select_journal_by_id.sql'), 'utf8');
        const journalData = db.prepare(sql).get(id);
        return parseJournal(journalData, key);
    } catch (error) {
        console.error("Failed to fetch journal for editing:", error);
        return null;
    }
}

export default async function EditJournalPage({ params }) {
    if (!await validateSession({ cookies: cookies() })) {
        redirect('/access-vault');
    }
    const resolvedParams = await params;
    const journalId = resolvedParams.id;

    const journal = getJournal(journalId);

    if (!journal) {
        notFound();
    }

    const tags = await getTags();

    return <JournalForm initialData={journal} initialTags={tags} />;
}

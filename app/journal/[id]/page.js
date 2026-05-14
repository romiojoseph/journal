import db from '../../../lib/db';
import fs from 'fs';
import path from 'path';
import { notFound, redirect } from 'next/navigation';
import JournalView from '../../../components/JournalView';
import { validateSession, isPinEnabled, getEncryptionKey, decrypt } from '../../../lib/security';
import { cookies } from 'next/headers';
import { getTags } from '../../../lib/tags';

export const dynamic = 'force-dynamic';

function parseJournal(journal, moodSentences = [], key) {
    if (!journal) return null;

    const tagsArray = journal.tags
        ? journal.tags.split('|').map(tagString => {
            const [type, name] = tagString.split(':');
            return { type, name };
        })
        : [];

    let content = journal.content;
    let quotedContent = journal.quoted_content;
    if (key) {
        content = decrypt(content, key);
        if (quotedContent) quotedContent = decrypt(quotedContent, key);
    }

    const quotedJournal = journal.quoted_id
        ? {
            id: journal.quoted_id,
            content: quotedContent,
            createdAt: journal.quoted_createdAt,
        }
        : null;

    const sentence = moodSentences.find(s => s.id === journal.mood_sentence_id);

    return {
        id: journal.id,
        content: content,
        createdAt: journal.createdAt,
        updatedAt: journal.updatedAt,
        isBookmarked: journal.isBookmarked,
        tags: tagsArray,
        quotedJournal: quotedJournal,
        moodSentence: sentence ? sentence.text : null
    };
}

function getJournal(id, moodSentences) {
    try {
        const key = isPinEnabled() ? getEncryptionKey() : null;
        const sql = fs.readFileSync(path.join(process.cwd(), 'sql', 'select_journal_by_id.sql'), 'utf8');
        const journalData = db.prepare(sql).get(id);
        return parseJournal(journalData, moodSentences, key);
    } catch (error) {
        console.error("Failed to fetch journal:", error);
        return null;
    }
}

export default async function JournalDetailPage({ params }) {
    if (!await validateSession({ cookies: cookies() })) {
        redirect('/access-vault');
    }

    // Load mood sentences
    let moodSentences = [];
    try {
        const jsonPath = path.join(process.cwd(), 'context', 'sentence.json');
        if (fs.existsSync(jsonPath)) {
            moodSentences = JSON.parse(fs.readFileSync(jsonPath, 'utf8')).sentences || [];
        }
    } catch (err) {
        console.error("Failed to load mood sentences:", err);
    }

    const resolvedParams = await params;
    const journalId = resolvedParams.id;

    const journal = getJournal(journalId, moodSentences);
    const allTags = await getTags();

    if (!journal) {
        notFound();
    }

    return <JournalView journal={journal} moodData={allTags} />;
}
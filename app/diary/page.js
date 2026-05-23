import db from '../../lib/db';
import fs from 'fs';
import path from 'path';
import DiaryPageClient from '../../components/DiaryPageClient';
import { getTags } from '../../lib/tags';
import { validateSession, isPinEnabled, getEncryptionKey, decrypt } from '../../lib/security';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

function parseJournal(journal, moodSentences = [], key) {
    if (!journal) return null;
    const tagsArray = journal.tags ? journal.tags.split('|').map(tagString => ({ type: tagString.split(':')[0], name: tagString.split(':')[1] })) : [];
    
    let content = journal.content;
    let quotedContent = journal.quoted_content;
    let quotedFollowUpContent = journal.quoted_follow_up_content;
    let followUpContent = journal.follow_up_content || '';

    if (key) {
        content = decrypt(content, key);
        if (quotedContent) quotedContent = decrypt(quotedContent, key);
        if (quotedFollowUpContent) quotedFollowUpContent = decrypt(quotedFollowUpContent, key);
        if (followUpContent) {
            // followUpContent is a GROUP_CONCAT with space separator.
            // Split by space, decrypt each (which also handles unencrypted fallback seamlessly), and rejoin.
            followUpContent = followUpContent.split(' ').map(part => decrypt(part, key)).join(' ');
        }
    }

    const quotedJournal = journal.quoted_id ? { id: journal.quoted_id, content: quotedContent, createdAt: journal.quoted_createdAt } : null;
    const quotedFollowUp = journal.quoted_follow_up_id
        ? {
            id: journal.quoted_follow_up_id,
            journalId: journal.quoted_follow_up_journal_id,
            content: quotedFollowUpContent,
            createdAt: journal.quoted_follow_up_createdAt
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
        quotedFollowUp: quotedFollowUp,
        follow_up_content: followUpContent,
        followUpCount: journal.follow_up_count || 0,
        quoteCount: journal.quote_count || 0,
        moodSentence: sentence ? sentence.text : null
    };
}

function getJournals(moodSentences) {
    try {
        const key = isPinEnabled() ? getEncryptionKey() : null;
        const sql = fs.readFileSync(path.join(process.cwd(), 'sql', 'select_all_journals_with_tags.sql'), 'utf8');
        return db.prepare(sql).all().map(j => parseJournal(j, moodSentences, key));
    } catch (error) {
        console.error("Failed to fetch journals:", error);
        return [];
    }
}

export default async function DiaryPage() {
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

    const journals = getJournals(moodSentences);
    const allTags = await getTags();

    return (
        <DiaryPageClient initialJournals={journals} moodData={allTags} allTags={allTags} />
    );
}

import JournalForm from '../components/JournalForm';
import db from '../lib/db';
import { getTags } from '../lib/tags';
import { decrypt, getEncryptionKey, isPinEnabled } from '../lib/security';

export const dynamic = 'force-dynamic';

function getQuotedJournal(id) {
  if (!id) return null;
  try {
    const sql = 'SELECT id, content, createdAt FROM journals WHERE id = ?';
    const row = db.prepare(sql).get(id);
    if (!row) return null;

    const key = isPinEnabled() ? getEncryptionKey() : null;
    return {
      ...row,
      content: key ? decrypt(row.content, key) : row.content,
    };
  } catch (error) {
    console.error("Failed to fetch quoted journal:", error);
    return null;
  }
}

function getQuotedFollowUp(id) {
  if (!id) return null;
  try {
    const sql = 'SELECT id, journal_id as journalId, content, createdAt FROM follow_ups WHERE id = ?';
    const row = db.prepare(sql).get(id);
    if (!row) return null;

    const key = isPinEnabled() ? getEncryptionKey() : null;
    return {
      ...row,
      content: key ? decrypt(row.content, key) : row.content,
    };
  } catch (error) {
    console.error("Failed to fetch quoted follow-up:", error);
    return null;
  }
}

export default async function NewJournalHomepage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const quoteId = resolvedSearchParams.quoteId;
  const quoteFollowUpId = resolvedSearchParams.quoteFollowUpId;

  const quotedJournal = getQuotedJournal(quoteId);
  const quotedFollowUp = getQuotedFollowUp(quoteFollowUpId);
  const initialTags = await getTags();

  return <JournalForm quotedJournal={quotedJournal} quotedFollowUp={quotedFollowUp} initialTags={initialTags} />;
}

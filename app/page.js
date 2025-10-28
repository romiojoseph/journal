import JournalForm from '../components/JournalForm';
import db from '../lib/db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getQuotedJournal(id) {
  if (!id) return null;
  try {
    const sql = 'SELECT id, content, createdAt FROM journals WHERE id = ?';
    return db.prepare(sql).get(id);
  } catch (error) {
    console.error("Failed to fetch quoted journal:", error);
    return null;
  }
}

export default async function NewJournalHomepage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const quoteId = resolvedSearchParams.quoteId;

  const quotedJournal = getQuotedJournal(quoteId);

  return <JournalForm quotedJournal={quotedJournal} />;
}
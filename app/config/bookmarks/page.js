import db from '../../../lib/db';
import { getTags } from '../../../lib/tags';
import fs from 'fs';
import path from 'path';
import JournalCard from '../../../components/JournalCard';
import styles from '../../../styles/BookmarksPage.module.css';
import { isPinEnabled, getEncryptionKey, decrypt } from '../../../lib/security';

function getBookmarkedJournals() {
    try {
        const sql = fs.readFileSync(path.join(process.cwd(), 'sql', 'select_bookmarked_journals.sql'), 'utf8');
        const journals = db.prepare(sql).all();

        const key = isPinEnabled() ? getEncryptionKey() : null;

        return journals.map(journal => {
            let tagsArray = [];
            if (journal.tags) {
                tagsArray = journal.tags.split('|').map(tagString => {
                    const [type, name] = tagString.split(':');
                    return { type, name };
                });
            }
            
            let content = journal.content;
            if (key) {
                content = decrypt(content, key);
            }

            return { ...journal, content, tags: tagsArray };
        });
    } catch (error) {
        console.error("Failed to fetch bookmarked journals:", error);
        return [];
    }
}

async function getMoodData() {
    return await getTags();
}

export default async function BookmarksPage() {
    const journals = getBookmarkedJournals();
    const moodData = await getMoodData();

    return (
        <div className={styles.container}>
            <h1>Bookmarks</h1>
            {journals.length > 0 ? (
                <div className={styles.journalList}>
                    {journals.map(journal => (
                        <JournalCard key={journal.id} journal={journal} moodData={moodData} />
                    ))}
                </div>
            ) : (
                <p className={styles.emptyMessage}>
                    You haven&apos;t bookmarked any journals yet.
                </p>
            )}
        </div>
    );
}
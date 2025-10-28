import db from '../../../lib/db';
import fs from 'fs';
import path from 'path';
import JournalCard from '../../../components/JournalCard';
import styles from '../../../styles/BookmarksPage.module.css';

function getBookmarkedJournals() {
    try {
        const sql = fs.readFileSync(path.join(process.cwd(), 'sql', 'select_bookmarked_journals.sql'), 'utf8');
        const journals = db.prepare(sql).all();

        return journals.map(journal => {
            if (!journal.tags) return { ...journal, tags: [] };
            const tagsArray = journal.tags.split('|').map(tagString => {
                const [type, name] = tagString.split(':');
                return { type, name };
            });
            return { ...journal, tags: tagsArray };
        });
    } catch (error) {
        console.error("Failed to fetch bookmarked journals:", error);
        return [];
    }
}

function getMoodData() {
    const filePath = path.join(process.cwd(), 'data', 'moods.json');
    const jsonData = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(jsonData);
}

export default function BookmarksPage() {
    const journals = getBookmarkedJournals();
    const moodData = getMoodData();

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
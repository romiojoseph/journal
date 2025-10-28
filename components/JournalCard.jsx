'use client';

import { useRouter } from 'next/navigation';
import styles from '../styles/JournalCard.module.css';
import TagPill from './TagPill';
import FormattedDate from './FormattedDate';
import QuotedJournalPreview from './QuotedJournalPreview';

const getMoodColor = (tagName, moodData) => {
    for (const mood of moodData.moods) {
        if (mood.tags.includes(tagName)) {
            return mood.color;
        }
    }
    return 'var(--monochrome-11)';
}

function ConnectorCount({ count }) {
    if (count === 0) {
        return <span className={styles.connectorCount} style={{ fontStyle: 'italic' }}>No connectors</span>;
    }
    if (count >= 1 && count <= 4) {
        return <span className={styles.connectorCount}>A few connector tags</span>;
    }
    return <span className={styles.connectorCount}>5+ connector tags</span>;
}

export default function JournalCard({ journal, moodData }) {
    const router = useRouter();
    const moodTags = journal.tags ? journal.tags.filter(tag => tag.type === 'mood') : [];
    const connectorCount = journal.tags ? journal.tags.filter(tag => tag.type !== 'mood').length : 0;

    const handleCardClick = () => {
        router.push(`/journal/${journal.id}`);
    };

    return (
        <div onClick={handleCardClick} className={styles.card}>
            <div className={styles.tagsContainer}>
                {moodTags.map(tag => (
                    <TagPill
                        key={tag.name}
                        text={tag.name}
                        color={getMoodColor(tag.name, moodData)}
                        onRemove={null}
                    />
                ))}
            </div>
            <p className={styles.content}>
                {journal.content}
            </p>

            <QuotedJournalPreview journal={journal.quotedJournal} />

            <div className={styles.footer}>
                <ConnectorCount count={connectorCount} />
                <span className={styles.timestamp}>
                    <FormattedDate dateString={journal.createdAt} />
                </span>
            </div>
        </div>
    );
}
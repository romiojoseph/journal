'use client';

import Link from 'next/link';
import FormattedDate from './FormattedDate';
import styles from '../styles/QuotedJournalPreview.module.css';
import { X } from '@phosphor-icons/react/dist/ssr';

export default function QuotedJournalPreview({ journal, onDetach = null }) {
    if (!journal || !journal.id) {
        return null;
    }

    const handleContainerClick = (e) => {
        e.stopPropagation();
    };

    const handleDetachClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onDetach) {
            onDetach();
        }
    };

    return (
        <div className={styles.wrapper}>
            {onDetach && (
                <button onClick={handleDetachClick} className={styles.detachButton} title="Detach Quote">
                    <X size={18} weight="bold" />
                </button>
            )}
            <Link
                href={`/journal/${journal.id}`}
                className={styles.quotedContainer}
                onClick={handleContainerClick}
            >
                <div className={styles.header}>
                    <span className={styles.author}>Context for this journal</span>
                    <FormattedDate dateString={journal.createdAt} />
                </div>
                <p className={styles.content}>
                    {journal.content}
                </p>
            </Link>
        </div>
    );
}
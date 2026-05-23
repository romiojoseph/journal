'use client';

import Link from 'next/link';
import FormattedDate from './FormattedDate';
import styles from '../styles/QuotedJournalPreview.module.css';
import { X } from '@phosphor-icons/react/dist/ssr';

export default function QuotedFollowUpPreview({ followUp, onDetach = null }) {
    if (!followUp || !followUp.id) {
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
                href={`/journal/${followUp.journalId}`}
                className={styles.quotedContainer}
                onClick={handleContainerClick}
            >
                <div className={styles.header}>
                    <span className={styles.author}>Context follow-up</span>
                    <FormattedDate dateString={followUp.createdAt} />
                </div>
                <p className={styles.content}>
                    {followUp.content}
                </p>
            </Link>
        </div>
    );
}


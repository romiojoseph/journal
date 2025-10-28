'use client'; // <-- ADD THIS LINE

import { X } from '@phosphor-icons/react';
import styles from '../styles/TagPill.module.css';

export default function TagPill({ text, color, onRemove }) {
    // Use inline style for dynamic background color from JSON
    const pillStyle = color ? { backgroundColor: color } : {};
    const showRemoveButton = onRemove !== null;

    return (
        <div
            className={`${styles.pill} ${!color ? styles.nonMoodPill : ''}`}
            style={pillStyle}
        >
            <span>{text}</span>
            {showRemoveButton && (
                <button onClick={onRemove} className={styles.removeButton}>
                    <X size={16} weight="bold" />
                </button>
            )}
        </div>
    );
}
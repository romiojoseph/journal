'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import styles from '../styles/LetterCard.module.css';
import FormattedDate from './FormattedDate';
import { EnvelopeSimple, NoteIcon, Trash } from '@phosphor-icons/react';
import { useModal } from '../context/ModalContext';
import { useToast } from '../context/ToastContext';
import FireAnimationOverlay from './FireAnimationOverlay';

export default function LetterCard({ letter, onDeleteSuccess }) {
    const router = useRouter();
    const { showConfirm } = useModal();
    const { showToast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleCardClick = (e) => {
        // Prevent click if clicking the delete button
        if (e.target.closest(`.${styles.deleteBtn}`)) return;
        router.push(`/letters/${letter.id}`);
    };

    const handleAnimationComplete = () => {
        setIsDeleting(false);
        if (onDeleteSuccess) {
            onDeleteSuccess(letter.id);
        } else {
            router.refresh();
        }
    };

    // Strip HTML tags for plain-text preview
    const preview = letter.body
        ? letter.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || 'No content yet...'
        : 'No content yet...';

    return (
        <>
            {isDeleting && <FireAnimationOverlay onComplete={handleAnimationComplete} />}
            <div onClick={handleCardClick} className={styles.card}>
                {/* Left side: Icon */}
                <div className={styles.iconSection}>
                    <NoteIcon size={48} weight="duotone" />
                </div>

                {/* Right side: Content */}
                <div className={styles.mainSection}>
                    <h3 className={styles.title}>{letter.title}</h3>
                    <p className={styles.content}>{preview}</p>
                    <div className={styles.footer}>
                        <span className={styles.timestamp}>
                            <FormattedDate dateString={letter.updatedAt} />
                        </span>
                    </div>
                </div>

                {/* Hover overlay */}
                <div className={styles.overlay}>
                    <div className={styles.overlayActions}>
                        <div className={styles.overlayContent}>
                            <EnvelopeSimple size={32} weight="fill" />
                            <span>View Letter</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

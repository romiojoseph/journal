'use client';

import { X } from '@phosphor-icons/react';
import styles from '../styles/Modal.module.css';

// Receive the new isDismissable prop
export default function Modal({ isOpen, onClose, title, children, actions, isDismissable }) {
    if (!isOpen) {
        return null;
    }

    return (
        // Only trigger onClose if the modal is dismissable
        <div className={styles.overlay} onClick={isDismissable ? onClose : undefined}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <header className={styles.header}>
                    <h2>{title}</h2>
                    {/* Only render the close button if the modal is dismissable */}
                    {isDismissable && (
                        <button onClick={onClose} className={styles.closeButton}>
                            <X size={24} />
                        </button>
                    )}
                </header>
                <div className={styles.content}>
                    {children}
                </div>
                <footer className={styles.footer}>
                    {actions.map((action, index) => (
                        <button
                            key={index}
                            onClick={action.onClick}
                            className={`${styles.actionButton} ${styles[action.variant] || styles.default}`}
                        >
                            {action.label}
                        </button>
                    ))}
                </footer>
            </div>
        </div>
    );
}
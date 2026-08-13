'use client';

import styles from '../styles/LoadingSpinner.module.css';

export default function LoadingSpinner({ message = 'Loading...', fullPage = false }) {
    return (
        <div className={fullPage ? styles.fullPage : styles.inline}>
            <div className={styles.spinner}></div>
            <p className={styles.message}>{message}</p>
        </div>
    );
}

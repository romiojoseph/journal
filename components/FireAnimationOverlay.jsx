'use client';

import { useState, useEffect } from 'react';
import styles from '../styles/FireAnimation.module.css';

export default function FireAnimationOverlay({ onComplete }) {
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        const duration = 3300;
        const startTime = Date.now();

        const timer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
            setProgress(remaining);

            if (elapsed >= duration) {
                clearInterval(timer);
                onComplete?.();
            }
        }, 10);

        return () => clearInterval(timer);
    }, [onComplete]);

    return (
        <div className={styles.overlay}>
            <div className={styles.content}>
                <img src="/fire.gif" alt="Fire" className={styles.gif} />
                <div className={styles.progressContainer}>
                    <div
                        className={styles.progressBar}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

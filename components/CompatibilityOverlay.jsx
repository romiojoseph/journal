'use client';

import { Desktop } from '@phosphor-icons/react';
import styles from '../styles/CompatibilityOverlay.module.css';

export default function CompatibilityOverlay() {
    return (
        <div className={styles.overlay}>
            <div className={styles.iconWrapper}>
                <Desktop size={64} weight="duotone" />
            </div>
            <h2 className={styles.heading}>Desktop Only Experience</h2>
            <p className={styles.text}>
                This application is designed specifically for desktop environments. Please resize your browser window to at least 1280px wide or switch to a larger display for the best experience.
            </p>
        </div>
    );
}

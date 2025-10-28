'use client';

import { useFont } from '../context/FontContext';
import styles from '../styles/AboutPage.module.css';

export default function FontSelector() {
    const { font, setFont } = useFont();

    return (
        <div className={styles.fontSelector}>
            <label htmlFor="font-select">Application Font:</label>
            <select
                id="font-select"
                value={font}
                onChange={(e) => setFont(e.target.value)}
            >
                <option value="inter">Inter (Sans-Serif)</option>
                <option value="lora">Lora (Serif)</option>
                <option value="jetbrains-mono">JetBrains Mono (Monospace)</option>
                <option value="google-sans-code">Google Sans Code (Monospace)</option>
            </select>
        </div>
    );
}
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../styles/LockScreen.module.css';

export default function AccessVaultPage() {
    const router = useRouter();
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const response = await fetch('/api/access-vault', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin }),
        });

        if (response.ok) {
            // On success, redirect to the main diary page.
            window.location.href = '/diary';
        } else {
            setError('Invalid PIN. Please try again.');
            setPin('');
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.container}>
                <h2>Access Vault</h2>
                <p>This journal is locked. Please enter your PIN to continue.</p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        maxLength={6}
                        className={styles.pinInput}
                        autoFocus
                    />
                    {error && <p className={styles.error}>{error}</p>}
                    <button type="submit" className={styles.unlockButton}>Unlock</button>
                </form>
            </div>
        </div>
    );
}
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../../styles/LockScreen.module.css';

export default function AccessVaultPage() {
    const router = useRouter();
    const [passphrase, setPassphrase] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/access-vault', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ passphrase }),
            });

            if (response.ok) {
                // Set 15-minute persistent expiry
                const expiry = Date.now() + 15 * 60 * 1000;
                localStorage.setItem('vault-unlocked-expiry', expiry.toString());
                
                // Small delay to ensure cookie is settled before reload
                setTimeout(() => {
                    window.location.href = '/diary';
                }, 100);
            } else {
                setError('Invalid Passphrase. Please try again.');
                setPassphrase('');
                setIsLoading(false);
            }
        } catch (err) {
            setError('Connection error. Please try again.');
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.container}>
                <h2>Access Vault</h2>
                <p>This journal is locked. Please enter your passphrase to continue.</p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        className={styles.pinInput}
                        disabled={isLoading}
                        autoFocus
                    />
                    {error && <p className={styles.error}>{error}</p>}
                    <button 
                        type="submit" 
                        className={styles.unlockButton}
                        disabled={isLoading || !passphrase}
                    >
                        {isLoading ? 'Unlocking...' : 'Unlock'}
                    </button>
                </form>
            </div>
        </div>
    );
}
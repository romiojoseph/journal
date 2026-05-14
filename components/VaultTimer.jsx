'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Timer, LockKey, PlusCircle, ShieldCheck } from '@phosphor-icons/react';
import styles from '../styles/VaultTimer.module.css';

export default function VaultTimer({ isPinEnabled }) {
    const router = useRouter();
    const pathname = usePathname();
    const [timeLeft, setTimeLeft] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Skip showing timer on access-vault or security pages
    const isVisible = isPinEnabled &&
        !pathname.startsWith('/access-vault') &&
        !pathname.startsWith('/config/security');

    useEffect(() => {
        if (!isVisible) return;

        const updateTimer = () => {
            const expiryStr = localStorage.getItem('vault-unlocked-expiry');
            if (!expiryStr) {
                setTimeLeft(0);
                return;
            }

            const expiry = parseInt(expiryStr, 10);
            const remaining = Math.max(0, expiry - Date.now());
            setTimeLeft(remaining);

            if (remaining <= 0) {
                localStorage.removeItem('vault-unlocked-expiry');
                router.push('/access-vault');
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [isVisible, router]);

    // Handle clicks outside to close popover
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isVisible) return null;

    const minutes = Math.floor(timeLeft / 60000);
    const seconds = Math.floor((timeLeft % 60000) / 1000);
    const isAlert = timeLeft > 0 && timeLeft <= 60000;

    const handleExtend = async (minutes) => {
        try {
            const currentExpiryStr = localStorage.getItem('vault-unlocked-expiry');
            const currentExpiry = currentExpiryStr ? parseInt(currentExpiryStr, 10) : Date.now();
            const baseTime = Math.max(Date.now(), currentExpiry);
            const newExpiry = baseTime + minutes * 60 * 1000;
            const newMaxAge = Math.ceil((newExpiry - Date.now()) / 1000);

            const response = await fetch('/api/extend-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ maxAge: newMaxAge })
            });

            if (response.ok) {
                localStorage.setItem('vault-unlocked-expiry', newExpiry.toString());
                setIsOpen(false);
            }
        } catch (error) {
            console.error('Failed to extend session:', error);
        }
    };

    const handleLock = async () => {
        try {
            await fetch('/api/lock-vault', { method: 'POST' });
            localStorage.removeItem('vault-unlocked-expiry');
            window.location.href = '/access-vault';
        } catch (error) {
            console.error('Failed to lock vault:', error);
            window.location.href = '/access-vault';
        }
    };

    return (
        <div className={styles.timerContainer} ref={containerRef}>
            {isOpen && (
                <div className={styles.popover}>
                    <div className={styles.popoverActions}>
                        <button className={`${styles.actionButton} ${styles.lockButton}`} onClick={handleLock}>
                            <LockKey size={18} weight="fill" />
                            Lock Vault
                        </button>
                        <div className={styles.extendTitle}>
                            Extend Session
                        </div>
                        <div className={styles.extendOptions}>
                            <button className={styles.extendSubButton} onClick={() => handleExtend(5)}>+5 Min</button>
                            <button className={styles.extendSubButton} onClick={() => handleExtend(10)}>+10 Min</button>
                            <button className={styles.extendSubButton} onClick={() => handleExtend(15)}>+15 Min</button>
                            <button className={styles.extendSubButton} onClick={() => handleExtend(30)}>+30 Min</button>
                        </div>
                    </div>
                </div>
            )}

            <button
                className={`${styles.timerButton} ${isAlert ? styles.alert : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                {isAlert ? <ShieldCheck size={18} weight="fill" /> : <Timer size={18} weight="duotone" />}
                <span>{minutes}:{seconds.toString().padStart(2, '0')}</span>
            </button>
        </div>
    );
}

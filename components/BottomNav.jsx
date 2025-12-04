'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { PresentationChart, Notebook, Gear, PlusCircle, LockKey, Key } from "@phosphor-icons/react/dist/ssr";
import styles from '../styles/BottomNav.module.css';

export default function BottomNav({ isPinEnabled }) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLock = async () => {
        try {
            await fetch('/api/lock-vault', { method: 'POST' });
            window.location.href = '/access-vault';
        } catch (error) {
            console.error('Failed to lock vault:', error);
            window.location.href = '/access-vault';
        }
    };

    const handleRedirectToSecurity = () => {
        router.push('/config/security');
    };

    return (
        <nav className={styles.bottomNav}>
            <div className={styles.navLinks}>
                <div className={styles.leftLinks}>
                    <Link href="/diary" className={`${styles.navLink} ${pathname === '/diary' ? styles.active : ''}`}>
                        <Notebook size={28} weight={pathname === '/diary' ? 'fill' : 'regular'} />
                        <span>Diary</span>
                    </Link>
                    <Link href="/foryou" className={`${styles.navLink} ${pathname === '/foryou' ? styles.active : ''}`}>
                        <PresentationChart size={28} weight={pathname === '/foryou' ? 'fill' : 'regular'} />
                        <span>Insights</span>
                    </Link>
                </div>

                <div className={styles.rightLinks}>
                    <Link href="/config" className={`${styles.navLink} ${pathname.startsWith('/config') ? styles.active : ''}`}>
                        <Gear size={28} weight={pathname.startsWith('/config') ? 'fill' : 'regular'} />
                        <span>Config</span>
                    </Link>
                    <button
                        onClick={isPinEnabled ? handleLock : handleRedirectToSecurity}
                        className={styles.navLink}
                    >
                        {isPinEnabled ? (
                            <LockKey size={28} />
                        ) : (
                            <Key size={28} />
                        )}
                        <span>{isPinEnabled ? 'Lock' : 'Setup'}</span>
                    </button>
                </div>
            </div>
            {/* Correct the FAB link to point to the homepage */}
            <Link href="/" className={styles.fab}>
                <PlusCircle size={36} weight="fill" />
            </Link>
        </nav>
    );
}
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { GearSix, Notebook, PresentationChart, PlusCircle, LockKey, Key } from "@phosphor-icons/react/dist/ssr";
import styles from '../styles/SideNav.module.css';

export default function SideNav({ isPinEnabled }) {
    const router = useRouter();
    const pathname = usePathname(); // Get the current path

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
        <nav className={styles.nav}>
            <ul className={styles.navList}>
                <li>
                    <div className={styles.sideHeader}>
                        <Link href="/" className={styles.logoLink}>
                            <Image
                                src="/sidebar-logo.svg"
                                alt="App icon"
                                width={144}
                                height={35}
                                priority
                            />
                        </Link>
                    </div>
                </li>
                <li>
                    {/* Add active state logic */}
                    <Link href="/diary" className={`${styles.navLink} ${pathname === '/diary' ? styles.active : ''}`}>
                        <Notebook size={24} weight={pathname === '/diary' ? 'fill' : 'duotone'} />
                        <span>Diary</span>
                    </Link>
                </li>
                <li>
                    {/* Correct the href and add active state logic */}
                    <Link href="/foryou" className={`${styles.navLink} ${pathname === '/foryou' ? styles.active : ''}`}>
                        <PresentationChart size={24} weight={pathname === '/foryou' ? 'fill' : 'duotone'} />
                        <span>Insights</span>
                    </Link>
                </li>
                <li>
                    {/* Add active state logic using startsWith for all sub-pages */}
                    <Link href="/config" className={`${styles.navLink} ${pathname.startsWith('/config') ? styles.active : ''}`}>
                        <GearSix size={24} weight={pathname.startsWith('/config') ? 'fill' : 'duotone'} />
                        <span>Config</span>
                    </Link>
                </li>
                <li>
                    <button
                        onClick={isPinEnabled ? handleLock : handleRedirectToSecurity}
                        className={styles.navLink}
                        title={isPinEnabled ? 'Lock the application' : 'Go to Security settings to set up a PIN'}
                    >
                        {isPinEnabled ? (
                            <LockKey size={24} weight="duotone" />
                        ) : (
                            <Key size={24} weight="duotone" />
                        )}
                        <span>{isPinEnabled ? 'Lock Vault' : 'Setup Lock'}</span>
                    </button>
                </li>
            </ul>
            {/* Correct the href to point to the homepage */}
            <Link href="/" className={styles.newJournalButton}>
                <PlusCircle size={24} weight="duotone" />
                <span>New Journal</span>
            </Link>
        </nav>
    );
}
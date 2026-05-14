'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { GearSix, Notebook, PresentationChart, PenIcon, LockKey, Key, EnvelopeSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import styles from '../styles/SideNav.module.css';

export default function SideNav({ isPinEnabled }) {
    const router = useRouter();
    const pathname = usePathname(); // Get the current path

    return (
        <nav className={styles.nav}>
            <div className={styles.sideHeader}>
                <Link href="/" className={styles.logoLink}>
                    <Image
                        src="/sidebar-logo.svg"
                        alt="App icon"
                        width={120}
                        height={40}
                        priority
                    />
                </Link>
            </div>
            <ul className={styles.navList}>
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
                    <Link href="/letters" className={`${styles.navLink} ${pathname.startsWith('/letters') ? styles.active : ''}`}>
                        <EnvelopeSimpleIcon size={24} weight={pathname.startsWith('/letters') ? 'fill' : 'duotone'} />
                        <span>Letters</span>
                    </Link>
                </li>
                <li>
                    {/* Add active state logic using startsWith for all sub-pages */}
                    <Link href="/config" className={`${styles.navLink} ${pathname.startsWith('/config') ? styles.active : ''}`}>
                        <GearSix size={24} weight={pathname.startsWith('/config') ? 'fill' : 'duotone'} />
                        <span>Config</span>
                    </Link>
                </li>
                {!isPinEnabled && (
                    <li>
                        <Link href="/config/security" className={styles.navLink}>
                            <Key size={24} weight="duotone" />
                            <span>Setup Lock</span>
                        </Link>
                    </li>
                )}
            </ul>
            {/* Correct the href to point to the homepage */}
            <Link href="/" className={styles.newJournalButton}>
                <PenIcon size={24} weight="duotone" />
                <span>New Journal</span>
            </Link>
        </nav>
    );
}
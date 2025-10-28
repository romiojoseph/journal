'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from '../styles/ConfigPage.module.css';

export default function ConfigLayoutClient({ children }) {
    const pathname = usePathname();

    return (
        <div className={styles.container}>
            <div className={styles.tabNav}>
                <Link
                    href="/config/tags"
                    className={pathname === '/config/tags' ? styles.active : ''}
                >
                    Tags
                </Link>
                <Link
                    href="/config/bookmarks"
                    className={pathname === '/config/bookmarks' ? styles.active : ''}
                >
                    Bookmarks
                </Link>
                <Link
                    href="/config/security"
                    className={pathname === '/config/security' ? styles.active : ''}
                >
                    Security
                </Link>
                <Link
                    href="/config/about"
                    className={pathname === '/config/about' ? styles.active : ''}
                >
                    About
                </Link>
            </div>
            <div className={styles.tabContent}>
                {children}
            </div>
        </div>
    );
}
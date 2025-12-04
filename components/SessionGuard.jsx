'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function SessionGuard() {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // List of public paths that don't require locking
        const publicPaths = ['/access-vault'];

        // If we are on a public path, do nothing
        if (publicPaths.some(p => pathname.startsWith(p))) {
            return;
        }

        // Check if the session is valid in sessionStorage (cleared on tab close)
        const isSessionValid = sessionStorage.getItem('vault-unlocked');

        if (!isSessionValid) {
            // If session is invalid (tab closed/reopened), force lock
            // We call the API to clear the cookie as well
            fetch('/api/lock-vault', { method: 'POST' })
                .then(() => {
                    router.push('/access-vault');
                })
                .catch(() => {
                    router.push('/access-vault');
                });
        }
    }, [pathname, router]);

    return null;
}

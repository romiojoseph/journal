'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function SessionGuard({ isPinEnabled }) {
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!isPinEnabled || pathname.startsWith('/access-vault') || pathname.startsWith('/config/security')) {
            return;
        }

        const checkSession = async () => {
            const expiryStr = localStorage.getItem('vault-unlocked-expiry');
            const expiry = expiryStr ? parseInt(expiryStr, 10) : 0;
            const now = Date.now();
            
            if (expiry > 0 && now >= expiry) {
                localStorage.removeItem('vault-unlocked-expiry');
                router.push('/access-vault');
                return;
            }

            // Periodic server-side check to ensure encryption key is still alive
            try {
                const res = await fetch('/api/check-session');
                if (res.status === 401) {
                    localStorage.removeItem('vault-unlocked-expiry');
                    router.push('/access-vault');
                }
            } catch (err) {
                console.error('Session check failed', err);
            }
        };

        checkSession();
        const interval = setInterval(checkSession, 10000); // Background check every 10s

        return () => clearInterval(interval);
    }, [isPinEnabled, router, pathname]);

    return null;
}

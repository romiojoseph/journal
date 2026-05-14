'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function NewLetterPage() {
    const router = useRouter();
    const [error, setError] = useState('');
    const hasFetched = useRef(false);

    useEffect(() => {
        if (hasFetched.current) return;
        hasFetched.current = true;

        async function createAndRedirect() {
            try {
                const res = await fetch('/api/letters', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: 'Untitled', body: '' }),
                });

                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    const msg = typeof data?.error === 'string' ? data.error : 'Failed to create letter.';
                    throw new Error(msg);
                }

                if (data?.letterId) {
                    router.replace(`/letters/${data.letterId}`);
                }
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to create letter.');
            }
        }

        createAndRedirect();
    }, [router]);

    if (error) {
        return (
            <div style={{ padding: 24 }}>
                <h1>Couldn’t create a new letter</h1>
                <p style={{ opacity: 0.8 }}>{error}</p>
            </div>
        );
    }

    return (
        <div style={{ padding: 24 }}>
            <h1>Creating your letter…</h1>
            <p style={{ opacity: 0.8 }}>Just a moment.</p>
        </div>
    );
}

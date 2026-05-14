'use client';

import { useState, useEffect } from 'react';

export default function FormattedDate({ dateString }) {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsClient(true);
    }, []);

    if (!isClient) {
        return <>...</>;
    }

    // Handle SQLite format (YYYY-MM-DD HH:MM:SS) vs ISO format
    // SQLite timestamps from this app are in UTC, so we append Z if missing.
    const normalizedDateString = dateString.includes('T') || dateString.endsWith('Z') 
        ? dateString 
        : dateString.replace(' ', 'T') + 'Z';
    
    const date = new Date(normalizedDateString);

    const dateOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    };

    const timeOptions = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    };

    const formattedDate = `${date.toLocaleDateString('en-US', dateOptions)} at ${date.toLocaleTimeString('en-US', timeOptions)}`;

    return (
        <>{formattedDate}</>
    );
}
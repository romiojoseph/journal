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

    const date = new Date(dateString + 'Z');

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
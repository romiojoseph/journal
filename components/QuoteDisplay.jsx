'use client';

import { useState, useEffect } from 'react';
import { Quotes } from '@phosphor-icons/react';
import styles from '../styles/QuoteDisplay.module.css';
import LoadingSpinner from './LoadingSpinner';

export default function QuoteDisplay({ mood }) {
    const [quote, setQuote] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchQuote = async () => {
            try {
                const response = await fetch(`/api/quotes?mood=${encodeURIComponent(mood)}`);
                if (response.ok) {
                    const data = await response.json();
                    setQuote(data);
                }
            } catch (error) {
                console.error('Failed to fetch quote:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchQuote();
    }, [mood]);

    if (isLoading) return <LoadingSpinner message="Loading quote..." />;
    if (!quote) return null;

    return (
        <div className={styles.quoteWrapper}>
            <Quotes size={32} weight="fill" className={styles.quoteIcon} />
            <blockquote className={styles.quoteText}>
                "{quote.quote}"
            </blockquote>
            <cite className={styles.quoteAuthor}>— {quote.author}</cite>
        </div>
    );
}

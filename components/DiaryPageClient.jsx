'use client';

import { useState, useMemo, useEffect } from 'react';
import JournalCard from './JournalCard';
import FilterBar from './FilterBar';
import styles from '../styles/Diary.module.css';
import { LineVertical } from '@phosphor-icons/react';

export default function DiaryPageClient({ initialJournals, moodData, allTags }) {
    const [journals, setJournals] = useState(initialJournals);

    useEffect(() => {
        setJournals(initialJournals);
    }, [initialJournals]);

    const [filters, setFilters] = useState({
        searchTerm: '',
        moods: [],
        connectors: [],
        dateRange: [null, null],
    });

    const [visibleCount, setVisibleCount] = useState(50);

    const filteredJournals = useMemo(() => {
        return journals.filter(journal => {
            const { searchTerm, moods, connectors, dateRange } = filters;
            const lowerCaseSearch = searchTerm.toLowerCase();
            if (searchTerm && !journal.content.toLowerCase().includes(lowerCaseSearch) && !(journal.follow_up_content && journal.follow_up_content.toLowerCase().includes(lowerCaseSearch))) {
                return false;
            }
            const [startDate, endDate] = dateRange;
            if (startDate || endDate) {
                const journalDate = new Date(journal.createdAt);
                const start = startDate ? new Date(startDate) : null;
                const end = endDate ? new Date(endDate) : null;
                if (start) start.setHours(0, 0, 0, 0);
                if (end) end.setHours(23, 59, 59, 999);
                if (start && journalDate < start) return false;
                if (end && journalDate > end) return false;
            }
            if (moods.length > 0) {
                const journalMoodNames = journal.tags.filter(t => t.type === 'mood').map(t => t.name);
                const selectedMoodValues = moods.map(m => m.value);
                if (!selectedMoodValues.every(val => journalMoodNames.includes(val))) {
                    return false;
                }
            }
            if (connectors.length > 0) {
                const journalConnectorNames = journal.tags.filter(t => t.type !== 'mood').map(t => t.name);
                const selectedConnectorValues = connectors.map(c => c.value);
                if (!selectedConnectorValues.every(val => journalConnectorNames.includes(val))) {
                    return false;
                }
            }
            return true;
        });
    }, [journals, filters]);

    // Reset visible count when filters change to keep initial load small
    useEffect(() => {
        setVisibleCount(50);
    }, [filters]);

    // Intersection Observer for infinite scroll
    useEffect(() => {
        if (visibleCount >= filteredJournals.length) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setVisibleCount(prev => prev + 50);
            }
        }, { threshold: 0.1 });

        const sentinel = document.getElementById('scroll-sentinel');
        if (sentinel) observer.observe(sentinel);

        return () => observer.disconnect();
    }, [visibleCount, filteredJournals.length]);

    const displayedJournals = useMemo(() => {
        return filteredJournals.slice(0, visibleCount);
    }, [filteredJournals, visibleCount]);

    return (
        <div className={styles.container}>
            <div className={`diary-page-wrapper ${styles.diaryTimeline}`}>
                <FilterBar onFilterChange={setFilters} allTags={allTags} activeFilters={filters} />
                {displayedJournals.length > 0 ? (
                    <div className={styles.journalList}>
                        {displayedJournals.map(journal => (
                            <JournalCard key={journal.id} journal={journal} moodData={moodData} />
                        ))}
                        {visibleCount < filteredJournals.length && (
                            <div id="scroll-sentinel" className={styles.sentinel}>
                                <div className={styles.loader}></div>
                            </div>
                        )}
                    </div>
                ) : (
                    <p className={styles.emptyMessage}>
                        <LineVertical size={32} weight="duotone" />There&apos;s nothing to show.
                    </p>
                )}
            </div>
        </div>
    );
}
'use client';

import { useState, useMemo } from 'react';
import JournalCard from './JournalCard';
import FilterBar from './FilterBar';
import styles from '../styles/Diary.module.css';
import { LineVertical } from '@phosphor-icons/react';

export default function DiaryPageClient({ initialJournals, moodData, allTags }) {
    const [journals] = useState(initialJournals);
    const [filters, setFilters] = useState({
        searchTerm: '',
        moods: [],
        connectors: [],
        dateRange: [null, null],
    });

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
                if (startDate) startDate.setHours(0, 0, 0, 0);
                if (endDate) endDate.setHours(23, 59, 59, 999);
                if (startDate && journalDate < startDate) return false;
                if (endDate && journalDate > endDate) return false;
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

    return (
        <div className={styles.container}>
            {/* --- THIS IS THE CHANGE --- */}
            <div className={styles.diaryTimeline}>
                <FilterBar onFilterChange={setFilters} allTags={allTags} activeFilters={filters} />
                <h1>Your Journals</h1>
                {filteredJournals.length > 0 ? (
                    <div className={styles.journalList}>
                        {filteredJournals.map(journal => (
                            <JournalCard key={journal.id} journal={journal} moodData={moodData} />
                        ))}
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
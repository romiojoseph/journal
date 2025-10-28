'use client';

import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import dynamic from 'next/dynamic';
import styles from '../styles/FilterBar.module.css';

const DynamicMultiSelectFilter = dynamic(
    () => import('./MultiSelectFilter'),
    { ssr: false, loading: () => <div className={styles.selectPlaceholder}></div> }
);

// The `onApply` function is now passed directly to the modal actions, so it's removed from props here.
export default function FilterModalContent({ currentFilters, allTags, onStateChange }) {
    const [moods, setMoods] = useState(currentFilters.moods);
    const [connectors, setConnectors] = useState(currentFilters.connectors);
    const [startDate, setStartDate] = useState(currentFilters.dateRange[0]);
    const [endDate, setEndDate] = useState(currentFilters.dateRange[1]);

    // This effect calls the parent `onStateChange` whenever the internal draft state changes.
    useEffect(() => {
        onStateChange({
            moods,
            connectors,
            dateRange: [startDate, endDate],
        });
    }, [moods, connectors, startDate, endDate, onStateChange]);

    return (
        <div className={styles.modalContent}>
            <div className={styles.modalSection}>
                <label>Filter by Moods</label>
                <DynamicMultiSelectFilter
                    options={allTags.moods.map(mood => ({
                        label: mood.name,
                        options: mood.tags.map(tag => ({ value: tag, label: tag, type: 'mood' }))
                    }))}
                    value={moods}
                    onChange={setMoods}
                    placeholder="Select one or more moods..."
                />
            </div>
            <div className={styles.modalSection}>
                <label>Filter by Connectors</label>
                <DynamicMultiSelectFilter
                    options={[
                        { label: 'Activities', options: allTags.activities.map(tag => ({ value: tag, label: tag, type: 'activity' })) },
                        { label: 'People', options: allTags.people.map(tag => ({ value: tag, label: tag, type: 'people' })) },
                        { label: 'Places', options: allTags.places.map(tag => ({ value: tag, label: tag, type: 'place' })) },
                    ]}
                    value={connectors}
                    onChange={setConnectors}
                    placeholder="Select one or more connectors..."
                />
            </div>
            <div className={styles.modalSection}>
                <label>Filter by Date Range</label>
                <DatePicker
                    selectsRange={true}
                    startDate={startDate}
                    endDate={endDate}
                    onChange={(update) => {
                        setStartDate(update[0]);
                        setEndDate(update[1]);
                    }}
                    isClearable={true}
                    placeholderText="Select a start and end date"
                    className={styles.datePicker}
                    wrapperClassName={styles.datePickerWrapper}
                />
            </div>
        </div>
    );
}
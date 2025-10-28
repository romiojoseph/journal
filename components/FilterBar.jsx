'use client';

import { useState, useMemo, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import styles from '../styles/FilterBar.module.css';
import { MagnifyingGlass, Funnel, X } from '@phosphor-icons/react';
import dynamic from 'next/dynamic';
import { useModal } from '../context/ModalContext';
import FilterModalContent from './FilterModalContent';

export default function FilterBar({ activeFilters, onFilterChange, allTags }) {
    const { showModal, hideModal } = useModal();
    const [searchTerm, setSearchTerm] = useState(activeFilters.searchTerm);

    // This useEffect is to sync the parent's "clear" action to our local search state.
    // It's a valid exception to the ESLint rule.
    useEffect(() => {
        if (activeFilters.searchTerm === '') {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSearchTerm('');
        }
    }, [activeFilters.searchTerm]);

    // This useEffect handles debouncing the search input.
    useEffect(() => {
        const handler = setTimeout(() => {
            if (searchTerm !== activeFilters.searchTerm) {
                onFilterChange(prev => ({ ...prev, searchTerm }));
            }
        }, 300);
        return () => clearTimeout(handler);
    }, [searchTerm, activeFilters.searchTerm, onFilterChange]);

    const openFilterModal = () => {
        let draftFilters = { ...activeFilters };

        const handleApply = () => {
            onFilterChange(prev => ({
                ...prev, // Keep existing search term from parent
                ...draftFilters // Apply new filters from modal
            }));
            hideModal();
        };

        const handleClearInModal = () => {
            onFilterChange({
                searchTerm: activeFilters.searchTerm, // Keep the current search term
                moods: [],
                connectors: [],
                dateRange: [null, null],
            });
            hideModal();
        };

        showModal({
            title: 'Advanced Filters',
            isDismissable: true,
            content: (
                <FilterModalContent
                    currentFilters={activeFilters}
                    allTags={allTags}
                    onStateChange={(newDraft) => {
                        draftFilters = newDraft;
                    }}
                />
            ),
            actions: [
                { label: 'Clear Filters', onClick: handleClearInModal, variant: 'default' },
                { label: 'Apply Filters', onClick: handleApply, variant: 'primary' },
            ],
        });
    };

    const hasActiveFilters =
        activeFilters.moods.length > 0 ||
        activeFilters.connectors.length > 0 ||
        activeFilters.dateRange[0] ||
        activeFilters.dateRange[1];

    return (
        <div className={styles.filterBar}>
            <div className={styles.searchContainer}>
                <MagnifyingGlass size={20} />
                <input
                    type="text"
                    placeholder="Search journals..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className={styles.filters}>
                <button onClick={openFilterModal} className={`${styles.filterButton} ${hasActiveFilters ? styles.activeFilter : ''}`}>
                    <Funnel size={20} weight="bold" />
                    <span>Filters</span>
                    {hasActiveFilters && <div className={styles.activeDot}></div>}
                </button>
            </div>
        </div>
    );
}
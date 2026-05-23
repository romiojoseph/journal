'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../styles/NewJournal.module.css';
import TagPill from './TagPill';
import { useModal } from '../context/ModalContext';
import { useToast } from '../context/ToastContext';
import QuotedJournalPreview from './QuotedJournalPreview';
import QuotedFollowUpPreview from './QuotedFollowUpPreview';
import { CaretDown, AsteriskIcon, PersonSimpleBikeIcon, Users, MapTrifoldIcon, CalendarPlus, FloppyDisk, MagnifyingGlassIcon } from '@phosphor-icons/react';
import { getMoodColor } from '../lib/mood-utils';

const typeToCategoryMap = { activity: 'activities', people: 'people', place: 'places' };
const otherCategories = [{ singular: 'activity', plural: 'activities' }, { singular: 'people', plural: 'people' }, { singular: 'place', plural: 'places' }];

export default function JournalForm({ initialData = null, quotedJournal: initialQuotedJournal = null, quotedFollowUp: initialQuotedFollowUp = null, initialTags = { moods: [], activities: [], people: [], places: [] } }) {
    const router = useRouter();
    const { showAlert } = useModal();
    const { showToast } = useToast();
    const isEditMode = initialData !== null;

    const getTagColor = (tag) => {
        if (tag.type !== 'mood') return null;
        return getMoodColor(tag.name, initialTags.moods);
    };

    const storageKey = isEditMode ? `unsaved-journal-${initialData.id}` : 'unsaved-new-journal';
    const [isSaving, setIsSaving] = useState(false);
    const [isDraftLoaded, setIsDraftLoaded] = useState(false);
    const [saveIndicator, setSaveIndicator] = useState('');
    const [isClient, setIsClient] = useState(false);

    const [quotedJournal, setQuotedJournal] = useState(initialQuotedJournal || initialData?.quotedJournal || null);
    const [quotedFollowUp, setQuotedFollowUp] = useState(initialQuotedFollowUp || initialData?.quotedFollowUp || null);
    const [isQuoteDetached, setIsQuoteDetached] = useState(false);

    const handleDetachQuote = () => {
        setQuotedJournal(null);
        setQuotedFollowUp(null);
        setIsQuoteDetached(true);
    };

    const [content, setContent] = useState(initialData?.content || '');

    const [selectedTags, setSelectedTags] = useState(() =>
        initialData?.tags.map(tag => ({ ...tag, color: getTagColor(tag) })) || []
    );

    // Track last saved state for accurate "unsaved changes" detection
    const savedContentRef = useRef(initialData?.content || '');
    const savedTagsRef = useRef(JSON.stringify(initialData?.tags || []));

    const [openAccordions, setOpenAccordions] = useState(['moods']);
    const [activeMoodTab, setActiveMoodTab] = useState(initialTags.moods[0]?.name || '');
    const [availableTags, setAvailableTags] = useState(() => {
        const selectedTagNames = new Set((initialData?.tags || []).map(t => t.name));
        return {
            moods: initialTags.moods.map(mood => ({ ...mood, tags: mood.tags.filter(tag => !selectedTagNames.has(tag)) })),
            activities: initialTags.activities.filter(tag => !selectedTagNames.has(tag)),
            people: initialTags.people.filter(tag => !selectedTagNames.has(tag)),
            places: initialTags.places.filter(tag => !selectedTagNames.has(tag)),
        };
    });

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsClient(true);
    }, []);

    // One-time cleanup for legacy localStorage drafts
    useEffect(() => {
        localStorage.removeItem(storageKey);
        if (isEditMode) {
            localStorage.removeItem(`unsaved-follow-up-${initialData.id}`);
        }
    }, [isEditMode, initialData?.id, storageKey]);

    // Load draft for new entries only - DB ONLY
    useEffect(() => {
        if (!isEditMode && !isDraftLoaded) {
            fetch('/api/journals/draft')
                .then(async (res) => {
                    if (res.status === 403 || res.status === 401) {
                        // Key missing or session invalid
                        return { error: 'Invalid session' };
                    }
                    return res.json();
                })
                .then(data => {
                    if (data.content) setContent(data.content);
                    if (data.tags && data.tags.length > 0) {
                        const loadedTags = data.tags.map(tag => ({ ...tag, color: getTagColor(tag) }));
                        setSelectedTags(loadedTags);
                        
                        const selectedTagNames = new Set(loadedTags.map(t => t.name));
                        setAvailableTags(prev => ({
                            moods: initialTags.moods.map(mood => ({ ...mood, tags: mood.tags.filter(tag => !selectedTagNames.has(tag)) })),
                            activities: initialTags.activities.filter(tag => !selectedTagNames.has(tag)),
                            people: initialTags.people.filter(tag => !selectedTagNames.has(tag)),
                            places: initialTags.places.filter(tag => !selectedTagNames.has(tag)),
                        }));
                    }
                    setIsDraftLoaded(true);
                })
                .catch(err => {
                    console.error('Failed to load journal draft', err);
                    setIsDraftLoaded(true); // Stop trying but allow typing
                });
        } else if (isEditMode) {
            setIsDraftLoaded(true);
        }
    }, [isEditMode, isDraftLoaded]);

    const handleSave = useCallback(async (showDoneIndicator = false, showToastAlert = false) => {
        setIsSaving(true);
        if (showDoneIndicator) setSaveIndicator('saving');

        const apiEndpoint = isEditMode ? `/api/journals/${initialData.id}` : '/api/journals/draft';
        const method = isEditMode ? 'PUT' : 'POST';

        const cleanedTags = selectedTags.map(({ color, ...rest }) => rest);

        try {
            const res = await fetch(apiEndpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, tags: cleanedTags })
            });

            if (res.status === 403) {
                console.warn('Journal save failed: Key missing');
                setSaveIndicator('');
                return;
            }

            if (res.ok) {
                savedContentRef.current = content;
                savedTagsRef.current = JSON.stringify(cleanedTags);
                
                if (showDoneIndicator) {
                    setSaveIndicator('saved');
                    setTimeout(() => setSaveIndicator(''), 2000);
                } else {
                    setSaveIndicator('');
                }

                if (showToastAlert) {
                    showToast({ title: 'Saved', message: 'Journal saved successfully.', type: 'success' });
                }
            } else {
                setSaveIndicator('');
                if (showToastAlert) showToast({ title: 'Error', message: 'Failed to save journal.', type: 'error' });
            }
        } catch (err) {
            console.error('Save failed', err);
            setSaveIndicator('');
            if (showToastAlert) showToast({ title: 'Error', message: 'Failed to save journal.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    }, [isEditMode, initialData?.id, content, selectedTags, showToast]);

    // Auto-save every 5 seconds (DB ONLY)
    useEffect(() => {
        if (!isDraftLoaded) return;

        const interval = setInterval(() => {
            const currentTagsJson = JSON.stringify(selectedTags.map(({ color, ...rest }) => rest));
            const hasChanges = content !== savedContentRef.current || currentTagsJson !== savedTagsRef.current;

            if (hasChanges && !isSaving) {
                handleSave(true, false); // Show indicator, but NO toast for auto-save
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [content, selectedTags, isDraftLoaded, isSaving, handleSave]);

    // Ctrl+S / Cmd+S to save
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave(true, true);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleSave]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedTags.filter(t => t.type === 'mood').length === 0) {
            showToast({ title: 'Validation Error', message: 'Please select at least one mood tag.', type: 'warning' });
            return;
        }

        const apiEndpoint = isEditMode ? `/api/journals/${initialData.id}` : '/api/journals/create';
        const method = isEditMode ? 'PUT' : 'POST';

        const payload = { content, tags: selectedTags.map(({ color, ...rest }) => rest) };
        if (!isEditMode && quotedJournal) {
            payload.quotedJournalId = quotedJournal.id;
        }
        if (!isEditMode && quotedFollowUp) {
            payload.quotedFollowUpId = quotedFollowUp.id;
        }
        if (isEditMode && isQuoteDetached) {
            payload.detachQuote = true;
        }

        const response = await fetch(apiEndpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

        if (response.ok) {
            localStorage.removeItem(storageKey);
            if (isEditMode) {
                localStorage.removeItem(`unsaved-follow-up-${initialData.id}`);
            } else {
                // Clear DB draft for new entries
                fetch('/api/journals/draft', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ content: '', tags: [] }) 
                });
            }
            const result = await response.json();
            showToast({
                title: isEditMode ? 'Journal Updated' : 'Journal Added',
                message: isEditMode ? 'Your journal has been updated.' : 'Your new entry is safe in your diary.',
                type: 'success'
            });
            router.push(isEditMode ? `/journal/${result.journalId}` : '/diary');
            router.refresh();
        } else if (response.status === 401) {
            // Session expired
            localStorage.removeItem('vault-unlocked-expiry');
            router.push('/access-vault');
        } else {
            const data = await response.json();
            showToast({ title: 'Save Error', message: `Failed to save journal: ${data.error}`, type: 'error' });
        }
    };

    const { wordCount, charCount } = useMemo(() => {
        const trimmedContent = content.trim();
        const words = trimmedContent ? trimmedContent.split(/\s+/).filter(Boolean) : [];
        return { wordCount: words.length, charCount: content.length };
    }, [content]);

    const hasMood = useMemo(() => selectedTags.some(t => t.type === 'mood'), [selectedTags]);
    const hasContent = useMemo(() => content.trim().length > 0, [content]);
    const hasAnyTags = useMemo(() => selectedTags.length > 0, [selectedTags]);

    const { isSubmitDisabled, buttonLabel } = useMemo(() => {
        if (!hasAnyTags && !hasContent) {
            return { isSubmitDisabled: true, buttonLabel: isEditMode ? 'Update Entry' : 'Add to Diary' };
        }
        if (!hasMood) {
            return { isSubmitDisabled: true, buttonLabel: 'Select a mood to save' };
        }
        if (hasMood && !hasContent) {
            return { isSubmitDisabled: false, buttonLabel: 'Check In' };
        }
        return { isSubmitDisabled: false, buttonLabel: isEditMode ? 'Update Entry' : 'Add to Diary' };
    }, [hasMood, hasContent, hasAnyTags, isEditMode]);

    const handleTagSelect = (tagName, type, color = null) => {
        setSelectedTags(prev => [...prev, { name: tagName, type, color }]);
        setAvailableTags(prev => {
            const newAvailable = { ...prev };
            if (type === 'mood') {
                newAvailable.moods = newAvailable.moods.map(mood => ({ ...mood, tags: mood.tags.filter(t => t !== tagName) }));
            } else {
                newAvailable[typeToCategoryMap[type]] = newAvailable[typeToCategoryMap[type]].filter(t => t !== tagName);
            }
            return newAvailable;
        });
    };

    const [searchQuery, setSearchQuery] = useState('');

    const filteredTags = useMemo(() => {
        if (!searchQuery.trim()) return availableTags;
        const query = searchQuery.toLowerCase();
        return {
            moods: availableTags.moods.map(mood => ({
                ...mood,
                tags: mood.tags.filter(tag => tag.toLowerCase().includes(query))
            })).filter(mood => mood.tags.length > 0 || mood.name.toLowerCase().includes(query)),
            activities: availableTags.activities.filter(tag => tag.toLowerCase().includes(query)),
            people: availableTags.people.filter(tag => tag.toLowerCase().includes(query)),
            places: availableTags.places.filter(tag => tag.toLowerCase().includes(query)),
        };
    }, [availableTags, searchQuery]);

    // Open all accordions when searching, close all when cleared
    useEffect(() => {
        if (searchQuery.trim()) {
            setOpenAccordions(['moods', 'activities', 'people', 'places']);
            const moodWithResults = filteredTags.moods.find(m => m.tags.length > 0);
            if (moodWithResults) {
                const currentTabHasResults = filteredTags.moods.find(m => m.name === activeMoodTab)?.tags.length > 0;
                if (!currentTabHasResults) {
                    setActiveMoodTab(moodWithResults.name);
                }
            }
        } else {
            setOpenAccordions([]);
        }
    }, [searchQuery, filteredTags, activeMoodTab]);

    const handleTagRemove = (tagToRemove) => {
        setSelectedTags(prev => prev.filter(t => t.name !== tagToRemove.name));
        setAvailableTags(prev => {
            const newAvailable = { ...prev };
            if (tagToRemove.type === 'mood') {
                newAvailable.moods = newAvailable.moods.map(mood => {
                    const originalMood = initialTags.moods.find(m => m.tags.includes(tagToRemove.name));
                    if (mood.name === originalMood?.name) {
                        return {
                            ...mood,
                            tags: [...mood.tags, tagToRemove.name].sort((a, b) => a.localeCompare(b))
                        };
                    }
                    return mood;
                });
            } else {
                newAvailable[typeToCategoryMap[tagToRemove.type]] = [...newAvailable[typeToCategoryMap[tagToRemove.type]], tagToRemove.name].sort((a, b) => a.localeCompare(b));
            }
            return newAvailable;
        });
    };

    return (
        <div className={`${styles.container} new-journal-wrapper`}>
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.contentArea}>
                    <h1>{isEditMode ? 'Edit your journal' : 'What’s on your mind'}</h1>
                    <div className={styles.editor}>
                        <div className={styles.selectedTagsContainer}>
                            {selectedTags.length > 0 ? (
                                selectedTags.map(tag => (
                                    <TagPill key={`${tag.type}-${tag.name}`} text={tag.name} color={tag.color} onRemove={() => handleTagRemove(tag)} />
                                ))
                            ) : (
                                <p className={styles.placeholderText}>Connect your journal with tags for insights</p>
                            )}
                        </div>
                        <textarea
                            className={styles.textarea}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Get your thoughts out..."
                        />
                        <QuotedJournalPreview
                            journal={quotedJournal}
                            onDetach={handleDetachQuote}
                        />
                        <QuotedFollowUpPreview
                            followUp={quotedFollowUp}
                            onDetach={handleDetachQuote}
                        />
                    </div>

                    <div className={styles.formFooter}>
                        <div className={styles.charCount}>
                            {isClient ? `${charCount} characters, ${wordCount} words` : '...'}
                            {saveIndicator === 'saving' && <span className={styles.saveStatus}> &middot; Saving&hellip;</span>}
                            {saveIndicator === 'saved' && <span className={`${styles.saveStatus} ${styles.saveStatusDone}`}> &middot; Saved</span>}
                        </div>
                        <button type="submit" className={styles.saveButton} disabled={isSubmitDisabled}>
                            {isClient && buttonLabel === 'Check In' ? (
                                <>
                                    <AsteriskIcon size={28} weight="fill" />
                                    Check In
                                </>
                            ) : isEditMode ? (
                                <>
                                    <FloppyDisk size={28} weight="fill" />
                                    Update Entry
                                </>
                            ) : isClient ? (
                                <>
                                    <CalendarPlus size={28} weight="fill" />
                                    {buttonLabel}
                                </>
                            ) : (
                                <>
                                    <CalendarPlus size={28} weight="fill" />
                                    Add to Diary
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <aside className={styles.sidebar}>
                    <div className={styles.searchContainer}>
                        <div className={styles.searchInputWrapper}>
                            <MagnifyingGlassIcon size={18} weight="duotone" className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Search tags..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={styles.searchInput}
                            />
                            {searchQuery && (
                                <button type="button" onClick={() => setSearchQuery('')} className={styles.clearSearch}>×</button>
                            )}
                        </div>
                    </div>

                    <div className={styles.tagSections}>
                        {(searchQuery === '' || filteredTags.moods.length > 0) && (
                            <div className={styles.accordionItem}>
                                <button type="button" className={styles.accordionHeader} onClick={() => setOpenAccordions(prev => prev.includes('moods') ? prev.filter(a => a !== 'moods') : [...prev, 'moods'])}>
                                    <div className={styles.headerLeft}>
                                        <AsteriskIcon size={24} weight="duotone" />
                                        <span>Moods</span>
                                    </div>
                                    <div className={styles.headerRight}>
                                        <span className={styles.requirementText}>Required</span>
                                        <CaretDown size={20} className={openAccordions.includes('moods') ? styles.caretOpen : ''} />
                                    </div>
                                </button>
                                {openAccordions.includes('moods') && (
                                    <div className={styles.accordionContent}>
                                        <div className={styles.moodTabs}>
                                            {(searchQuery === '' ? availableTags.moods : filteredTags.moods).map(mood => (
                                                <button type="button" key={mood.name} onClick={() => setActiveMoodTab(mood.name)} className={activeMoodTab === mood.name ? styles.activeTab : ''}>
                                                    {mood.name}
                                                </button>
                                            ))}
                                        </div>
                                        <div className={styles.tagList}>
                                            {(searchQuery === '' ? availableTags.moods : filteredTags.moods).find(m => m.name === activeMoodTab)?.tags.map(tag => (
                                                <button type="button" key={tag} className={styles.tagButton} onClick={() => handleTagSelect(tag, 'mood', availableTags.moods.find(m => m.name === activeMoodTab).color)}>
                                                    {tag}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {otherCategories.map(({ singular, plural }) => {
                            const tagsToShow = searchQuery === '' ? availableTags[plural] : filteredTags[plural];
                            if (searchQuery !== '' && tagsToShow.length === 0) return null;

                            return (
                                <div key={plural} className={styles.accordionItem}>
                                    <button type="button" className={styles.accordionHeader} onClick={() => setOpenAccordions(prev => prev.includes(plural) ? prev.filter(a => a !== plural) : [...prev, plural])}>
                                        <div className={styles.headerLeft}>
                                            {plural === 'activities' && <PersonSimpleBikeIcon size={24} weight="duotone" />}
                                            {plural === 'people' && <Users size={24} weight="duotone" />}
                                            {plural === 'places' && <MapTrifoldIcon size={24} weight="duotone" />}
                                            <span>{plural.charAt(0).toUpperCase() + plural.slice(1)}</span>
                                        </div>
                                        <div className={styles.headerRight}>
                                            <span className={styles.requirementText}>Optional</span>
                                            <CaretDown size={20} className={openAccordions.includes(plural) ? styles.caretOpen : ''} />
                                        </div>
                                    </button>
                                    {openAccordions.includes(plural) && (
                                        <div className={styles.accordionContent}>
                                            <div className={styles.tagList}>
                                                {tagsToShow.map(tag => (
                                                    <button type="button" key={tag} className={styles.tagButton} onClick={() => handleTagSelect(tag, singular)}>
                                                        {tag}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </aside>
            </form>
        </div>
    );
}

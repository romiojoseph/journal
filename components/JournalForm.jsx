'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../styles/NewJournal.module.css';
import TagPill from './TagPill';
import { useModal } from '../context/ModalContext';
import QuotedJournalPreview from './QuotedJournalPreview';
import { CaretDown, YinYang, CirclesThree, Users, Island, CalendarPlus, FloppyDisk } from '@phosphor-icons/react';

const typeToCategoryMap = { activity: 'activities', people: 'people', place: 'places' };
const otherCategories = [{ singular: 'activity', plural: 'activities' }, { singular: 'people', plural: 'people' }, { singular: 'place', plural: 'places' }];

export default function JournalForm({ initialData = null, quotedJournal: initialQuotedJournal = null, initialTags = { moods: [], activities: [], people: [], places: [] } }) {
    const router = useRouter();
    const { showAlert } = useModal();
    const isEditMode = initialData !== null;

    const getTagColor = (tag) => {
        if (tag.type !== 'mood') return null;
        for (const mood of initialTags.moods) {
            if (mood.tags.includes(tag.name)) return mood.color;
        }
        return null;
    };

    const storageKey = isEditMode ? `unsaved-journal-${initialData.id}` : 'unsaved-new-journal';
    const [isClient, setIsClient] = useState(false);

    const [quotedJournal, setQuotedJournal] = useState(initialQuotedJournal || initialData?.quotedJournal || null);
    const [isQuoteDetached, setIsQuoteDetached] = useState(false);

    const handleDetachQuote = () => {
        setQuotedJournal(null);
        setIsQuoteDetached(true);
    };

    const [content, setContent] = useState(() => {
        if (typeof window !== 'undefined') {
            const savedContent = localStorage.getItem(storageKey);
            if (savedContent) return savedContent;
        }
        return initialData?.content || '';
    });

    const [selectedTags, setSelectedTags] = useState(() =>
        initialData?.tags.map(tag => ({ ...tag, color: getTagColor(tag) })) || []
    );
    const [openAccordion, setOpenAccordion] = useState('moods');
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

    useEffect(() => {
        localStorage.setItem(storageKey, content);
    }, [content, storageKey]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) return showAlert({ title: 'Validation Error', message: 'Journal content cannot be empty.' });
        if (selectedTags.filter(t => t.type === 'mood').length === 0) return showAlert({ title: 'Validation Error', message: 'Please select at least one mood tag.' });

        const apiEndpoint = isEditMode ? `/api/journals/${initialData.id}` : '/api/journals/create';
        const method = isEditMode ? 'PUT' : 'POST';

        const payload = { content, tags: selectedTags.map(({ color, ...rest }) => rest) };
        if (!isEditMode && quotedJournal) {
            payload.quotedJournalId = quotedJournal.id;
        }
        if (isEditMode && isQuoteDetached) {
            payload.detachQuote = true;
        }

        const response = await fetch(apiEndpoint, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

        if (response.ok) {
            localStorage.removeItem(storageKey);
            const result = await response.json();
            router.push(isEditMode ? `/journal/${result.journalId}` : '/diary');
            router.refresh();
        } else {
            const data = await response.json();
            showAlert({ title: 'Save Error', message: `Failed to save journal: ${data.error}` });
        }
    };

    const { wordCount, charCount } = useMemo(() => {
        const trimmedContent = content.trim();
        const words = trimmedContent ? trimmedContent.split(/\s+/).filter(Boolean) : [];
        return { wordCount: words.length, charCount: content.length };
    }, [content]);

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
        <div className={styles.container}>
            <h1>{isEditMode ? 'Edit your journal' : 'What’s on your mind'}</h1>
            <form onSubmit={handleSubmit} className={styles.form}>
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
                        onDetach={isEditMode ? handleDetachQuote : null}
                    />
                </div>

                <div className={styles.tagSections}>
                    <div className={styles.accordionItem}>
                        <button type="button" className={styles.accordionHeader} onClick={() => setOpenAccordion(openAccordion === 'moods' ? null : 'moods')}>
                            <div className={styles.headerLeft}>
                                <YinYang size={24} weight="duotone" />
                                <span>Moods</span>
                            </div>
                            <div className={styles.headerRight}>
                                <span className={styles.requirementText}>Required</span>
                                <CaretDown size={20} className={openAccordion === 'moods' ? styles.caretOpen : ''} />
                            </div>
                        </button>
                        {openAccordion === 'moods' && (
                            <div className={styles.accordionContent}>
                                <div className={styles.moodTabs}>
                                    {availableTags.moods.map(mood => (
                                        <button type="button" key={mood.name} onClick={() => setActiveMoodTab(mood.name)} className={activeMoodTab === mood.name ? styles.activeTab : ''}>
                                            {mood.name}
                                        </button>
                                    ))}
                                </div>
                                <div className={styles.tagList}>
                                    {availableTags.moods.find(m => m.name === activeMoodTab)?.tags.map(tag => (
                                        <button type="button" key={tag} className={styles.tagButton} onClick={() => handleTagSelect(tag, 'mood', availableTags.moods.find(m => m.name === activeMoodTab).color)}>
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {otherCategories.map(({ singular, plural }) => (
                        <div key={plural} className={styles.accordionItem}>
                            <button type="button" className={styles.accordionHeader} onClick={() => setOpenAccordion(openAccordion === plural ? null : plural)}>
                                <div className={styles.headerLeft}>
                                    {plural === 'activities' && <CirclesThree size={24} weight="duotone" />}
                                    {plural === 'people' && <Users size={24} weight="duotone" />}
                                    {plural === 'places' && <Island size={24} weight="duotone" />}
                                    <span>{plural.charAt(0).toUpperCase() + plural.slice(1)}</span>
                                </div>
                                <div className={styles.headerRight}>
                                    <span className={styles.requirementText}>Optional</span>
                                    <CaretDown size={20} className={openAccordion === plural ? styles.caretOpen : ''} />
                                </div>
                            </button>
                            {openAccordion === plural && (
                                <div className={styles.accordionContent}>
                                    <div className={styles.tagList}>
                                        {availableTags[plural].map(tag => (
                                            <button type="button" key={tag} className={styles.tagButton} onClick={() => handleTagSelect(tag, singular)}>
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className={styles.formFooter}>
                    <span className={styles.charCount}>
                        {isClient ? `${charCount} characters, ${wordCount} words` : '...'}
                    </span>
                    <button type="submit" className={styles.saveButton}>
                        {isEditMode ? (
                            <>
                                <FloppyDisk size={28} weight="fill" />
                                Update Entry
                            </>
                        ) : (
                            <>
                                <CalendarPlus size={28} weight="fill" />
                                Add to Diary
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
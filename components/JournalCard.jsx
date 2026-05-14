'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import styles from '../styles/JournalCard.module.css';
import FormattedDate from './FormattedDate';
import QuotedJournalPreview from './QuotedJournalPreview';
import { getMoodColor } from '../lib/mood-utils';
import {
    AsteriskIcon, PersonSimpleBikeIcon, Users, MapTrifoldIcon,
    DotsThreeVertical, PencilSimple, BookmarkSimple, Trash,
    DownloadSimple, Copy, Repeat, ChatCenteredDots
} from '@phosphor-icons/react';
import { useModal } from '../context/ModalContext';
import { useToast } from '../context/ToastContext';
import QuoteDisplay from './QuoteDisplay';
import FireAnimationOverlay from './FireAnimationOverlay';
import { formatTimeAgo } from '../lib/time-utils';

function CategoryIcon({ type, size = 16, weight = "duotone" }) {
    switch (type) {
        case 'mood': return <AsteriskIcon size={size} weight={weight} />;
        case 'activity': return <PersonSimpleBikeIcon size={size} weight={weight} />;
        case 'people': return <Users size={size} weight={weight} />;
        case 'place': return <MapTrifoldIcon size={size} weight={weight} />;
        default: return null;
    }
}

function TagCategory({ type, tags, moodData }) {
    const [isHovered, setIsHovered] = useState(false);
    if (!tags || tags.length === 0) return null;

    return (
        <div
            className={styles.categoryBadge}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <CategoryIcon type={type} />
            <span className={styles.categoryCount}>{tags.length}</span>

            {isHovered && (
                <div className={styles.popover}>
                    <div className={styles.popoverTitle}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}{tags.length > 1 ? 's' : ''}
                    </div>
                    <div className={styles.popoverList}>
                        {tags.map(tag => (
                            <div key={tag.name} className={styles.popoverItem}>
                                {type === 'mood' && (
                                    <div
                                        className={styles.moodDot}
                                        style={{ backgroundColor: getMoodColor(tag.name, moodData?.moods) || 'var(--monochrome-7)' }}
                                    />
                                )}
                                {tag.name}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function MoodBar({ moods, moodData }) {
    if (!moods || moods.length === 0) return null;

    const moodSegments = useMemo(() => {
        const counts = {};
        moods.forEach(tag => {
            const color = getMoodColor(tag.name, moodData?.moods) || 'var(--monochrome-11)';
            counts[color] = (counts[color] || 0) + 1;
        });

        const total = moods.length;
        return Object.entries(counts).map(([color, count]) => ({
            color,
            percentage: (count / total) * 100
        }));
    }, [moods, moodData]);

    return (
        <div className={styles.moodBar}>
            {moodSegments.map((segment, i) => (
                <div
                    key={i}
                    className={styles.moodSegment}
                    style={{
                        width: `${segment.percentage}%`,
                        backgroundColor: segment.color
                    }}
                />
            ))}
        </div>
    );
}

export default function JournalCard({ journal, moodData }) {
    const router = useRouter();
    const { showConfirm, showAlert } = useModal();
    const { showToast } = useToast();
    const [menuOpen, setMenuOpen] = useState(false);
    const [isBookmarked, setIsBookmarked] = useState(journal.isBookmarked);
    const [isDeleting, setIsDeleting] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        setIsBookmarked(journal.isBookmarked);
    }, [journal.isBookmarked]);

    const tags = journal.tags || [];
    const moods = tags.filter(t => t.type === 'mood');
    const activities = tags.filter(t => t.type === 'activity');
    const people = tags.filter(t => t.type === 'people');
    const places = tags.filter(t => t.type === 'place');

    const dominantMood = useMemo(() => {
        if (moods.length === 0) return 'happy';

        const counts = { Happy: 0, Chill: 0, Tired: 0, Stress: 0 };
        moods.forEach(tag => {
            const parent = moodData?.moods?.find(m => m.name === tag.name || m.tags.includes(tag.name));
            if (parent) counts[parent.name]++;
        });

        // Find the maximum count
        const maxCount = Math.max(...Object.values(counts));
        
        // Gather all moods that have this maximum count
        const winners = Object.entries(counts)
            .filter(([_, count]) => count === maxCount && count > 0)
            .map(([name, _]) => name.toLowerCase());

        if (winners.length === 0) return 'happy';
        
        // Pick one winner randomly
        return winners[Math.floor(Math.random() * winners.length)];
    }, [moods, moodData]);

    const handleCardClick = (e) => {
        // Prevent click if clicking the menu or its buttons
        if (e.target.closest(`.${styles.menuContainer}`) || e.target.closest(`.${styles.actionsContainer}`)) return;
        router.push(`/journal/${journal.id}`);
    };

    const handleEdit = (e) => {
        e.stopPropagation();
        router.push(`/journal/${journal.id}/edit`);
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        setMenuOpen(false);
        showConfirm({
            title: 'Burn Entry?',
            message: 'This will permanently remove this journal entry. Are you sure?',
            confirmLabel: 'Burn it',
            onConfirm: async () => {
                const res = await fetch(`/api/journals/${journal.id}`, { method: 'DELETE' });
                if (res.ok) {
                    setIsDeleting(true);
                } else {
                    showToast({ title: 'Error', message: 'Failed to delete entry.', type: 'error' });
                }
            }
        });
    };

    const handleAnimationComplete = () => {
        setIsDeleting(false);
        router.refresh();
    };

    const handleBookmark = async (e) => {
        e.stopPropagation();
        setMenuOpen(false);

        // Optimistic UI update
        const newStatus = !isBookmarked;
        setIsBookmarked(newStatus);

        const res = await fetch(`/api/journals/${journal.id}/bookmark`, {
            method: 'POST'
        });

        if (res.ok) {
            showToast({ 
                title: newStatus ? 'Bookmarked' : 'Bookmark Removed', 
                message: newStatus ? 'Entry added to your bookmarks.' : 'Entry removed from bookmarks.', 
                type: 'success' 
            });
            router.refresh();
        } else {
            // Revert on failure
            setIsBookmarked(!newStatus);
        }
    };

    const handleCopy = (e) => {
        e.stopPropagation();
        setMenuOpen(false);
        navigator.clipboard.writeText(journal.content)
            .then(() => showToast({ title: 'Copied', message: 'Content copied to clipboard!', type: 'success' }))
            .catch(() => showToast({ title: 'Error', message: 'Could not copy content.', type: 'error' }));
    };

    const handleDownload = async (e) => {
        e.stopPropagation();
        setMenuOpen(false);
        try {
            const followUpsResponse = await fetch(`/api/journals/${journal.id}/follow-ups`);
            const followUps = await followUpsResponse.json();
            const fileName = `${new Date(journal.createdAt).toISOString().replace(/:/g, '-').slice(0, 19)}.md`;

            const frontmatter = { Happy: [], Chill: [], Tired: [], Stress: [], Activities: [], People: [], Places: [] };
            const typeToCategoryMap = { activity: 'Activities', people: 'People', place: 'Places' };

            (journal.tags || []).forEach(tag => {
                if (tag.type === 'mood') {
                    const parentMood = moodData?.moods?.find(m => m.name === tag.name || m.tags.includes(tag.name));
                    if (parentMood) frontmatter[parentMood.name].push(tag.name);
                } else {
                    const category = typeToCategoryMap[tag.type];
                    if (category) frontmatter[category].push(tag.name);
                }
            });

            let frontmatterString = '---\n';
            for (const [key, value] of Object.entries(frontmatter)) {
                if (value.length > 0) frontmatterString += `${key}: [${value.join(', ')}]\n`;
            }
            frontmatterString += '---\n\n';

            let body = '';
            if (journal.quotedJournal) {
                const qj = journal.quotedJournal;
                const timestamp = new Date(qj.createdAt).toISOString().replace(/:/g, '-').slice(0, 19);
                body += `> Quoting: [[${timestamp}_${qj.id}]]\n\n`;
            }

            body += `${journal.content}\n\n`;
            body += `**Created:** ${new Date(journal.createdAt).toLocaleString()}\n`;
            if (journal.updatedAt !== journal.createdAt) {
                body += `**Modified:** ${new Date(journal.updatedAt).toLocaleString()}\n`;
            }

            if (followUps.length > 0) {
                body += '\n## Follow-ups\n\n';
                followUps.forEach(f => {
                    body += `${f.content}\n\n`;
                    body += `**Written:** ${new Date(f.createdAt).toLocaleString()}\n`;
                    body += '\n---\n';
                });
            }

            const markdownContent = frontmatterString + body;
            const blob = new Blob([markdownContent], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download failed:', err);
            showToast({ title: 'Error', message: 'Failed to download entry.', type: 'error' });
        }
    };

    const handleQuote = (e) => {
        e.stopPropagation();
        setMenuOpen(false);
        router.push(`/new?quoteId=${journal.id}`);
    };

    // Close menu on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div onClick={handleCardClick} className={styles.card}>
            {isDeleting && <FireAnimationOverlay onComplete={handleAnimationComplete} />}

            <div className={styles.cardHeader}>
                {journal.moodSentence && (
                    <div className={styles.moodSentence}>
                        {journal.moodSentence}
                    </div>
                )}
                <MoodBar moods={moods} moodData={moodData} />
            </div>

            {journal.content ? (
                <p className={styles.content}>
                    {journal.content}
                </p>
            ) : (
                <QuoteDisplay mood={dominantMood} />
            )}

            <QuotedJournalPreview journal={journal.quotedJournal} />

            <div className={styles.footer}>
                <div className={styles.footerRow}>
                    <div className={styles.categorySummary}>
                        <TagCategory type="mood" tags={moods} moodData={moodData} />
                        <TagCategory type="activity" tags={activities} />
                        <TagCategory type="people" tags={people} />
                        <TagCategory type="place" tags={places} />
                    </div>

                    <div className={styles.actionsContainer}>
                        <div className={styles.categoryBadge} title={`${journal.followUpCount} follow-ups`}>
                            <ChatCenteredDots size={16} weight="duotone" />
                            {journal.followUpCount > 0 && <span className={styles.categoryCount}>{journal.followUpCount}</span>}
                        </div>
                        
                        <button
                            className={styles.categoryBadge}
                            onClick={handleQuote}
                            title="Quote Entry"
                        >
                            <Repeat size={16} />
                            {journal.quoteCount > 0 && <span className={styles.categoryCount}>{journal.quoteCount}</span>}
                        </button>

                        <div className={styles.menuContainer} ref={menuRef}>
                            <button
                                className={styles.categoryBadge}
                                onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
                            >
                                <DotsThreeVertical size={16} weight="bold" />
                            </button>
                            {menuOpen && (
                                <div className={styles.menuDropdown}>
                                    <button onClick={handleBookmark} className={isBookmarked ? styles.bookmarked : ''}>
                                        <BookmarkSimple size={16} weight={isBookmarked ? "fill" : "regular"} />
                                        {isBookmarked ? "Remove Bookmark" : "Bookmark"}
                                    </button>
                                    <button onClick={handleEdit}>
                                        <PencilSimple size={16} />
                                        Edit
                                    </button>
                                    <button onClick={handleCopy}>
                                        <Copy size={16} />
                                        Copy Content
                                    </button>
                                    <button onClick={handleDownload}>
                                        <DownloadSimple size={16} />
                                        Download MD
                                    </button>
                                    <div className={styles.menuDivider} />
                                    <button onClick={handleDelete} className={styles.danger}>
                                        <Trash size={16} />
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className={styles.timestampContainer}>
                    <div className={styles.createdTime}>
                        <FormattedDate dateString={journal.createdAt} />
                    </div>
                    {journal.updatedAt && journal.updatedAt !== journal.createdAt && (
                        <div className={styles.modifiedTime}>
                            Last modified {formatTimeAgo(journal.updatedAt)}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useMemo } from 'react';
import {
    Copy, Trash, BookmarkSimple, Repeat, PencilSimple, DownloadSimple,
    PersonSimpleBikeIcon, Users, MapTrifoldIcon
} from '@phosphor-icons/react/dist/ssr';
import TagPill from './TagPill';
import styles from '../styles/JournalDetail.module.css';
import { useModal } from '../context/ModalContext';
import FollowUpSection from './FollowUpSection';
import FormattedDate from './FormattedDate';
import QuotedJournalPreview from './QuotedJournalPreview';
import { getMoodColor } from '../lib/mood-utils';
import QuoteDisplay from './QuoteDisplay';
import FireAnimationOverlay from './FireAnimationOverlay';

const copyToClipboard = (text, showAlert) => {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
            .then(() => showAlert({ title: 'Success', message: 'Content copied to clipboard!' }))
            .catch(() => showAlert({ title: 'Error', message: 'Could not copy content.' }));
    } else {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'absolute';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showAlert({ title: 'Success', message: 'Content copied to clipboard!' });
        } catch (err) {
            showAlert({ title: 'Error', message: 'Could not copy content.' });
        }
    }
};



const ConnectorRow = ({ icon, label, tags }) => (
    <div className={styles.connectorRow}>
        <div className={styles.connectorLabel}>
            {icon}
            <span>{label}</span>
        </div>
        <span className={styles.connectorTags}>
            {tags.map(t => t.name).join(', ')}
        </span>
    </div>
);

export default function JournalView({ journal, moodData }) {
    const router = useRouter();
    const { showAlert, showConfirm } = useModal();
    const [isBookmarked, setIsBookmarked] = useState(journal.isBookmarked);
    const [isDeleting, setIsDeleting] = useState(false);

    const { moodTags, activityTags, peopleTags, placeTags } = useMemo(() => {
        const moods = [];
        const activities = [];
        const people = [];
        const places = [];
        journal.tags.forEach(tag => {
            if (tag.type === 'mood') moods.push(tag);
            else if (tag.type === 'activity') activities.push(tag);
            else if (tag.type === 'people') people.push(tag);
            else if (tag.type === 'place') places.push(tag);
        });
        return { moodTags: moods, activityTags: activities, peopleTags: people, placeTags: places };
    }, [journal.tags]);

    const dominantMood = useMemo(() => {
        if (moodTags.length === 0) return 'happy';

        const counts = { Happy: 0, Chill: 0, Tired: 0, Stress: 0 };
        moodTags.forEach(tag => {
            const parent = moodData?.moods?.find(m => m.name === tag.name || m.tags.includes(tag.name));
            if (parent) counts[parent.name]++;
        });

        const maxCount = Math.max(...Object.values(counts));
        const winners = Object.entries(counts)
            .filter(([_, count]) => count === maxCount && count > 0)
            .map(([name, _]) => name.toLowerCase());

        if (winners.length === 0) return 'happy';
        return winners[Math.floor(Math.random() * winners.length)];
    }, [moodTags, moodData]);

    const handleCopy = () => {
        copyToClipboard(journal.content, showAlert);
    };

    const handleDelete = () => {
        showConfirm({
            title: 'Burn Entry?',
            message: 'Are you sure you want to permanently burn this entry? This cannot be undone.',
            confirmLabel: 'Burn it',
            onConfirm: async () => {
                const response = await fetch(`/api/journals/${journal.id}`, { method: 'DELETE' });
                if (response.ok) {
                    setIsDeleting(true);
                } else {
                    showAlert({ title: 'Error', message: 'Failed to delete journal.' });
                }
            }
        });
    };

    const handleAnimationComplete = () => {
        setIsDeleting(false);
        router.push('/diary');
        router.refresh();
    };

    const handleToggleBookmark = async () => {
        const response = await fetch(`/api/journals/${journal.id}/bookmark`, { method: 'POST' });
        if (response.ok) {
            setIsBookmarked(prev => !prev);
            router.refresh();
        } else {
            showAlert({ title: 'Error', message: 'Could not update bookmark status.' });
        }
    };

    const handleDownload = async () => {
        const followUpsResponse = await fetch(`/api/journals/${journal.id}/follow-ups`);
        const followUps = await followUpsResponse.json();
        const fileName = `${new Date(journal.createdAt).toISOString().replace(/:/g, '-').slice(0, 19)}.md`;

        const frontmatter = { Happy: [], Chill: [], Tired: [], Stress: [], Activities: [], People: [], Places: [] };
        const typeToCategoryMap = { activity: 'Activities', people: 'People', place: 'Places' };
        journal.tags.forEach(tag => {
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
            frontmatterString += `${key}: [${value.join(', ')}]\n`;
        }
        frontmatterString += '---\n\n';

        let body = '';
        if (journal.quotedJournal) {
            const qj = journal.quotedJournal;
            const timestamp = new Date(qj.createdAt).toISOString().replace(/:/g, '-').slice(0, 19);
            const quoteLink = `> Quoting: [[${timestamp}_${qj.id}]]\n\n`;
            body += quoteLink;
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
                if (f.updatedAt !== f.createdAt) {
                    body += `**Edited:** ${new Date(f.updatedAt).toLocaleString()}\n`;
                }
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
    };

    return (
        <>
            {isDeleting && <FireAnimationOverlay onComplete={handleAnimationComplete} />}
            <aside className={styles.sidebar}>
                <div className={styles.topBar}>
                    <div className={styles.topBarActions}>
                        <Link href={`/journal/${journal.id}/edit`} className={styles.editButton} title="Edit Journal"><PencilSimple size={20} weight="bold" /></Link>
                        <button onClick={handleCopy} title="Copy Content"><Copy size={20} weight="bold" /></button>
                        <button onClick={handleDownload} title="Download as Markdown"><DownloadSimple size={20} weight="bold" /></button>
                        <button onClick={handleToggleBookmark} title="Bookmark" className={isBookmarked ? styles.bookmarked : ''}>
                            <BookmarkSimple size={20} weight={isBookmarked ? 'fill' : 'bold'} />
                        </button>
                        <Link href={`/new?quoteId=${journal.id}`} className={styles.quoteButton} title="Quote Journal"><Repeat size={20} weight="bold" /></Link>
                        <button onClick={handleDelete} className={styles.deleteButton} title="Delete Journal"><Trash size={20} weight="bold" /></button>
                    </div>
                </div>

                <div className={styles.moodsContainer}>
                    {moodTags.map(tag => (
                        <TagPill key={`${tag.type}-${tag.name}`} text={tag.name} color={tag.type === 'mood' ? getMoodColor(tag.name, moodData?.moods) : null} onRemove={null} />
                    ))}
                </div>

                <div className={styles.connectorsContainer}>
                    {activityTags.length > 0 && (
                        <ConnectorRow icon={<PersonSimpleBikeIcon size={18} weight="duotone" />} label="Activities" tags={activityTags} />
                    )}
                    {peopleTags.length > 0 && (
                        <ConnectorRow icon={<Users size={18} weight="duotone" />} label="People" tags={peopleTags} />
                    )}
                    {placeTags.length > 0 && (
                        <ConnectorRow icon={<MapTrifoldIcon size={18} weight="duotone" />} label="Places" tags={placeTags} />
                    )}
                </div>

                <footer className={styles.footer}>
                    <p>Created: <FormattedDate dateString={journal.createdAt} /></p>
                    {journal.updatedAt !== journal.createdAt && <p>Modified: <FormattedDate dateString={journal.updatedAt} /></p>}
                </footer>
            </aside>
            <div className={styles.contentArea}>
                <div className={styles.container}>
                    <main className={styles.mainContent}>
                        {journal.moodSentence && (
                            <div className={styles.moodSentenceHeader}>
                                {journal.moodSentence}
                            </div>
                        )}
                        <div className={styles.contentWrapper}>
                            {journal.content ? (
                                <p className={styles.content}>{journal.content}</p>
                            ) : (
                                <QuoteDisplay mood={dominantMood} />
                            )}
                            <QuotedJournalPreview journal={journal.quotedJournal} />
                        </div>

                        <FollowUpSection journalId={journal.id} />
                    </main>
                </div>
            </div>
        </>
    );
}
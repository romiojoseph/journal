'use client';

import { useState, useEffect } from 'react';
import { PencilSimple, Trash, ChatCenteredTextIcon, Copy } from '@phosphor-icons/react';
import { useModal } from '../context/ModalContext';
import styles from '../styles/FollowUp.module.css';
import FormattedDate from './FormattedDate';
import FireAnimationOverlay from './FireAnimationOverlay';

const copyToClipboard = (text, showAlert) => {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
            .then(() => showAlert({ title: 'Copied', message: 'Follow-up content copied to clipboard.' }))
            .catch(() => showAlert({ title: 'Error', message: 'Failed to copy content.' }));
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
            showAlert({ title: 'Copied', message: 'Follow-up content copied to clipboard.' });
        } catch (err) {
            showAlert({ title: 'Error', message: 'Failed to copy content.' });
        }
    }
};

export default function FollowUpSection({ journalId }) {
    const [followUps, setFollowUps] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newFollowUp, setNewFollowUp] = useState('');
    const [isDraftLoaded, setIsDraftLoaded] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState(null);
    const { showAlert, showConfirm } = useModal();

    useEffect(() => {
        localStorage.removeItem(`unsaved-follow-up-${journalId}`);
    }, [journalId]);

    useEffect(() => {
        const fetchFollowUps = async () => {
            try {
                const response = await fetch(`/api/journals/${journalId}/follow-ups`);
                const data = await response.json();
                setFollowUps(data);
            } catch (error) {
                console.error("Failed to fetch follow-ups", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFollowUps();
    }, [journalId]);

    useEffect(() => {
        if (!isDraftLoaded) {
            fetch(`/api/follow-ups/draft?journalId=${journalId}`)
                .then(async (res) => {
                    if (res.status === 403 || res.status === 401) {
                        return { error: 'Invalid session' };
                    }
                    return res.json();
                })
                .then(data => {
                    if (data.content) setNewFollowUp(data.content);
                    setIsDraftLoaded(true);
                })
                .catch(err => {
                    console.error('Failed to load follow-up draft', err);
                    setIsDraftLoaded(true);
                });
        }
    }, [journalId, isDraftLoaded]);

    useEffect(() => {
        if (!isDraftLoaded) return;

        const interval = setInterval(async () => {
            if (!newFollowUp.trim()) return;

            try {
                const res = await fetch('/api/follow-ups/draft', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ journalId, content: newFollowUp })
                });

                if (res.status === 403) {
                    console.warn('Follow-up draft auto-save failed: Key missing');
                }
            } catch (err) {
                console.error('Follow-up draft auto-save failed', err);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [newFollowUp, journalId, isDraftLoaded]);

    const handleAddFollowUp = async (e) => {
        e.preventDefault();
        if (!newFollowUp.trim()) return;

        const response = await fetch(`/api/journals/${journalId}/follow-ups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: newFollowUp }),
        });

        if (response.ok) {
            setNewFollowUp('');
            localStorage.removeItem(`unsaved-follow-up-${journalId}`);
            fetch(`/api/follow-ups/draft?journalId=${journalId}`, { method: 'DELETE' });
            const res = await fetch(`/api/journals/${journalId}/follow-ups`);
            const data = await res.json();
            setFollowUps(data);
        } else if (response.status === 401) {
            localStorage.removeItem('vault-unlocked-expiry');
            window.location.href = '/access-vault';
        } else {
            showAlert({ title: 'Error', message: 'Failed to add follow-up.' });
        }
    };

    const handleCopy = (content) => {
        copyToClipboard(content, showAlert);
    };

    const handleEdit = (followUp) => {
        setEditingId(followUp.id);
        setEditText(followUp.content);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditText('');
    };

    const handleSaveEdit = async (id) => {
        const response = await fetch(`/api/follow-ups/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: editText }),
        });
        if (response.ok) {
            // Refetch to get the correct server-side updatedAt timestamp
            const res = await fetch(`/api/journals/${journalId}/follow-ups`);
            const data = await res.json();
            setFollowUps(data);
            handleCancelEdit();
        } else if (response.status === 401) {
            localStorage.removeItem('vault-unlocked-expiry');
            window.location.href = '/access-vault';
        } else {
            showAlert({ title: 'Error', message: 'Failed to update follow-up.' });
        }
    };

    const handleDelete = (id) => {
        showConfirm({
            title: 'Burn Follow-up?',
            message: 'Are you sure you want to permanently burn this follow-up?',
            confirmLabel: 'Burn it',
            onConfirm: async () => {
                const response = await fetch(`/api/follow-ups/${id}`, { method: 'DELETE' });
                if (response.ok) {
                    setPendingDeleteId(id);
                    setIsDeleting(true);
                } else if (response.status === 401) {
                    window.isVaultUnlocked = false;
                    window.location.href = '/access-vault';
                } else {
                    showAlert({ title: 'Error', message: 'Failed to delete follow-up.' });
                }
            }
        });
    };

    const handleAnimationComplete = () => {
        setIsDeleting(false);
        if (pendingDeleteId) {
            setFollowUps(followUps.filter(f => f.id !== pendingDeleteId));
            setPendingDeleteId(null);
        }
    };

    if (isLoading) {
        return <p>Loading follow-ups...</p>;
    }

    return (
        <>
            {isDeleting && <FireAnimationOverlay onComplete={handleAnimationComplete} />}
            <div className={styles.section}>
                {followUps.length > 0 && <h3 className={styles.title}>Continued thoughts...</h3>}
                <div className={styles.followUpList}>
                    {followUps.map(followUp => (
                        <div key={followUp.id} className={styles.card}>
                            {editingId === followUp.id ? (
                                <div className={styles.editForm}>
                                    <textarea
                                        value={editText}
                                        onChange={(e) => setEditText(e.target.value)}
                                        className={styles.editTextarea}
                                    />
                                    <div className={styles.editActions}>
                                        <button onClick={handleCancelEdit} className={styles.cancelButton}>Cancel</button>
                                        <button onClick={() => handleSaveEdit(followUp.id)} className={styles.saveButton}>Save</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <p className={styles.content}>{followUp.content}</p>
                                    <div className={styles.footer}>
                                        <div className={styles.timestamps}>
                                            <FormattedDate dateString={followUp.createdAt} />
                                            {followUp.updatedAt !== followUp.createdAt && (
                                                <span className={styles.modified}>(Edited: <FormattedDate dateString={followUp.updatedAt} />)</span>
                                            )}
                                        </div>
                                        <div className={styles.actions}>
                                            <button onClick={() => handleCopy(followUp.content)} title="Copy"><Copy size={18} /></button>
                                            <button onClick={() => handleEdit(followUp)} title="Edit"><PencilSimple size={18} /></button>
                                            <button onClick={() => handleDelete(followUp.id)} title="Delete"><Trash size={18} /></button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <form onSubmit={handleAddFollowUp} className={styles.stickyAddForm}>
                <textarea
                    value={newFollowUp}
                    onChange={(e) => setNewFollowUp(e.target.value)}
                    placeholder="Anything else on your mind?"
                    className={styles.addTextarea}
                />
                <button type="submit" className={styles.addButton}><ChatCenteredTextIcon size={24} weight="duotone" />Add Note</button>
            </form>
        </>
    );
}
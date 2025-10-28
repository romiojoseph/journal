'use client';

import { useState, useEffect } from 'react';
import { PencilSimple, Trash, GitPullRequest, Copy } from '@phosphor-icons/react';
import { useModal } from '../context/ModalContext';
import styles from '../styles/FollowUp.module.css';
import FormattedDate from './FormattedDate';

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
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState('');
    const { showAlert, showConfirm } = useModal();

    const storageKey = `unsaved-follow-up-${journalId}`;

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

        const savedDraft = localStorage.getItem(storageKey);
        if (savedDraft) {
            setNewFollowUp(savedDraft);
        }

        fetchFollowUps();
    }, [journalId, storageKey]);

    useEffect(() => {
        localStorage.setItem(storageKey, newFollowUp);
    }, [newFollowUp, storageKey]);

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
            localStorage.removeItem(storageKey);
            const res = await fetch(`/api/journals/${journalId}/follow-ups`);
            const data = await res.json();
            setFollowUps(data);
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
            setFollowUps(followUps.map(f => f.id === id ? { ...f, content: editText, updatedAt: new Date().toISOString() } : f));
            handleCancelEdit();
        } else {
            showAlert({ title: 'Error', message: 'Failed to update follow-up.' });
        }
    };

    const handleDelete = (id) => {
        showConfirm({
            title: 'Delete Follow-up',
            message: 'Are you sure you want to delete this follow-up?',
            confirmLabel: 'Delete',
            onConfirm: async () => {
                const response = await fetch(`/api/follow-ups/${id}`, { method: 'DELETE' });
                if (response.ok) {
                    setFollowUps(followUps.filter(f => f.id !== id));
                } else {
                    showAlert({ title: 'Error', message: 'Failed to delete follow-up.' });
                }
            }
        });
    };

    if (isLoading) {
        return <p>Loading follow-ups...</p>;
    }

    return (
        <>
            <div className={styles.section}>
                <h3 className={styles.title}>Follow-ups</h3>
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
                    placeholder="Write a follow-up note..."
                    className={styles.addTextarea}
                />
                <button type="submit" className={styles.addButton}><GitPullRequest size={32} weight="fill" />Add Reply</button>
            </form>
        </>
    );
}
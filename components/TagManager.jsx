'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash, PencilSimple, FloppyDisk, YinYang, CirclesThree, Users, Island } from '@phosphor-icons/react';
import { useModal } from '../context/ModalContext';
import styles from '../styles/TagManager.module.css';

function EditableTag({ tag, onUpdate, onDelete }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(tag);

    const handleSave = () => {
        onUpdate(tag, editText);
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className={styles.tagPillEditing}>
                <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                />
                <button onClick={handleSave}><FloppyDisk size={24} weight="duotone" /></button>
            </div>
        );
    }

    return (
        <div className={styles.tagPill}>
            <span>{tag}</span>
            <div className={styles.tagActions}>
                <button onClick={() => setIsEditing(true)}><PencilSimple size={16} /></button>
                <button onClick={() => onDelete(tag)}><Trash size={16} /></button>
            </div>
        </div>
    );
}


export default function TagManager() {
    const [allTags, setAllTags] = useState({ moods: [], activities: [], people: [], places: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [newTags, setNewTags] = useState({ activities: '', people: '', places: '' });
    const { showAlert, showConfirm } = useModal(); // Get the showConfirm function from the context

    useEffect(() => {
        fetch('/api/tags')
            .then(res => res.json())
            .then(data => {
                setAllTags(data);
                setIsLoading(false);
            });
    }, []);

    const syncDatabase = async (action, category, oldTagName, newTagName = null) => {
        await fetch('/api/tags/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, category, oldTagName, newTagName }),
        });
    };

    const handleUpdateJSON = async (category, data) => {
        const response = await fetch('/api/tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category, data }),
        });
        if (!response.ok) {
            showAlert({ title: 'Error', message: `Failed to update ${category}.` });
            return false;
        }
        return true;
    };

    // --- THIS IS THE UPDATED FUNCTION ---
    const handleTagDelete = (category, tagToDelete) => {
        showConfirm({
            title: 'Confirm Deletion',
            message: `Are you sure you want to delete the tag "${tagToDelete}"? This will remove it from all associated journal entries. This action cannot be undone.`,
            confirmLabel: 'Delete',
            onConfirm: async () => {
                let updatedData;
                if (category === 'moods') {
                    updatedData = allTags.moods.map(mood => ({
                        ...mood,
                        tags: mood.tags.filter(t => t !== tagToDelete)
                    }));
                } else {
                    updatedData = allTags[category].filter(t => t !== tagToDelete);
                }

                const success = await handleUpdateJSON(category, updatedData);
                if (success) {
                    setAllTags(prev => ({ ...prev, [category]: updatedData }));
                    await syncDatabase('delete', category, tagToDelete);
                }
            }
        });
    };
    // --- END UPDATE ---

    const handleTagUpdate = async (category, oldTag, newTag) => {
        if (!newTag.trim() || oldTag === newTag) return;

        let updatedData;
        if (category === 'moods') {
            updatedData = allTags.moods.map(mood => ({
                ...mood,
                tags: mood.tags.map(t => t === oldTag ? newTag : t)
            }));
        } else {
            updatedData = allTags[category].map(t => t === oldTag ? newTag : t);
        }

        const success = await handleUpdateJSON(category, updatedData);
        if (success) {
            setAllTags(prev => ({ ...prev, [category]: updatedData }));
            await syncDatabase('update', category, oldTag, newTag);
        }
    };

    const handleAddTag = async (category) => {
        const newTag = newTags[category].trim();
        if (!newTag || allTags[category].includes(newTag)) {
            return showAlert({ title: 'Invalid Tag', message: 'Tag cannot be empty or a duplicate.' });
        }
        const updatedData = [...allTags[category], newTag];

        const success = await handleUpdateJSON(category, updatedData);
        if (success) {
            setAllTags(prev => ({ ...prev, [category]: updatedData }));
            setNewTags(prev => ({ ...prev, [category]: '' }));
        }
    };

    if (isLoading) return <p>Loading tags...</p>;

    return (
        <div className={styles.manager}>
            <h2>Manage your tags</h2>
            <p className={styles.description}>Each mood contains tags that represent emotions. Since emotions often link to activities, people, and places, these are called connector tags. You can add, edit, or remove tags for any category. All changes are saved and synced automatically.</p>
            <aside>Use <code>CTRL + F</code> to search for tags.</aside>
            <div className={styles.category}>
                <h3><YinYang size={32} weight="duotone" />Moods</h3>
                {allTags.moods.map(mood => {
                    const uniqueTags = [...new Set(mood.tags)];
                    return (
                        <div key={mood.name} className={styles.moodGroup}>
                            <h4 style={{ color: mood.color }}>{mood.name}</h4>
                            <p className={styles.emotionDescription}>{mood.emotionDescription}</p>
                            <div className={styles.tagList}>
                                {uniqueTags.map(tag => (
                                    <EditableTag key={tag} tag={tag} onUpdate={(old, aNew) => handleTagUpdate('moods', old, aNew)} onDelete={() => handleTagDelete('moods', tag)} />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {['activities', 'people', 'places'].map(category => {
                const uniqueTags = [...new Set(allTags[category])];
                return (
                    <div key={category} className={styles.category}>
                        <h3>
                            {category === 'activities' && <CirclesThree size={32} weight="duotone" />}
                            {category === 'people' && <Users size={32} weight="duotone" />}
                            {category === 'places' && <Island size={32} weight="duotone" />}
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                        </h3>
                        <div className={styles.addForm}>
                            <input
                                type="text"
                                value={newTags[category]}
                                onChange={(e) => setNewTags(prev => ({ ...prev, [category]: e.target.value }))}
                                placeholder={`Add new ${category}`}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTag(category)}
                            />
                            <button onClick={() => handleAddTag(category)}><Plus size={24} weight="bold" /></button>
                        </div>
                        <div className={styles.tagList}>
                            {uniqueTags.map(tag => (
                                <EditableTag key={tag} tag={tag} onUpdate={(old, aNew) => handleTagUpdate(category, old, aNew)} onDelete={() => handleTagDelete(category, tag)} />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
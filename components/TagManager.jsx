'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash, PencilSimple, FloppyDisk, AsteriskIcon, PersonSimpleBikeIcon, Users, MapTrifoldIcon, ClipboardTextIcon, Check, CheckCircleIcon, ArrowsClockwise, ArrowRight, SubtractSquareIcon, UniteSquareIcon, CaretDownIcon } from '@phosphor-icons/react';
import { useModal } from '../context/ModalContext';
import { useToast } from '../context/ToastContext';
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
    const [moodOpsData, setMoodOpsData] = useState(null);
    const [moodMoveEmotionId, setMoodMoveEmotionId] = useState('');
    const [moodMoveTargetParentId, setMoodMoveTargetParentId] = useState('');
    const [moodMergeSourceId, setMoodMergeSourceId] = useState('');
    const [moodMergeTargetId, setMoodMergeTargetId] = useState('');
    const [isMoodOpsOpen, setIsMoodOpsOpen] = useState(true);
    const [newTags, setNewTags] = useState({});
    const [unassignedMoods, setUnassignedMoods] = useState([]);
    const [matchedMoods, setMatchedMoods] = useState([]);
    const [selectedMoods, setSelectedMoods] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('Happy');
    const [importSummary, setImportSummary] = useState(null);
    const [aiJsonInput, setAiJsonInput] = useState('');
    const { showAlert, showConfirm } = useModal();
    const { showToast } = useToast();

    useEffect(() => {
        fetch('/api/tags')
            .then(res => res.json())
            .then(data => {
                setAllTags(data);
                if (data.importStatus) {
                    setImportSummary(data.importStatus.summary);
                    setUnassignedMoods(data.importStatus.rawMoods || []);
                    setMatchedMoods(data.importStatus.matchedMoods || []);
                } else {
                    setImportSummary(null);
                    setUnassignedMoods([]);
                    setMatchedMoods([]);
                }
                setIsLoading(false);
            });
    }, []);

    const refreshMoodOpsData = async () => {
        const res = await fetch('/api/moods/tags');
        if (!res.ok) throw new Error('Failed to load mood tags.');
        const data = await res.json();
        setMoodOpsData(data);
    };

    useEffect(() => {
        refreshMoodOpsData().catch(() => {
            // Keep UI usable even if this fails.
            setMoodOpsData(null);
        });
    }, []);


    const refreshTags = async () => {
        const res = await fetch('/api/tags');
        if (!res.ok) throw new Error('Failed to refresh tags.');
        const next = await res.json();
        setAllTags(next);
    };

    const refreshAll = async () => {
        await refreshTags();
        await refreshMoodOpsData();
    };

    const runTagOp = async (payload) => {
        const response = await fetch('/api/tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const msg = typeof data?.error === 'string' ? data.error : 'Tag update failed.';
            showToast({ title: 'Error', message: msg, type: 'error' });
            return false;
        }

        await refreshAll();
        return true;
    };

    const runMoodOp = async (payload) => {
        const response = await fetch('/api/moods/tags', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const msg = typeof data?.error === 'string' ? data.error : 'Mood operation failed.';
            showToast({ title: 'Error', message: msg, type: 'error' });
            return null;
        }

        return data;
    };

    const handleTagDelete = (category, tagToDelete) => {
        showConfirm({
            title: 'Confirm Deletion',
            message: `Are you sure you want to delete the tag "${tagToDelete}"? This will remove it from all associated journal entries. This action cannot be undone.`,
            confirmLabel: 'Delete',
            onConfirm: async () => {
                const success = await runTagOp({ op: 'delete', category, name: tagToDelete });
                if (success) {
                    showToast({ title: 'Deleted', message: `Tag "${tagToDelete}" removed.`, type: 'success' });
                }
            }
        });
    };

    const handleTagUpdate = async (category, oldTag, newTag) => {
        if (!newTag.trim() || oldTag === newTag) return;
        const success = await runTagOp({ op: 'rename', category, oldName: oldTag, newName: newTag });
        if (success) {
            showToast({ title: 'Updated', message: `Tag renamed to "${newTag}".`, type: 'success' });
        }
    };

    const handleAddTag = async (category, parentName = null) => {
        const key = parentName || category;
        const newTag = (newTags[key] || '').trim();
        if (!newTag) {
            showToast({ title: 'Invalid Tag', message: 'Tag cannot be empty.', type: 'warning' });
            return;
        }

        if (category === 'moods' && parentName) {
            const mood = allTags.moods.find(m => m.name === parentName);
            if (mood?.tags.includes(newTag)) {
                showToast({ title: 'Invalid Tag', message: 'Tag already exists in this mood.', type: 'warning' });
                return;
            }
        } else if (allTags[category] && allTags[category].includes(newTag)) {
            showToast({ title: 'Invalid Tag', message: 'Tag already exists in this category.', type: 'warning' });
            return;
        }

        const success = await runTagOp({ op: 'add', category, name: newTag, parentName });
        if (success) {
            setNewTags(prev => ({ ...prev, [key]: '' }));
            showToast({ title: 'Added', message: `Tag "${newTag}" added to ${category}.`, type: 'success' });
        }
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const tsvData = event.target.result;
            try {
                const res = await fetch('/api/import/how-we-feel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tsvData })
                });
                const data = await res.json();
                if (res.ok) {
                    setImportSummary(data.summary);
                    setUnassignedMoods(data.rawMoods || []);
                    setMatchedMoods(data.matchedMoods || []);
                    await refreshTags();
                    if (data.summary.imported > 0) {
                        showToast({ title: 'Import Successful', message: `Imported ${data.summary.imported} entries. Now assign the raw moods.`, type: 'success' });
                    } else {
                        showToast({ title: 'No New Entries', message: 'All entries in this file already exist in your diary.', type: 'info' });
                    }
                } else {
                    showToast({ title: 'Import Error', message: data.error || 'Failed to import data.', type: 'error' });
                }
            } catch (err) {
                showToast({ title: 'Error', message: 'An error occurred during import.', type: 'error' });
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleAssignMoods = async () => {
        if (selectedMoods.length === 0) return;
        try {
            const res = await fetch('/api/import/assign-moods', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assignments: {
                        categoryName: selectedCategory,
                        rawMoods: selectedMoods
                    }
                })
            });
            const data = await res.json();
            if (res.ok) {
                if (data.importStatus) {
                    setImportSummary(data.importStatus.summary);
                    setUnassignedMoods(data.importStatus.rawMoods || []);
                    setMatchedMoods(data.importStatus.matchedMoods || []);
                } else {
                    setUnassignedMoods(data.remainingRawMoods || []);
                }
                setSelectedMoods([]);
                await refreshTags();
                showToast({ title: 'Success', message: 'Moods assigned successfully!', type: 'success' });
            } else {
                showToast({ title: 'Error', message: data.error || 'Failed to assign moods.', type: 'error' });
            }
        } catch (err) {
            showToast({ title: 'Error', message: 'An error occurred during assignment.', type: 'error' });
        }
    };

    const handleUnassignMood = async (moodName) => {
        try {
            const res = await fetch('/api/import/unassign-mood', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rawMood: moodName })
            });
            const data = await res.json();
            if (res.ok) {
                if (data.importStatus) {
                    setImportSummary(data.importStatus.summary);
                    setUnassignedMoods(data.importStatus.rawMoods || []);
                    setMatchedMoods(data.importStatus.matchedMoods || []);
                }
                showToast({ title: 'Unassigned', message: `"${moodName}" moved back to pending.`, type: 'info' });
            } else {
                showToast({ title: 'Error', message: data.error || 'Failed to unassign mood.', type: 'error' });
            }
        } catch (err) {
            showToast({ title: 'Error', message: 'An error occurred during unassignment.', type: 'error' });
        }
    };

    const handleDismissImport = async () => {
        showConfirm({
            title: 'Clear Import Data?',
            message: 'This will dismiss the current import summary and clear any remaining unassigned mood mappings. Imported entries will remain in your diary.',
            confirmLabel: 'Clear',
            onConfirm: async () => {
                try {
                    const res = await fetch('/api/import/dismiss', { method: 'POST' });
                    if (res.ok) {
                        setImportSummary(null);
                        setUnassignedMoods([]);
                        setMatchedMoods([]);
                        showToast({ title: 'Cleared', message: 'Import state cleared.', type: 'info' });
                    }
                } catch (err) {
                    showToast({ title: 'Error', message: 'Failed to clear import.', type: 'error' });
                }
            }
        });
    };

    const handleApplyAIPaste = async () => {
        if (!aiJsonInput.trim()) return;
        try {
            const data = JSON.parse(aiJsonInput);
            if (!data.mappings || !Array.isArray(data.mappings)) {
                showToast({ title: 'Invalid Format', message: 'The pasted JSON must contain a "mappings" array.', type: 'error' });
                return;
            }

            const res = await fetch('/api/import/bulk-assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (res.ok) {
                if (result.importStatus) {
                    setImportSummary(result.importStatus.summary);
                    setUnassignedMoods(result.importStatus.rawMoods || []);
                    setMatchedMoods(result.importStatus.matchedMoods || []);
                }
                setAiJsonInput('');
                await refreshTags();
                showToast({ title: 'Success', message: 'AI mappings applied successfully!', type: 'success' });
            } else {
                showToast({ title: 'Error', message: result.error || 'Failed to apply bulk mappings.', type: 'error' });
            }
        } catch (err) {
            showToast({ title: 'Error', message: 'Failed to parse the pasted JSON. Please ensure it is valid JSON.', type: 'error' });
        }
    };

    const handleUploadAIMappings = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (!data.mappings || !Array.isArray(data.mappings)) {
                    showToast({ title: 'Invalid Format', message: 'The uploaded file must contain a "mappings" array.', type: 'error' });
                    return;
                }

                const res = await fetch('/api/import/bulk-assign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await res.json();
                if (res.ok) {
                    if (result.importStatus) {
                        setImportSummary(result.importStatus.summary);
                        setUnassignedMoods(result.importStatus.rawMoods || []);
                        setMatchedMoods(result.importStatus.matchedMoods || []);
                    }
                    await refreshTags();
                    showToast({ title: 'Success', message: 'AI mappings applied successfully!', type: 'success' });
                } else {
                    showToast({ title: 'Error', message: result.error || 'Failed to apply bulk mappings.', type: 'error' });
                }
            } catch (err) {
                showToast({ title: 'Error', message: 'Failed to parse JSON file.', type: 'error' });
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const aiPrompt = `I have a list of raw mood strings that are PENDING categorization. Please map them into these categories: ${allTags.moods.map(m => m.name).join(', ')}.

Return ONLY a JSON object with this structure:
{
  "mappings": [
    { "raw": "mood_string", "target": "CategoryName" }
  ]
}

Data to process:`;

    const handleCopyPrompt = () => {
        const fullPrompt = `${aiPrompt}\n\n${JSON.stringify(unassignedMoods, null, 2)}`;
        navigator.clipboard.writeText(fullPrompt);
        showToast({ title: 'Copied', message: 'Pending moods and prompt copied to clipboard!', type: 'info' });
    };

    const handleFinalConfirm = async () => {
        if ((unassignedMoods || []).length > 0) {
            showToast({ title: 'Mapping Required', message: 'Please assign all raw moods before finalizing.', type: 'warning' });
            return;
        }

        showConfirm({
            title: 'Confirm Final Import',
            message: `Are you sure you want to write ${importSummary.imported} journals to your diary? This cannot be undone easily.`,
            confirmLabel: 'Confirm and Write',
            onConfirm: async () => {
                try {
                    const res = await fetch('/api/import/confirm', { method: 'POST' });
                    const data = await res.json();
                    if (res.ok) {
                        setImportSummary(null);
                        setUnassignedMoods([]);
                        setMatchedMoods([]);
                        showToast({ title: 'Success', message: data.message, type: 'success' });
                        await refreshTags();
                    } else {
                        showToast({ title: 'Error', message: data.error || 'Final import failed.', type: 'error' });
                    }
                } catch (err) {
                    showToast({ title: 'Error', message: 'An error occurred during finalization.', type: 'error' });
                }
            }
        });
    };

    if (isLoading) return <p>Loading tags...</p>;

    return (
        <div className={styles.manager}>
            <h2>Manage your tags</h2>
            <p className={styles.description}>Each mood contains tags that represent emotions. Since emotions often link to activities, people, and places, these are called connector tags. You can add, edit, or remove tags for any category. All changes are saved and synced automatically.</p>
            <aside>Use <code>CTRL + F</code> to search for tags.</aside>

            <div className={styles.category}>
                <h3><AsteriskIcon size={28} weight="duotone" />Moods</h3>

                <div className={styles.moodOps} id="mood-ops">
                    <button
                        type="button"
                        className={styles.moodOpsHeader}
                        onClick={() => setIsMoodOpsOpen(v => !v)}
                        title={isMoodOpsOpen ? 'Collapse' : 'Expand'}
                    >
                        <span className={styles.moodOpsHeaderTitle}>
                            <SubtractSquareIcon size={18} weight="duotone" /> Move
                            <span className={styles.moodOpsHeaderSep}>/</span>
                            <UniteSquareIcon size={18} weight="duotone" /> Merge mood emotion tags
                        </span>
                        <span className={styles.moodOpsHeaderHint}>
                            {isMoodOpsOpen ? 'Hide' : 'Show'}
                        </span>
                    </button>
                    <p className={styles.infoText}>
                        Move or merge mood tags only. This is implemented specially to handle data imported from external sources.
                    </p>

                    {isMoodOpsOpen && (
                        !moodOpsData ? (
                            <p className={styles.emptyText}>Mood operations are currently unavailable.</p>
                        ) : (
                            <>
                                <div className={styles.moodOpsGrid}>
                                    <div className={styles.moodOpsCard}>
                                        <h5><SubtractSquareIcon size={18} weight="duotone" /> Move emotion tag</h5>
                                        <label className={styles.moodOpsLabel}>Emotion tag</label>
                                        <div className={styles.moodOpsSelectWrapper}>
                                            <select
                                                className={styles.moodOpsSelect}
                                                value={moodMoveEmotionId}
                                                onChange={(e) => setMoodMoveEmotionId(e.target.value)}
                                            >
                                                <option value="">Select an emotion…</option>
                                                {Object.entries(moodOpsData.emotionsByParent || {}).flatMap(([parentId, emotions]) => {
                                                    const parent = (moodOpsData.parents || []).find(p => String(p.id) === String(parentId));
                                                    const parentName = parent?.name || 'Unknown';
                                                    return (emotions || []).map(em => (
                                                        <option key={em.id} value={String(em.id)}>
                                                            {em.name} ({parentName})
                                                        </option>
                                                    ));
                                                })}
                                            </select>
                                            <CaretDownIcon size={20} weight="bold" className={styles.moodOpsSelectIcon} />
                                        </div>

                                        <label className={styles.moodOpsLabel}>Move to</label>
                                        <div className={styles.moodOpsSelectWrapper}>
                                            <select
                                                className={styles.moodOpsSelect}
                                                value={moodMoveTargetParentId}
                                                onChange={(e) => setMoodMoveTargetParentId(e.target.value)}
                                            >
                                                <option value="">Select a mood…</option>
                                                {(moodOpsData.parents || []).map(p => (
                                                    <option key={p.id} value={String(p.id)}>{p.name}</option>
                                                ))}
                                            </select>
                                            <CaretDownIcon size={20} weight="bold" className={styles.moodOpsSelectIcon} />
                                        </div>

                                        <button
                                            className={styles.moodOpsButton}
                                            disabled={!moodMoveEmotionId || !moodMoveTargetParentId}
                                            onClick={async () => {
                                                const preview = await runMoodOp({ op: 'move_preview', emotionTagId: moodMoveEmotionId, targetParentMoodId: moodMoveTargetParentId });
                                                if (!preview) return;

                                                showConfirm({
                                                    title: 'Confirm move (Step 1/2)',
                                                    message: `Move "${preview.emotion.name}" from "${preview.from?.name || 'Unknown'}" to "${preview.to.name}"? Affected journals: (${preview.affectedJournals}). This changes categorization only; journal entries keep the tag.`,
                                                    confirmLabel: 'Continue',
                                                    onConfirm: () => {
                                                        showConfirm({
                                                            title: 'Really move? (Step 2/2)',
                                                            message: `This will update the mood category for "${preview.emotion.name}".\n\nProceed?`,
                                                            confirmLabel: 'Move',
                                                            onConfirm: async () => {
                                                                const res = await runMoodOp({ op: 'move_execute', emotionTagId: moodMoveEmotionId, targetParentMoodId: moodMoveTargetParentId });
                                                                if (!res) return;
                                                                await refreshAll();
                                                                showToast({ title: 'Moved', message: `"${preview.emotion.name}" moved to "${preview.to.name}".`, type: 'success' });
                                                                setMoodMoveEmotionId('');
                                                                setMoodMoveTargetParentId('');
                                                            }
                                                        });
                                                    }
                                                });
                                            }}
                                        >
                                            Move
                                        </button>
                                    </div>

                                    <div className={styles.moodOpsCard}>
                                        <h5><UniteSquareIcon size={18} weight="duotone" /> Merge emotion tags</h5>
                                        <label className={styles.moodOpsLabel}>Merge from</label>
                                        <div className={styles.moodOpsSelectWrapper}>
                                            <select
                                                className={styles.moodOpsSelect}
                                                value={moodMergeSourceId}
                                                onChange={(e) => setMoodMergeSourceId(e.target.value)}
                                            >
                                                <option value="">Select source…</option>
                                                {Object.entries(moodOpsData.emotionsByParent || {}).flatMap(([parentId, emotions]) => {
                                                    const parent = (moodOpsData.parents || []).find(p => String(p.id) === String(parentId));
                                                    const parentName = parent?.name || 'Unknown';
                                                    return (emotions || []).map(em => (
                                                        <option key={em.id} value={String(em.id)}>
                                                            {em.name} ({parentName})
                                                        </option>
                                                    ));
                                                })}
                                            </select>
                                            <CaretDownIcon size={20} weight="bold" className={styles.moodOpsSelectIcon} />
                                        </div>

                                        <label className={styles.moodOpsLabel}>Merge into</label>
                                        <div className={styles.moodOpsSelectWrapper}>
                                            <select
                                                className={styles.moodOpsSelect}
                                                value={moodMergeTargetId}
                                                onChange={(e) => setMoodMergeTargetId(e.target.value)}
                                            >
                                                <option value="">Select target…</option>
                                                {Object.entries(moodOpsData.emotionsByParent || {}).flatMap(([parentId, emotions]) => {
                                                    const parent = (moodOpsData.parents || []).find(p => String(p.id) === String(parentId));
                                                    const parentName = parent?.name || 'Unknown';
                                                    return (emotions || []).map(em => (
                                                        <option key={em.id} value={String(em.id)}>
                                                            {em.name} ({parentName})
                                                        </option>
                                                    ));
                                                })}
                                            </select>
                                            <CaretDownIcon size={20} weight="bold" className={styles.moodOpsSelectIcon} />
                                        </div>

                                        <button
                                            className={styles.moodOpsButtonDanger}
                                            disabled={!moodMergeSourceId || !moodMergeTargetId || moodMergeSourceId === moodMergeTargetId}
                                            onClick={async () => {
                                                const preview = await runMoodOp({ op: 'merge_preview', sourceEmotionTagId: moodMergeSourceId, targetEmotionTagId: moodMergeTargetId });
                                                if (!preview) return;

                                                showConfirm({
                                                    title: 'Confirm merge (Step 1/2)',
                                                    message: `Merge "${preview.source.name}" into "${preview.target.name}"?\n\nSource journals: (${preview.sourceLinks}) Target journals: (${preview.targetLinks}) Already having both: (${preview.overlap}) Journals with target after merge: (${preview.totalAfter}) After merge, the source tag is deleted.`,
                                                    confirmLabel: 'Continue',
                                                    onConfirm: () => {
                                                        showConfirm({
                                                            title: 'Really merge? (Step 2/2)',
                                                            message: `This is irreversible.\n\nProceed to merge and delete "${preview.source.name}"?`,
                                                            confirmLabel: 'Merge',
                                                            onConfirm: async () => {
                                                                const res = await runMoodOp({ op: 'merge_execute', sourceEmotionTagId: moodMergeSourceId, targetEmotionTagId: moodMergeTargetId });
                                                                if (!res) return;
                                                                await refreshAll();
                                                                showToast({ title: 'Merged', message: `"${preview.source.name}" merged into "${preview.target.name}".`, type: 'success' });
                                                                setMoodMergeSourceId('');
                                                                setMoodMergeTargetId('');
                                                            }
                                                        });
                                                    }
                                                });
                                            }}
                                        >
                                            Merge
                                        </button>
                                    </div>
                                </div>
                            </>
                        )
                    )}
                </div>

                {allTags.moods.map(mood => {
                    const uniqueTags = [...new Set(mood.tags)];
                    return (
                        <div key={mood.name} className={styles.moodGroup}>
                            <h4 style={{ color: mood.color }}>{mood.name}</h4>
                            <p className={styles.emotionDescription}>{mood.emotionDescription}</p>
                            <div className={styles.addForm}>
                                <input
                                    type="text"
                                    value={newTags[mood.name] || ''}
                                    onChange={(e) => setNewTags(prev => ({ ...prev, [mood.name]: e.target.value }))}
                                    placeholder={`Add emotion to ${mood.name}`}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag('moods', mood.name)}
                                />
                                <button onClick={() => handleAddTag('moods', mood.name)}><Plus size={20} weight="bold" /></button>
                            </div>
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
                            {category === 'activities' && <PersonSimpleBikeIcon size={28} weight="duotone" />}
                            {category === 'people' && <Users size={28} weight="duotone" />}
                            {category === 'places' && <MapTrifoldIcon size={28} weight="duotone" />}
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                        </h3>
                        <div className={styles.addForm}>
                            <input
                                type="text"
                                value={newTags[category] || ''}
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

            <div className={styles.importerSection}>
                <h3>Import from How We Feel</h3>
                <div className={styles.importControls}>
                    <div className={styles.fileInputWrapper}>

                        <input type="file" accept=".csv" onChange={handleImport} />
                    </div>
                    <p className={styles.description} style={{ marginBottom: "0px" }}>
                        Upload your "How We Feel" export. After initial import, you can map the raw mood text to your categories below.
                    </p>
                </div>

                {importSummary && (
                    <div className={styles.importSummary}>
                        <strong>Last Import Summary:</strong>
                        <ul>
                            <li>Total Rows: {importSummary.total}</li>
                            <li>Imported: {importSummary.imported}</li>
                            <li>Skipped: {importSummary.skipped} (Duplicates: {importSummary.reasons.duplicate}, Parse Errors: {importSummary.reasons.parse_error})</li>
                        </ul>
                        <button
                            className={`${styles.btn} ${styles.btnDismiss}`}
                            style={{ marginTop: '1rem', padding: '8px 16px', fontSize: '0.85rem' }}
                            onClick={handleDismissImport}
                        >
                            <Trash size={16} />
                            Dismiss and Clear Import
                        </button>
                    </div>
                )}

                {importSummary && importSummary.imported > 0 ? (
                    <div className={styles.assignmentSection}>
                        <h4 className={styles.subHeading}>Map Raw Moods ({(unassignedMoods || []).length} remaining)</h4>
                        <p className={styles.subDescription}>Select one or more raw mood strings from your import and assign them to a mood category.</p>

                        <div className={styles.assignmentSection}>
                            <h5 className={styles.subHeading}>Unassigned Moods ({(unassignedMoods || []).length})</h5>
                            <p className={styles.subDescription}>Select one or more pills and assign them to a parent category.</p>
                            <div className={styles.moodPillsContainer}>
                                {(unassignedMoods || []).length === 0 ? (
                                    <p className={styles.emptyText}>No unassigned moods remaining.</p>
                                ) : (
                                    (unassignedMoods || []).map(mood => (
                                        <span
                                            key={mood}
                                            className={`${styles.rawMoodPill} ${selectedMoods.includes(mood) ? styles.rawMoodPillSelected : ''}`}
                                            onClick={() => setSelectedMoods(prev => prev.includes(mood) ? prev.filter(m => m !== mood) : [...prev, mood])}
                                        >
                                            {mood}
                                        </span>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className={styles.matchedSection}>
                            <h5 className={styles.subHeading}>Automatically Matched ({(matchedMoods || []).length})</h5>
                            <p className={styles.subDescription}>These moods already exist in your library and will be linked automatically.</p>
                            <div className={styles.moodPillsContainer}>
                                {(matchedMoods || []).length === 0 ? (
                                    <p className={styles.emptyText}>No automatic matches found.</p>
                                ) : (
                                    (matchedMoods || []).map(mood => {
                                        const parentMood = allTags.moods.find(m => m.name === mood.parent);
                                        const customStyle = parentMood ? {
                                            backgroundColor: `${parentMood.color}15`,
                                            color: parentMood.color,
                                            borderColor: `${parentMood.color}40`
                                        } : {};
                                        return (
                                            <span
                                                key={mood.name}
                                                className={`${styles.rawMoodPill} ${styles.rawMoodPillMatched}`}
                                                style={customStyle}
                                            >
                                                <Check size={14} weight="bold" /> {mood.name} ({mood.parent})
                                                <button
                                                    className={styles.unassignBtn}
                                                    onClick={() => handleUnassignMood(mood.name)}
                                                    title="Unassign and move back to pending"
                                                >
                                                    <Plus size={14} style={{ transform: 'rotate(45deg)' }} />
                                                </button>
                                            </span>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        <div className={styles.finalActions}>
                            <button
                                className={`${styles.btn} ${styles.btnConfirmLarge}`}
                                onClick={handleFinalConfirm}
                                disabled={(unassignedMoods || []).length > 0}
                            >
                                <CheckCircleIcon size={32} weight="fill" />
                                {(unassignedMoods || []).length > 0
                                    ? `Map all moods to enable Confirm (${(unassignedMoods || []).length} left)`
                                    : `Confirm and Write ${importSummary.imported} Journals`
                                }
                            </button>
                        </div>

                        <div className={styles.assignmentActions}>
                            <span className={styles.subHeading} style={{ fontWeight: 600 }}>Assign selected to:</span>
                            <select
                                className={styles.selectCategory}
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                {allTags.moods.map(m => (
                                    <option key={m.name} value={m.name}>{m.name}</option>
                                ))}
                            </select>
                            <button
                                className={`${styles.btn} ${styles.btnPrimary}`}
                                onClick={handleAssignMoods}
                                disabled={(selectedMoods || []).length === 0}
                            >
                                <CheckCircleIcon size={24} weight="fill" />
                                Confirm Assignment
                            </button>
                        </div>

                        <div className={styles.aiAssistanceSection}>
                            <h5 className={styles.subHeading}>AI-Assisted Mapping</h5>
                            <p className={styles.subDescription}>For large imports, copy the pending list and paste it into ChatGPT/Claude. Then paste the JSON response below.</p>

                            <div className={styles.aiActions}>
                                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleCopyPrompt} style={{ justifyContent: 'center' }}>
                                    <ClipboardTextIcon size={24} weight="fill" />
                                    Step 1: Copy Prompt & Data for AI
                                </button>

                                <div style={{ width: '100%', marginTop: '1rem' }}>
                                    <label className={styles.subHeading} style={{ display: 'block', marginBottom: '12px', fontWeight: 600 }}>Step 2: Paste AI JSON Result here:</label>
                                    <textarea
                                        className={styles.aiTextArea}
                                        value={aiJsonInput}
                                        onChange={(e) => setAiJsonInput(e.target.value)}
                                        placeholder='{ "mappings": [...] }'
                                    />
                                    <button
                                        className={`${styles.btn} ${styles.btnPrimary}`}
                                        onClick={handleApplyAIPaste}
                                        disabled={!aiJsonInput.trim()}
                                        style={{ marginTop: '12px', justifyContent: 'center', background: 'var(--accent-color)' }}
                                    >
                                        <CheckCircleIcon size={24} weight="fill" />
                                        Step 3: Apply AI Mappings
                                    </button>
                                </div>

                                <div className={styles.fileInputWrapper} style={{ marginTop: '1rem' }}>
                                    <span className={styles.description}>Or upload JSON file: </span>
                                    <input type="file" accept=".json" onChange={handleUploadAIMappings} style={{ marginLeft: '10px' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : importSummary && (
                    <div className={styles.emptyImportState}>
                        <Check size={32} style={{ color: 'var(--accent-color)', marginBottom: '1rem' }} />
                        <p>No new journal entries were found in this file (they may already exist in your diary).</p>
                    </div>
                )}
            </div>
        </div>
    );
}

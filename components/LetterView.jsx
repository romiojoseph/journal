'use client';

import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
    Trash, Copy, Clock, TextB, TextUnderline, Highlighter, FloppyDisk, ArrowLeft,
    DownloadSimple, PencilSimple, X, Eye, EyeSlash, Calendar,
    ListBullets, ListNumbers
} from '@phosphor-icons/react';
import styles from '../styles/LetterDetail.module.css';
import { useModal } from '../context/ModalContext';
import { useToast } from '../context/ToastContext';
import FireAnimationOverlay from './FireAnimationOverlay';

// Format: Thursday, Jan 03, 2026 at 09:41 PM
function formatTimestamp(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayName = days[d.getDay()];
    const month = months[d.getMonth()];
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = String(hours % 12 || 12).padStart(2, '0');
    return `${dayName}, ${month} ${day}, ${year} at ${hour12}:${minutes} ${ampm}`;
}

function parseTimestampString(text) {
    if (!text) return null;
    const trimmed = String(text).trim();

    // Expected: Thursday, Jan 03, 2026 at 09:41 PM
    const m = trimmed.match(
        /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday),\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{2}),\s+(\d{4})\s+at\s+(\d{2}):(\d{2})\s+(AM|PM)$/
    );
    if (!m) return null;

    const monthMap = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
    const month = monthMap[m[2]];
    const day = Number(m[3]);
    const year = Number(m[4]);
    let hour = Number(m[5]);
    const minute = Number(m[6]);
    const ampm = m[7];

    if (ampm === 'PM' && hour !== 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;

    const d = new Date(year, month, day, hour, minute, 0, 0);
    return Number.isNaN(d.getTime()) ? null : d;
}

function TimestampPicker({ initialDate, selectedRef }) {
    const [selected, setSelected] = useState(initialDate);

    useEffect(() => {
        selectedRef.current = selected;
    }, [selected, selectedRef]);

    // Format for datetime-local: YYYY-MM-DDTHH:mm
    const toDatetimeLocal = (date) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    return (
        <div className={styles.tsPickerContainer}>
            <div className={styles.tsInputWrapper}>
                <Calendar size={20} className={styles.tsInputIcon} />
                <input
                    type="datetime-local"
                    className={styles.nativeTsInput}
                    value={toDatetimeLocal(selected)}
                    onChange={(e) => {
                        const d = new Date(e.target.value);
                        if (!isNaN(d.getTime())) setSelected(d);
                    }}
                />
            </div>
            <div className={styles.tsPreview}>
                <Clock size={14} />
                <span>{formatTimestamp(selected)}</span>
            </div>
        </div>
    );
}

// Convert legacy markdown-like syntax to HTML on first load
function legacyToHtml(text) {
    if (!text) return '';
    // Only skip if text already contains our timestamp divs (hashed class pattern)
    // Don't skip on innocent angle brackets like <3, <sigh>, etc.
    if (text.includes('data-ts="1"')) return text;
    
    // Check if text already contains HTML tags (excluding our timestamp pattern)
    const hasHtml = /<(?!\/?div[^>]*data-ts="1")[^>]+>/i.test(text);
    
    let html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Process ### timestamps (new format) - convert to timestamp divs
    html = html.replace(/^###\s+(.+)$/gm, (_, inner) =>
        `<div class="${styles.timestampHeading} ts-heading" data-ts="1" contenteditable="false">${inner}</div>`
    );
    // Process [timestamps] (legacy format) - still supported for existing letters
    html = html.replace(/\[([^\]]+)\]/g, (_, inner) =>
        `<div class="${styles.timestampHeading} ts-heading" data-ts="1" contenteditable="false">${inner}</div>`
    );
    
    html = html.replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/gs, '<u>$1</u>');
    html = html.replace(/==(.+?)==/gs, '<mark>$1</mark>');
    
    // Simple list detection (only if it doesn't already look like HTML)
    if (!hasHtml) {
        // Convert bullets
        html = html.replace(/^\s*[-*]\s+(.+)$/gm, '<ul><li>$1</li></ul>');
        // Convert numbered lists
        html = html.replace(/^\s*\d+\.\s+(.+)$/gm, '<ol><li>$1</li></ol>');
        // Merge consecutive ul/ol tags
        html = html.replace(/<\/ul>\s*<ul>/g, '');
        html = html.replace(/<\/ol>\s*<ol>/g, '');
        
        html = html.replace(/\n/g, '<br>');
    }
    return html;
}

// Convert editor HTML back to markdown for export
function htmlToMarkdown(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;

    function nodeToMd(node) {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent;
        if (node.nodeType !== Node.ELEMENT_NODE) return '';
        const tag = node.tagName.toLowerCase();
        const inner = Array.from(node.childNodes).map(nodeToMd).join('');
        if (tag === 'strong' || tag === 'b') return `**${inner}**`;
        if (tag === 'u') return `__${inner}__`;
        if (tag === 'mark') return `==${inner}==`;
        if (tag === 'br') return '\n';
        if (tag === 'ul' || tag === 'ol') return `\n${inner}\n`;
        if (tag === 'li') {
            const parent = node.parentNode?.tagName.toLowerCase();
            const prefix = parent === 'ol' ? '1. ' : '- ';
            return `${prefix}${inner}\n`;
        }
        // Treat common block elements as line-based containers.
        // This is important for pasted content where the browser inserts <div>/<p> per paragraph.
        if (tag === 'div' || tag === 'p') {
            if (node.dataset.ts === '1') {
                // Blank line before, single line break after (normalized later).
                return `\n\n### ${node.textContent.trim()}\n`;
            }
            const trimmedInner = inner.replace(/\n+$/g, '');
            return trimmedInner ? `${trimmedInner}\n` : '\n';
        }
        return inner;
    }

    const raw = Array.from(tmp.childNodes).map(nodeToMd).join('');
    // Keep interior spacing intact; only remove trailing whitespace/newlines.
    // Also normalize multiple blank lines around timestamps/pasted blocks.
    return raw.replace(/\s+$/g, '').replace(/\n{3,}/g, '\n\n');
}

export default function LetterView({ letter }) {
    const router = useRouter();
    const { showAlert, showConfirm, showModal, hideModal } = useModal();
    const { showToast } = useToast();
    const editorRef = useRef(null);
    const savedRangeRef = useRef(null);

    const [title, setTitle] = useState(letter.title);
    const [isSaving, setIsSaving] = useState(false);
    const [isDraftLoaded, setIsDraftLoaded] = useState(false);
    const [saveIndicator, setSaveIndicator] = useState('');
    const [wordCount, setWordCount] = useState(0);
    const [charCount, setCharCount] = useState(0);
    const [readOnly, setReadOnly] = useState(false);
    const [calendarHover, setCalendarHover] = useState(false);
    const [calendarTimestamps, setCalendarTimestamps] = useState([]);
    const [isDeleting, setIsDeleting] = useState(false);

    // Track last saved state for accurate "unsaved changes" detection
    const savedBodyRef = useRef(letter.body);
    const savedTitleRef = useRef(letter.title);

    // Timestamp popover state
    const [tsPopover, setTsPopover] = useState(null); // { el, x, y }
    const popoverRef = useRef(null);

    const updateCounts = useCallback(() => {
        if (!editorRef.current) return;
        const text = editorRef.current.innerText || '';
        setCharCount(text.length);
        setWordCount(text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0);
    }, []);

    // Save current HTML → markdown
    const handleSave = useCallback(async (showDoneIndicator = false, showToastAlert = false) => {
        setIsSaving(true);
        setSaveIndicator('saving');
        const html = editorRef.current?.innerHTML || '';
        const md = htmlToMarkdown(html);

        try {
            const res = await fetch(`/api/letters/${letter.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, body: md })
            });

            if (res.status === 403) {
                console.warn('Letter auto-save failed: Key missing');
                setSaveIndicator('');
                return;
            }

            if (res.ok) {
                savedBodyRef.current = md;
                savedTitleRef.current = title;
                if (showDoneIndicator) {
                    setSaveIndicator('saved');
                    setTimeout(() => setSaveIndicator(''), 2000);
                } else {
                    setSaveIndicator('');
                }
                
                if (showToastAlert) {
                    showToast({ title: 'Saved', message: 'Letter saved successfully.', type: 'success' });
                }
            } else {
                setSaveIndicator('');
                showToast({ title: 'Error', message: 'Failed to save letter.', type: 'error' });
            }
        } catch (err) {
            setSaveIndicator('');
            showToast({ title: 'Error', message: 'Failed to save letter.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    }, [letter.id, showToast, title]);

    // Auto-save every 5 seconds (DB ONLY)
    useEffect(() => {
        if (readOnly || !isDraftLoaded) return;
        
        const interval = setInterval(() => {
            const html = editorRef.current?.innerHTML || '';
            const md = htmlToMarkdown(html);
            const hasChanges = md !== savedBodyRef.current || title !== savedTitleRef.current;
            
            if (hasChanges && !isSaving) {
                handleSave(true, false); // Show indicator, but NO toast for auto-save
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [title, readOnly, isSaving, handleSave, isDraftLoaded]);

    useEffect(() => {
        if (!editorRef.current) return;
        const convertedHtml = legacyToHtml(letter.body);
        editorRef.current.innerHTML = convertedHtml;
        updateCounts();
        editorRef.current.focus();

        savedBodyRef.current = letter.body;
        savedTitleRef.current = letter.title;
        setIsDraftLoaded(true);
    }, [letter.body, letter.title, updateCounts]);

    // ESC key to exit read-only mode
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && readOnly) {
                setReadOnly(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [readOnly]);


    // Close popover on outside click
    useEffect(() => {
        const handler = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                setTsPopover(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    };

    const restoreSelection = () => {
        const sel = window.getSelection();
        if (savedRangeRef.current && sel) {
            sel.removeAllRanges();
            sel.addRange(savedRangeRef.current);
        }
    };

    // Handle Enter key to create <br> instead of <div>, unless in a list
    const handleEditorKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const node = selection.anchorNode;
                const element = node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
                if (element && element.closest && element.closest('li')) {
                    // Let the browser handle list item creation naturally
                    return;
                }
            }
            e.preventDefault();
            document.execCommand('insertLineBreak', false, null);
            updateCounts();
        }
    };

    // Strip external formatting on paste
    const handleEditorPaste = (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
        updateCounts();
    };

    // Click inside editor — detect timestamp heading clicks
    const handleEditorClick = (e) => {
        saveSelection();
        const tsEl = e.target.closest('[data-ts="1"]');
        if (tsEl) {
            e.preventDefault();
            const rect = tsEl.getBoundingClientRect();
            setTsPopover({ el: tsEl, x: rect.left, y: rect.bottom + 8 });
        } else {
            setTsPopover(null);
        }
    };

    const handleTsEdit = () => {
        if (!tsPopover) return;
        const current = tsPopover.el.textContent.trim();
        const parsed = parseTimestampString(current);
        const initial = parsed ?? new Date();
        const selectedRef = { current: initial };

        showModal({
            title: 'Edit timestamp',
            content: (
                <TimestampPicker initialDate={initial} selectedRef={selectedRef} />
            ),
            actions: [
                { label: 'Cancel', onClick: hideModal, variant: 'default' },
                {
                    label: 'Update', variant: 'primary', onClick: () => {
                        if (tsPopover.el) {
                            tsPopover.el.textContent = formatTimestamp(selectedRef.current);
                            updateCounts();
                        }
                        hideModal();
                        setTsPopover(null);
                    }
                }
            ]
        });
    };

    const handleTsDelete = () => {
        if (!tsPopover?.el) return;
        tsPopover.el.remove();
        setTsPopover(null);
        updateCounts();
    };

    const handleExit = useCallback(async () => {
        const md = htmlToMarkdown(editorRef.current?.innerHTML || '');
        const hasChanges = md !== savedBodyRef.current || title !== savedTitleRef.current;

        if (hasChanges) {
            showConfirm({
                title: 'Unsaved changes',
                message: 'You have unsaved changes. Save before leaving?',
                confirmLabel: 'Save',
                onConfirm: async () => {
                    await handleSave();
                    router.push('/letters');
                },
                cancelLabel: 'Discard',
                onCancel: () => router.push('/letters'),
            });
        } else {
            router.push('/letters');
        }
    }, [handleSave, router, showConfirm, title]);

    const handleDelete = () => {
        showConfirm({
            title: 'Burn this letter?',
            message: 'This action is permanent. The letter will be gone forever.',
            confirmLabel: 'Burn it',
            onConfirm: async () => {
                const res = await fetch(`/api/letters/${letter.id}`, { method: 'DELETE' });
                if (res.ok) {
                    setIsDeleting(true);
                } else {
                    showToast({ title: 'Error', message: 'Failed to delete letter.', type: 'error' });
                }
            }
        });
    };

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

    const handleCopy = () => {
        const md = htmlToMarkdown(editorRef.current?.innerHTML || '');
        navigator.clipboard.writeText(`${title}\n\n${md}`).then(() => {
            showToast({ title: 'Copied', message: 'Letter copied to clipboard.', type: 'success' });
        });
    };

    const handleExportMarkdown = () => {
        const md = htmlToMarkdown(editorRef.current?.innerHTML || '');
        const content = `# ${title}\n\n${md}`;
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const applyBold = (e) => {
        e.preventDefault();
        restoreSelection();
        editorRef.current?.focus();
        document.execCommand('bold', false, null);
        updateCounts();
    };

    const applyUnderline = (e) => {
        e.preventDefault();
        restoreSelection();
        editorRef.current?.focus();
        document.execCommand('underline', false, null);
        updateCounts();
    };

    const applyHighlight = (e) => {
        e.preventDefault();
        restoreSelection();
        editorRef.current?.focus();
        document.execCommand('hiliteColor', false, 'rgba(253, 214, 85, 0.22)');
        updateCounts();
    };
    
    const toggleBulletList = (e) => {
        e.preventDefault();
        restoreSelection();
        editorRef.current?.focus();
        document.execCommand('insertUnorderedList', false, null);
        updateCounts();
    };

    const toggleOrderedList = (e) => {
        e.preventDefault();
        restoreSelection();
        editorRef.current?.focus();
        document.execCommand('insertOrderedList', false, null);
        updateCounts();
    };

    const insertTimestamp = (e) => {
        e.preventDefault();
        restoreSelection();
        editorRef.current?.focus();

        const ts = formatTimestamp(new Date());
        const div = document.createElement('div');
        div.className = styles.timestampHeading;
        div.setAttribute('data-ts', '1');
        div.textContent = ts;
        div.contentEditable = 'false';

        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            const range = sel.getRangeAt(0);
            range.collapse(false);
            
            // Check if we're at the start of the editor (robust to nested DOM from paste)
            let beforeCursor = '';
            try {
                const pre = range.cloneRange();
                pre.selectNodeContents(editorRef.current);
                pre.setEnd(range.endContainer, range.endOffset);
                beforeCursor = pre.toString().trim();
            } catch {
                beforeCursor = (editorRef.current?.innerText || '').trim();
            }
            
            // Spacing rules:
            // - If not at the start, add a blank line before (two enters)
            // - After timestamp, add a single enter
            if (beforeCursor.length > 0) {
                range.insertNode(document.createElement('br'));
                range.collapse(false);
                range.insertNode(document.createElement('br'));
                range.collapse(false);
            }
            
            // Insert timestamp
            range.insertNode(div);
            range.collapse(false);
            
            // Add line break after timestamp
            range.insertNode(document.createElement('br'));
            range.collapse(false);
            
            // Position cursor after the timestamp
            sel.removeAllRanges();
            sel.addRange(range);
        }
        updateCounts();
    };

    const getTimestamps = () => {
        if (!editorRef.current) return [];
        return Array.from(editorRef.current.querySelectorAll('[data-ts="1"]')).map(el => el.textContent.trim());
    };

    const toggleReadOnly = () => {
        setReadOnly(prev => !prev);
        setTsPopover(null);
    };

    return (
        <div className={styles.editorOverlay}>
            {isDeleting && (
                <FireAnimationOverlay 
                    onComplete={() => {
                        setIsDeleting(false);
                        router.push('/letters');
                    }} 
                />
            )}
            {/* Header */}
            <div className={styles.editorHeader}>
                <button onClick={handleExit} className={`${styles.headerBtn} ${styles.headerBtnBack}`} title="Back to Letters">
                    <ArrowLeft size={20} weight="bold" />
                </button>
                <input
                    type="text"
                    className={styles.titleInput}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Letter title..."
                    readOnly={readOnly}
                />
                <div className={styles.headerRight}>
                    <span className={styles.charCount}>{charCount} chars &middot; {wordCount} words</span>
                    {saveIndicator === 'saving' && <span className={styles.saveStatus}>Saving&hellip;</span>}
                    {saveIndicator === 'saved' && <span className={`${styles.saveStatus} ${styles.saveStatusDone}`}>Saved</span>}

                    {/* Calendar timestamps hover */}
                    <div
                        className={styles.calendarWrap}
                        onMouseEnter={() => {
                            setCalendarTimestamps(getTimestamps());
                            setCalendarHover(true);
                        }}
                        onMouseLeave={() => setCalendarHover(false)}
                    >
                        <button className={styles.headerBtn} title="Timestamps in this letter">
                            <Calendar size={20} weight="bold" />
                        </button>
                        {calendarHover && (
                            <div className={styles.calendarPopover}>
                                {calendarTimestamps.length === 0 ? (
                                    <div className={styles.calendarPopoverEmpty}>No timestamps yet</div>
                                ) : (
                                    calendarTimestamps.map((ts, i) => (
                                        <div key={i} className={styles.calendarPopoverItem}>{ts}</div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Read-only toggle */}
                    <button
                        onClick={toggleReadOnly}
                        className={`${styles.headerBtn} ${readOnly ? styles.headerBtnActive : ''}`}
                        title={readOnly ? 'Exit read-only (Esc)' : 'Enter read-only mode'}
                    >
                        {readOnly ? <EyeSlash size={20} weight="bold" /> : <Eye size={20} weight="bold" />}
                    </button>

                    <button onClick={handleCopy} className={styles.headerBtn} title="Copy as plain text">
                        <Copy size={20} weight="bold" />
                    </button>
                    <button onClick={handleExportMarkdown} className={styles.headerBtn} title="Export as Markdown">
                        <DownloadSimple size={20} weight="bold" />
                    </button>
                    <button onClick={handleDelete} className={`${styles.headerBtn} ${styles.headerBtnDanger}`} title="Delete letter">
                        <Trash size={20} weight="bold" />
                    </button>
                </div>
            </div>

            {/* Contenteditable body */}
            <div
                ref={editorRef}
                className={`${styles.editor} ${readOnly ? styles.editorReadOnly : ''}`}
                contentEditable={!readOnly}
                suppressContentEditableWarning
                onInput={updateCounts}
                onMouseUp={handleEditorClick}
                onKeyUp={saveSelection}
                onKeyDown={handleEditorKeyDown}
                onPaste={handleEditorPaste}
                data-placeholder="Start writing&hellip;"
            />

            {/* Timestamp popover */}
            {tsPopover && (
                <div
                    ref={popoverRef}
                    className={styles.tsPopover}
                    style={{ left: tsPopover.x, top: tsPopover.y }}
                >
                    <button className={styles.tsPopoverBtn} onMouseDown={(e) => { e.preventDefault(); handleTsEdit(); }}>
                        <PencilSimple size={16} weight="bold" />
                        Edit
                    </button>
                    <button className={`${styles.tsPopoverBtn} ${styles.tsPopoverBtnDelete}`} onMouseDown={(e) => { e.preventDefault(); handleTsDelete(); }}>
                        <X size={16} weight="bold" />
                        Delete
                    </button>
                </div>
            )}

            {/* Floating toolbar */}
            {!readOnly && (
                <div className={styles.floatingToolbar}>
                    <button className={styles.toolButton} onMouseDown={insertTimestamp} title="Insert date stamp">
                        <Clock size={20} weight="duotone" />
                        <span>Timestamp</span>
                    </button>
                    <div className={styles.toolDivider} />
                    <button className={styles.toolButton} onMouseDown={applyBold} title="Bold">
                        <TextB size={20} weight="duotone" />
                    </button>
                    <button className={styles.toolButton} onMouseDown={applyUnderline} title="Underline">
                        <TextUnderline size={20} weight="duotone" />
                    </button>
                    <button className={styles.toolButton} onMouseDown={applyHighlight} title="Highlight">
                        <Highlighter size={20} weight="duotone" />
                    </button>
                    <div className={styles.toolDivider} />
                    <button className={styles.toolButton} onMouseDown={toggleBulletList} title="Bullet List">
                        <ListBullets size={20} weight="duotone" />
                    </button>
                    <button className={styles.toolButton} onMouseDown={toggleOrderedList} title="Numbered List">
                        <ListNumbers size={20} weight="duotone" />
                    </button>
                    <div className={styles.toolDivider} />
                    <button
                        className={`${styles.toolButton} ${styles.toolButtonSave}`}
                        onMouseDown={(e) => { e.preventDefault(); handleSave(true, true); }}
                        disabled={isSaving}
                        title="Save (Ctrl+S)"
                    >
                        <FloppyDisk size={20} weight="duotone" />
                        <span>Save</span>
                    </button>
                </div>
            )}
        </div>
    );
}
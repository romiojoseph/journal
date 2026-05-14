import { NextResponse } from 'next/server';
import db from '../../../lib/db';
import { getTags } from '../../../lib/tags.js';

// GET function to read all tag data from database
export async function GET() {
    try {
        const tags = await getTags();

        // Check for persistent import status
        const importSummaryRow = db.prepare("SELECT value FROM settings WHERE key = 'hvf_import_summary'").get();
        
        let importStatus = null;
        if (importSummaryRow) {
            const summary = JSON.parse(importSummaryRow.value);
            
            importStatus = {
                summary,
                rawMoods: summary.rawMoods || [],
                matchedMoods: summary.matchedMoods || []
            };
        }

        return NextResponse.json({ ...tags, importStatus });
    } catch (error) {
        console.error('Failed to read tags from database:', error);
        return NextResponse.json({ error: 'Failed to read tag data.' }, { status: 500 });
    }
}

// POST function to update tags in database
export async function POST(request) {
    try {
        const body = await request.json();
        const { op, category, data } = body ?? {};

        if (!category || !data) {
            // For op-based calls, `data` isn't used.
            if (!op) {
                return NextResponse.json({ error: 'Invalid category or data provided.' }, { status: 400 });
            }
        }

        const typeMap = {
            moods: 'mood',
            activities: 'activity',
            people: 'people',
            places: 'place',
        };
        const dbType = typeMap[category];

        if (!dbType) {
            return NextResponse.json({ error: 'Invalid tag category specified.' }, { status: 400 });
        }

        // ─────────────────────────────────────────────────────────────────────
        // Op-based API (non-destructive; preserves tag IDs and journal links)
        // ─────────────────────────────────────────────────────────────────────
        if (op) {
            const tx = db.transaction(() => {
                if (op === 'rename') {
                    const { oldName, newName } = body ?? {};
                    if (!oldName || !newName || !String(newName).trim()) {
                        throw new Error('Invalid rename payload.');
                    }

                    // Prevent collisions with existing tags of same type/name
                    const exists = db.prepare(
                        "SELECT id FROM tags WHERE type = ? AND name = ? LIMIT 1"
                    ).get(dbType, String(newName).trim());
                    if (exists) {
                        throw new Error('A tag with that name already exists.');
                    }

                    if (category === 'moods') {
                        // TagManager only renames emotion tags (not the parent moods).
                        db.prepare(
                            "UPDATE tags SET name = ? WHERE type = 'mood' AND name = ? AND parent_mood_id IS NOT NULL"
                        ).run(String(newName).trim(), oldName);
                    } else {
                        db.prepare(
                            "UPDATE tags SET name = ? WHERE type = ? AND name = ?"
                        ).run(String(newName).trim(), dbType, oldName);
                    }
                    return;
                }

                if (op === 'delete') {
                    const { name } = body ?? {};
                    if (!name) throw new Error('Invalid delete payload.');

                    if (category === 'moods') {
                        // Delete emotion tag only (keeps mood groups)
                        db.prepare(
                            "DELETE FROM tags WHERE type = 'mood' AND name = ? AND parent_mood_id IS NOT NULL"
                        ).run(name);
                    } else {
                        db.prepare("DELETE FROM tags WHERE type = ? AND name = ?").run(dbType, name);
                    }
                    return;
                }

                if (op === 'add') {
                    const { name, parentName } = body ?? {};
                    const cleanName = String(name || '').trim();
                    if (!cleanName) throw new Error('Tag name cannot be empty.');

                    if (category === 'moods') {
                        if (!parentName) throw new Error('Parent mood name is required.');
                        const moodRow = db.prepare("SELECT id FROM tags WHERE name = ? AND type = 'mood' AND parent_mood_id IS NULL").get(parentName);
                        if (!moodRow) throw new Error('Parent mood not found.');

                        const existing = db.prepare("SELECT id FROM tags WHERE name = ? AND type = 'mood'").get(cleanName);
                        if (existing) {
                            throw new Error('A tag with that name already exists.');
                        }

                        db.prepare("INSERT INTO tags (name, type, parent_mood_id) VALUES (?, 'mood', ?)").run(cleanName, moodRow.id);
                        return;
                    }

                    const existing = db.prepare("SELECT id FROM tags WHERE name = ? AND type = ?").get(cleanName, dbType);
                    if (existing) {
                        throw new Error('A tag with that name already exists.');
                    }

                    db.prepare("INSERT INTO tags (name, type) VALUES (?, ?)").run(cleanName, dbType);
                    return;
                }

                throw new Error('Unknown operation.');
            });

            try {
                tx();
            } catch (e) {
                const msg = e instanceof Error ? e.message : 'Tag operation failed.';
                return NextResponse.json({ error: msg }, { status: 400 });
            }

            return NextResponse.json({ message: 'OK', ...(await getTags()) });
        }

        // ─────────────────────────────────────────────────────────────────────
        // Legacy bulk API (made non-destructive to avoid wiping journal_tags)
        // ─────────────────────────────────────────────────────────────────────
        const transaction = db.transaction(() => {
            if (category === 'moods') {
                // Only upsert mood parents + emotion tags; do not delete rows.
                const insertMood = db.prepare("INSERT OR IGNORE INTO tags (name, type, description, color) VALUES (?, 'mood', ?, ?)");
                const updateMood = db.prepare("UPDATE tags SET description = ?, color = ? WHERE name = ? AND type = 'mood' AND parent_mood_id IS NULL");
                const getMoodId = db.prepare("SELECT id FROM tags WHERE name = ? AND type = 'mood' AND parent_mood_id IS NULL");
                const insertEmotion = db.prepare("INSERT OR IGNORE INTO tags (name, type, parent_mood_id) VALUES (?, 'mood', ?)");
                const updateEmotionParent = db.prepare("UPDATE tags SET parent_mood_id = ? WHERE name = ? AND type = 'mood' AND parent_mood_id IS NULL");

                for (const mood of data) {
                    insertMood.run(mood.name, mood.emotionDescription, mood.color);
                    updateMood.run(mood.emotionDescription, mood.color, mood.name);
                    const moodRow = getMoodId.get(mood.name);
                    if (!moodRow) continue;
                    for (const emotionTag of mood.tags || []) {
                        insertEmotion.run(emotionTag, moodRow.id);
                        updateEmotionParent.run(moodRow.id, emotionTag);
                    }
                }
            } else {
                // Sync tags by name: insert missing, delete removed.
                const incoming = Array.isArray(data) ? data.map(t => String(t).trim()).filter(Boolean) : [];
                const current = db.prepare("SELECT name FROM tags WHERE type = ?").all(dbType).map(r => r.name);

                const incomingSet = new Set(incoming);
                const currentSet = new Set(current);

                const insertTag = db.prepare("INSERT OR IGNORE INTO tags (name, type) VALUES (?, ?)");
                for (const name of incoming) {
                    if (!currentSet.has(name)) insertTag.run(name, dbType);
                }

                const deleteTag = db.prepare("DELETE FROM tags WHERE type = ? AND name = ?");
                for (const name of current) {
                    if (!incomingSet.has(name)) deleteTag.run(dbType, name);
                }
            }
        });

        transaction();
        return NextResponse.json({ message: `${category} updated successfully.` });
    } catch (error) {
        console.error(`Failed to update ${category}:`, error);
        return NextResponse.json({ error: 'Failed to update tag data.' }, { status: 500 });
    }
}
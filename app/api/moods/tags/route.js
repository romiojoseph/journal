import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { validateSession } from '@/lib/security';

function requireInt(value) {
    const n = Number(value);
    if (!Number.isInteger(n)) return null;
    return n;
}

export async function GET(request) {
    if (!await validateSession(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const parents = db.prepare(`
            SELECT id, name, description, color
            FROM tags
            WHERE type = 'mood' AND parent_mood_id IS NULL
            ORDER BY name
        `).all();

        const emotions = db.prepare(`
            SELECT id, name, parent_mood_id
            FROM tags
            WHERE type = 'mood' AND parent_mood_id IS NOT NULL
            ORDER BY name
        `).all();

        const byParent = {};
        for (const p of parents) byParent[p.id] = [];
        for (const e of emotions) {
            if (!byParent[e.parent_mood_id]) byParent[e.parent_mood_id] = [];
            byParent[e.parent_mood_id].push({ id: e.id, name: e.name });
        }

        return NextResponse.json({ parents, emotionsByParent: byParent });
    } catch (error) {
        console.error('Failed to load mood tags:', error);
        return NextResponse.json({ error: 'Failed to load mood tags.' }, { status: 500 });
    }
}

export async function POST(request) {
    if (!await validateSession(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { op } = body ?? {};

        if (op === 'move_preview' || op === 'move_execute') {
            const emotionTagId = requireInt(body?.emotionTagId);
            const targetParentMoodId = requireInt(body?.targetParentMoodId);
            if (!emotionTagId || !targetParentMoodId) {
                return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
            }

            const emotion = db.prepare(`
                SELECT id, name, parent_mood_id
                FROM tags
                WHERE id = ? AND type = 'mood' AND parent_mood_id IS NOT NULL
            `).get(emotionTagId);
            if (!emotion) {
                return NextResponse.json({ error: 'Mood emotion tag not found.' }, { status: 404 });
            }

            const targetParent = db.prepare(`
                SELECT id, name
                FROM tags
                WHERE id = ? AND type = 'mood' AND parent_mood_id IS NULL
            `).get(targetParentMoodId);
            if (!targetParent) {
                return NextResponse.json({ error: 'Target mood category not found.' }, { status: 404 });
            }

            const currentParent = db.prepare(`
                SELECT id, name
                FROM tags
                WHERE id = ? AND type = 'mood' AND parent_mood_id IS NULL
            `).get(emotion.parent_mood_id);

            const affected = db.prepare(`
                SELECT COUNT(*) as c
                FROM journal_tags
                WHERE tag_id = ?
            `).get(emotionTagId)?.c ?? 0;

            if (op === 'move_preview') {
                return NextResponse.json({
                    emotion: { id: emotion.id, name: emotion.name },
                    from: currentParent,
                    to: targetParent,
                    affectedJournals: affected,
                });
            }

            db.prepare(`
                UPDATE tags
                SET parent_mood_id = ?
                WHERE id = ? AND type = 'mood' AND parent_mood_id IS NOT NULL
            `).run(targetParentMoodId, emotionTagId);

            return NextResponse.json({ message: 'Moved.' });
        }

        if (op === 'merge_preview' || op === 'merge_execute') {
            const sourceEmotionTagId = requireInt(body?.sourceEmotionTagId);
            const targetEmotionTagId = requireInt(body?.targetEmotionTagId);
            if (!sourceEmotionTagId || !targetEmotionTagId || sourceEmotionTagId === targetEmotionTagId) {
                return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
            }

            const source = db.prepare(`
                SELECT id, name, parent_mood_id
                FROM tags
                WHERE id = ? AND type = 'mood' AND parent_mood_id IS NOT NULL
            `).get(sourceEmotionTagId);
            const target = db.prepare(`
                SELECT id, name, parent_mood_id
                FROM tags
                WHERE id = ? AND type = 'mood' AND parent_mood_id IS NOT NULL
            `).get(targetEmotionTagId);

            if (!source || !target) {
                return NextResponse.json({ error: 'Mood emotion tags not found.' }, { status: 404 });
            }

            const sourceLinks = db.prepare(`
                SELECT COUNT(*) as c
                FROM journal_tags
                WHERE tag_id = ?
            `).get(sourceEmotionTagId)?.c ?? 0;

            const targetLinks = db.prepare(`
                SELECT COUNT(*) as c
                FROM journal_tags
                WHERE tag_id = ?
            `).get(targetEmotionTagId)?.c ?? 0;

            const overlap = db.prepare(`
                SELECT COUNT(*) as c
                FROM journal_tags a
                JOIN journal_tags b ON a.journal_id = b.journal_id
                WHERE a.tag_id = ? AND b.tag_id = ?
            `).get(sourceEmotionTagId, targetEmotionTagId)?.c ?? 0;

            const totalAfter = targetLinks + sourceLinks - overlap;

            if (op === 'merge_preview') {
                return NextResponse.json({
                    source: { id: source.id, name: source.name },
                    target: { id: target.id, name: target.name },
                    sourceLinks,
                    targetLinks,
                    overlap,
                    totalAfter,
                });
            }

            const tx = db.transaction(() => {
                db.prepare(`
                    INSERT OR IGNORE INTO journal_tags (journal_id, tag_id)
                    SELECT journal_id, ?
                    FROM journal_tags
                    WHERE tag_id = ?
                `).run(targetEmotionTagId, sourceEmotionTagId);

                db.prepare("DELETE FROM journal_tags WHERE tag_id = ?").run(sourceEmotionTagId);
                db.prepare("DELETE FROM tags WHERE id = ? AND type = 'mood' AND parent_mood_id IS NOT NULL").run(sourceEmotionTagId);
            });

            tx();

            return NextResponse.json({ message: 'Merged.' });
        }

        return NextResponse.json({ error: 'Unknown operation.' }, { status: 400 });
    } catch (error) {
        console.error('Mood tag operation failed:', error);
        return NextResponse.json({ error: 'Operation failed.' }, { status: 500 });
    }
}


import { NextResponse } from 'next/server';
import db from '../../../../lib/db';
import { validateSession } from '../../../../lib/security';

export async function POST(request) {
    if (!await validateSession(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { assignments } = await request.json(); 
        if (!assignments || !assignments.categoryName || !assignments.rawMoods || assignments.rawMoods.length === 0) {
            return NextResponse.json({ error: 'Invalid assignments provided.' }, { status: 400 });
        }

        const { categoryName, rawMoods } = assignments;

        const transaction = db.transaction(() => {
            const parentMood = db.prepare("SELECT id FROM tags WHERE name = ? AND type = 'mood' AND parent_mood_id IS NULL").get(categoryName);
            if (!parentMood) throw new Error(`Parent mood "${categoryName}" not found.`);

            const findTagStmt = db.prepare("SELECT id, parent_mood_id FROM tags WHERE name = ? AND type = 'mood'");
            const insertTagStmt = db.prepare("INSERT INTO tags (name, type, parent_mood_id) VALUES (?, 'mood', ?)");
            const updateTagParentStmt = db.prepare("UPDATE tags SET parent_mood_id = ? WHERE id = ?");
            const updateMappingStmt = db.prepare("UPDATE temp_import_mood_mappings SET target_tag_id = ?, is_auto_matched = 0 WHERE raw_mood = ?");

            for (let rawMood of rawMoods) {
                rawMood = (rawMood || "").trim();
                if (!rawMood) continue;

                let tagRow = findTagStmt.get(rawMood);
                let tagId;
                if (tagRow) {
                    tagId = tagRow.id;
                    if (tagRow.parent_mood_id !== parentMood.id) {
                        updateTagParentStmt.run(parentMood.id, tagId);
                    }
                } else {
                    tagId = insertTagStmt.run(rawMood, parentMood.id).lastInsertRowid;
                }
                updateMappingStmt.run(tagId, rawMood);
            }

            // Update persistent summary
            const summaryRow = db.prepare("SELECT value FROM settings WHERE key = 'hvf_import_summary'").get();
            if (summaryRow) {
                const summary = JSON.parse(summaryRow.value);
                const newlyMatched = rawMoods.map(m => ({ name: m, parent: categoryName }));
                summary.matchedMoods = [...(summary.matchedMoods || []), ...newlyMatched].sort((a, b) => a.name.localeCompare(b.name));
                summary.rawMoods = (summary.rawMoods || []).filter(m => !rawMoods.includes(m));
                db.prepare("UPDATE settings SET value = ? WHERE key = 'hvf_import_summary'").run(JSON.stringify(summary));
            }
        });

        transaction();

        const updatedSummaryRow = db.prepare("SELECT value FROM settings WHERE key = 'hvf_import_summary'").get();
        const summary = updatedSummaryRow ? JSON.parse(updatedSummaryRow.value) : null;

        return NextResponse.json({ 
            message: 'Mappings updated in staging.',
            importStatus: summary ? {
                summary,
                rawMoods: summary.rawMoods || [],
                matchedMoods: summary.matchedMoods || []
            } : null
        });

    } catch (error) {
        console.error('Assignment failed:', error);
        return NextResponse.json({ error: error.message || 'Assignment failed.' }, { status: 500 });
    }
}

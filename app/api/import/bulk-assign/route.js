import { NextResponse } from 'next/server';
import db from '../../../../lib/db';
import { validateSession } from '../../../../lib/security';

export async function POST(request) {
    if (!await validateSession(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { mappings } = await request.json();
        if (!mappings || !Array.isArray(mappings)) {
            return NextResponse.json({ error: 'Invalid mappings format.' }, { status: 400 });
        }

        const transaction = db.transaction(() => {
            const findParentStmt = db.prepare("SELECT id FROM tags WHERE name = ? AND type = 'mood' AND parent_mood_id IS NULL");
            const findTagStmt = db.prepare("SELECT id, parent_mood_id FROM tags WHERE name = ? AND type = 'mood'");
            const insertTagStmt = db.prepare("INSERT INTO tags (name, type, parent_mood_id) VALUES (?, 'mood', ?)");
            const updateTagParentStmt = db.prepare("UPDATE tags SET parent_mood_id = ? WHERE id = ?");
            const updateMappingStmt = db.prepare("UPDATE temp_import_mood_mappings SET target_tag_id = ?, is_auto_matched = 0 WHERE raw_mood = ?");

            // Cache for parent IDs to avoid repeated lookups
            const parentIdMap = {};

            for (const item of mappings) {
                let { raw, target } = item;
                raw = (raw || "").trim();
                target = (target || "").trim();
                if (!raw || !target) continue;

                if (!parentIdMap[target]) {
                    const parent = findParentStmt.get(target);
                    if (parent) parentIdMap[target] = parent.id;
                }

                const parentId = parentIdMap[target];
                if (!parentId) continue;

                let tagRow = findTagStmt.get(raw);
                let tagId;
                if (tagRow) {
                    tagId = tagRow.id;
                    if (tagRow.parent_mood_id !== parentId) {
                        updateTagParentStmt.run(parentId, tagId);
                    }
                } else {
                    tagId = insertTagStmt.run(raw, parentId).lastInsertRowid;
                }

                // Update the mapping
                updateMappingStmt.run(tagId, raw);
            }

            // Update persistent summary
            const summaryRow = db.prepare("SELECT value FROM settings WHERE key = 'hvf_import_summary'").get();
            if (summaryRow) {
                const summary = JSON.parse(summaryRow.value);
                const newlyMatchedRaw = mappings.map(m => m.raw);
                
                // Re-build matchedMoods based on updated mappings
                const allMappings = db.prepare(`
                    SELECT m.raw_mood, t.name as tagName, p.name as parentName 
                    FROM temp_import_mood_mappings m
                    JOIN tags t ON m.target_tag_id = t.id
                    JOIN tags p ON t.parent_mood_id = p.id
                `).all();

                summary.matchedMoods = allMappings.map(m => ({ name: m.raw_mood, parent: m.parentName }));
                summary.rawMoods = summary.rawMoods.filter(m => !newlyMatchedRaw.includes(m));
                
                db.prepare("UPDATE settings SET value = ? WHERE key = 'hvf_import_summary'").run(JSON.stringify(summary));
            }
        });

        transaction();

        const updatedSummaryRow = db.prepare("SELECT value FROM settings WHERE key = 'hvf_import_summary'").get();
        const summary = updatedSummaryRow ? JSON.parse(updatedSummaryRow.value) : null;

        return NextResponse.json({ 
            message: 'Bulk mappings applied.',
            importStatus: summary ? {
                summary,
                rawMoods: summary.rawMoods || [],
                matchedMoods: summary.matchedMoods || []
            } : null
        });

    } catch (error) {
        console.error('Bulk assignment failed:', error);
        return NextResponse.json({ error: error.message || 'Bulk assignment failed.' }, { status: 500 });
    }
}

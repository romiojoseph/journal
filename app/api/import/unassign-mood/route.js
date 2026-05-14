import { NextResponse } from 'next/server';
import db from '../../../../lib/db';
import { validateSession } from '../../../../lib/security';

export async function POST(request) {
    if (!await validateSession(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { rawMood } = await request.json();
        if (!rawMood) {
            return NextResponse.json({ error: 'Raw mood name is required.' }, { status: 400 });
        }

        const transaction = db.transaction(() => {
            // Reset the mapping in the database
            db.prepare("UPDATE temp_import_mood_mappings SET target_tag_id = NULL, is_auto_matched = 0 WHERE raw_mood = ?").run(rawMood);

            // Update persistent summary in settings
            const summaryRow = db.prepare("SELECT value FROM settings WHERE key = 'hvf_import_summary'").get();
            if (summaryRow) {
                const summary = JSON.parse(summaryRow.value);
                
                // Add back to rawMoods if not already there
                if (!summary.rawMoods.includes(rawMood)) {
                    summary.rawMoods.push(rawMood);
                }
                
                // Remove from matchedMoods
                summary.matchedMoods = summary.matchedMoods.filter(m => m.name !== rawMood);
                
                db.prepare("UPDATE settings SET value = ? WHERE key = 'hvf_import_summary'").run(JSON.stringify(summary));
            }
        });

        transaction();

        const updatedSummaryRow = db.prepare("SELECT value FROM settings WHERE key = 'hvf_import_summary'").get();
        const summary = updatedSummaryRow ? JSON.parse(updatedSummaryRow.value) : null;

        return NextResponse.json({ 
            message: 'Mood unassigned.',
            importStatus: summary ? {
                summary,
                rawMoods: summary.rawMoods || [],
                matchedMoods: summary.matchedMoods || []
            } : null
        });

    } catch (error) {
        console.error('Unassignment failed:', error);
        return NextResponse.json({ error: error.message || 'Unassignment failed.' }, { status: 500 });
    }
}

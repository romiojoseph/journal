import { NextResponse } from 'next/server';
import db from '../../../../lib/db';
import { validateSession } from '../../../../lib/security';

export async function POST(request) {
    if (!await validateSession(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        db.transaction(() => {
            db.prepare("DELETE FROM temp_import_moods").run();
            db.prepare("DELETE FROM temp_import_rows").run();
            db.prepare("DELETE FROM temp_import_mood_mappings").run();
            db.prepare("DELETE FROM settings WHERE key = 'hvf_import_summary'").run();
        })();

        return NextResponse.json({ message: 'Import cleared successfully.' });
    } catch (error) {
        console.error('Failed to dismiss import:', error);
        return NextResponse.json({ error: 'Failed to dismiss import.' }, { status: 500 });
    }
}

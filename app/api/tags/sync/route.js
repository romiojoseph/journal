import { NextResponse } from 'next/server';
import db from '../../../../lib/db';
import fs from 'fs';
import path from 'path';

const getQuery = (fileName) => fs.readFileSync(path.join(process.cwd(), 'sql', fileName), 'utf8');

export async function POST(request) {
    try {
        const { action, category, oldTagName, newTagName } = await request.json();

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

        if (action === 'update') {
            if (!newTagName) return NextResponse.json({ error: 'New tag name is required for update.' }, { status: 400 });

            const sql = getQuery('update_tag_by_name_and_type.sql');
            db.prepare(sql).run(newTagName, oldTagName, dbType);

            return NextResponse.json({ message: 'Database tag updated successfully.' });

        } else if (action === 'delete') {
            const sql = getQuery('delete_tag_by_name_and_type.sql');
            db.prepare(sql).run(oldTagName, dbType);

            return NextResponse.json({ message: 'Database tag deleted successfully.' });

        } else {
            return NextResponse.json({ error: 'Invalid action specified.' }, { status: 400 });
        }

    } catch (error) {
        console.error('Failed to sync database tag:', error);
        return NextResponse.json({ error: 'Failed to sync database tag.' }, { status: 500 });
    }
}
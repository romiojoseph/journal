import db from '../../lib/db';
import fs from 'fs';
import path from 'path';
import DiaryPageClient from '../../components/DiaryPageClient';
import moodData from '../../data/moods.json';
import activityData from '../../data/activities.json';
import peopleData from '../../data/people.json';
import placeData from '../../data/places.json';

export const dynamic = 'force-dynamic';

function parseJournal(journal) {
    if (!journal) return null;
    const tagsArray = journal.tags ? journal.tags.split('|').map(tagString => ({ type: tagString.split(':')[0], name: tagString.split(':')[1] })) : [];
    const quotedJournal = journal.quoted_id ? { id: journal.quoted_id, content: journal.quoted_content, createdAt: journal.quoted_createdAt } : null;
    return {
        id: journal.id, content: journal.content, createdAt: journal.createdAt, isBookmarked: journal.isBookmarked,
        tags: tagsArray, quotedJournal: quotedJournal, follow_up_content: journal.follow_up_content || ''
    };
}

function getJournals() {
    try {
        const sql = fs.readFileSync(path.join(process.cwd(), 'sql', 'select_all_journals_with_tags.sql'), 'utf8');
        return db.prepare(sql).all().map(parseJournal);
    } catch (error) {
        console.error("Failed to fetch journals:", error);
        return [];
    }
}

export default function DiaryPage() {
    const journals = getJournals();

    const allTags = {
        moods: moodData.moods,
        activities: activityData.activities,
        people: peopleData.people,
        places: placeData.places
    };

    return (
        <DiaryPageClient initialJournals={journals} moodData={moodData} allTags={allTags} />
    );
}
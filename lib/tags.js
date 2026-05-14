import db from './db.js';

export async function getTags() {
    try {
        // Get all tags from database
        const allTagsStmt = db.prepare(`
            SELECT id, name, type, description, color, parent_mood_id
            FROM tags
            ORDER BY name
        `);
        const allTags = allTagsStmt.all();

        // Process moods separately to handle the complex structure
        const moods = [];
        const moodMap = new Map();
        
        // First pass: collect main moods
        for (const tag of allTags.filter(t => t.type === 'mood' && !t.parent_mood_id)) {
            const mood = {
                name: tag.name,
                emotionDescription: tag.description,
                color: tag.color,
                tags: []
            };
            moods.push(mood);
            moodMap.set(tag.id, mood);
        }
        
        // Second pass: add emotion tags to their parent moods
        for (const tag of allTags.filter(t => t.type === 'mood' && t.parent_mood_id)) {
            const parentMood = moodMap.get(tag.parent_mood_id);
            if (parentMood) {
                parentMood.tags.push(tag.name);
            }
        }
        
        // Sort emotion tags within each mood
        for (const mood of moods) {
            mood.tags.sort((a, b) => a.localeCompare(b));
        }

        // Get other tag types
        const activities = allTags
            .filter(t => t.type === 'activity')
            .map(t => t.name)
            .sort((a, b) => a.localeCompare(b));
            
        const people = allTags
            .filter(t => t.type === 'people')
            .map(t => t.name)
            .sort((a, b) => a.localeCompare(b));
            
        const places = allTags
            .filter(t => t.type === 'place')
            .map(t => t.name)
            .sort((a, b) => a.localeCompare(b));

        return {
            moods,
            activities,
            people,
            places,
        };
    } catch (error) {
        console.error('Failed to read tag data from database:', error);
        return {
            moods: [],
            activities: [],
            people: [],
            places: [],
        };
    }
}

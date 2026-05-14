import fs from 'fs';
import path from 'path';

let cachedSentences = null;

function loadSentences() {
    if (cachedSentences) return cachedSentences;
    const jsonPath = path.join(process.cwd(), 'context', 'sentence.json');
    if (!fs.existsSync(jsonPath)) return [];
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    cachedSentences = data.sentences || [];
    return cachedSentences;
}

/**
 * Calculates Euclidean distance between two vectors.
 */
function calculateDistance(v1, v2) {
    const keys = ['chill', 'happy', 'stress', 'tired'];
    let sum = 0;
    for (const key of keys) {
        const diff = (v1[key] || 0) - (v2[key] || 0);
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}

/**
 * Finds the closest mood sentence for a given set of tags.
 * Introduces variety by picking deterministically from equally close matches.
 * @param {Object} db - The database instance.
 * @param {Array} tags - Array of {name, type} tags.
 * @param {string} journalId - Used as a seed for stable variety.
 * @returns {Object|null} The closest sentence object {id, text, weights}.
 */
export function getClosestMoodSentence(db, tags, journalId = '') {
    const sentences = loadSentences();
    if (sentences.length === 0) return null;

    // 1. Filter mood tags and map to parent categories
    const moodTags = tags.filter(t => t.type === 'mood');
    if (moodTags.length === 0) return null;

    // Fetch all mood tags with their parent names from DB
    const moodMapping = db.prepare(`
        SELECT t.name, p.name as parentName
        FROM tags t
        JOIN tags p ON t.parent_mood_id = p.id
        WHERE t.type = 'mood' AND t.parent_mood_id IS NOT NULL
    `).all();

    // Also include the parents themselves
    const parents = db.prepare(`
        SELECT name FROM tags WHERE type = 'mood' AND parent_mood_id IS NULL
    `).all().map(p => p.name);

    const counts = { chill: 0, happy: 0, stress: 0, tired: 0 };
    let total = 0;

    for (const tag of moodTags) {
        let category = null;
        if (parents.includes(tag.name)) {
            category = tag.name.toLowerCase();
        } else {
            const mapping = moodMapping.find(m => m.name === tag.name);
            if (mapping) {
                category = mapping.parentName.toLowerCase();
            }
        }

        if (category && counts.hasOwnProperty(category)) {
            counts[category]++;
            total++;
        }
    }

    if (total === 0) return null;

    // 2. Normalize to ratios
    const userVector = {
        chill: counts.chill / total,
        happy: counts.happy / total,
        stress: counts.stress / total,
        tired: counts.tired / total
    };

    // 3. Find closest sentences
    let matches = [];
    let minDistance = Infinity;

    for (const sentence of sentences) {
        const distance = calculateDistance(userVector, sentence.weights);

        // Use a small epsilon for float comparison
        if (Math.abs(distance - minDistance) < 0.05) {
            matches.push(sentence);
        } else if (distance < minDistance) {
            minDistance = distance;
            matches = [sentence];
        }
    }

    if (matches.length === 0) return null;

    // 4. Stable selection based on journalId
    // Simple hash function
    let hash = 0;
    const str = journalId || 'default';
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }

    const index = Math.abs(hash) % matches.length;
    return matches[index];
}

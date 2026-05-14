/**
 * Resolves the color for a mood tag by checking both parent mood names
 * and their sub-tag arrays.
 * @param {string} tagName - The tag name to look up
 * @param {Array} moods - The moods array from getTags()
 * @returns {string|null} The hex color or null if not a mood
 */
export function getMoodColor(tagName, moods) {
    if (!moods || !Array.isArray(moods)) return null;
    for (const mood of moods) {
        if (mood.name === tagName || mood.tags.includes(tagName)) {
            return mood.color;
        }
    }
    return null;
}

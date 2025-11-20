import fs from 'fs/promises';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const fileNames = {
    moods: 'moods.json',
    activities: 'activities.json',
    people: 'people.json',
    places: 'places.json',
};

export async function getTags() {
    try {
        const moodsData = JSON.parse(await fs.readFile(path.join(dataDir, fileNames.moods), 'utf8'));
        const activitiesData = JSON.parse(await fs.readFile(path.join(dataDir, fileNames.activities), 'utf8'));
        const peopleData = JSON.parse(await fs.readFile(path.join(dataDir, fileNames.people), 'utf8'));
        const placesData = JSON.parse(await fs.readFile(path.join(dataDir, fileNames.places), 'utf8'));

        const sortedMoods = (moodsData.moods || []).map(mood => ({
            ...mood,
            tags: (mood.tags || []).sort((a, b) => a.localeCompare(b))
        }));

        return {
            moods: sortedMoods,
            activities: (activitiesData.activities || []).sort((a, b) => a.localeCompare(b)),
            people: (peopleData.people || []).sort((a, b) => a.localeCompare(b)),
            places: (placesData.places || []).sort((a, b) => a.localeCompare(b)),
        };
    } catch (error) {
        console.error('Failed to read tag data:', error);
        return {
            moods: [],
            activities: [],
            people: [],
            places: [],
        };
    }
}

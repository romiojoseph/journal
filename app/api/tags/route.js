import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const fileNames = {
    moods: 'moods.json',
    activities: 'activities.json',
    people: 'people.json',
    places: 'places.json',
};

// GET function to read all tag data from all files
export async function GET() {
    try {
        const moodsData = JSON.parse(await fs.readFile(path.join(dataDir, fileNames.moods), 'utf8'));
        const activitiesData = JSON.parse(await fs.readFile(path.join(dataDir, fileNames.activities), 'utf8'));
        const peopleData = JSON.parse(await fs.readFile(path.join(dataDir, fileNames.people), 'utf8'));
        const placesData = JSON.parse(await fs.readFile(path.join(dataDir, fileNames.places), 'utf8'));

        return NextResponse.json({
            moods: moodsData.moods || [],
            activities: activitiesData.activities || [],
            people: peopleData.people || [],
            places: placesData.places || [],
        });
    } catch (error) {
        console.error('Failed to read tag data:', error);
        return NextResponse.json({ error: 'Failed to read tag data.' }, { status: 500 });
    }
}

// POST function to update one of the tag files
export async function POST(request) {
    try {
        const { category, data } = await request.json();

        if (!category || !fileNames[category] || !data) {
            return NextResponse.json({ error: 'Invalid category or data provided.' }, { status: 400 });
        }

        const filePath = path.join(dataDir, fileNames[category]);
        let fileContent;

        // Moods have a different structure { "moods": [...] }
        if (category === 'moods') {
            fileContent = JSON.stringify({ moods: data }, null, 2);
        } else {
            // Others are { "category": [...] }
            fileContent = JSON.stringify({ [category]: data }, null, 2);
        }

        await fs.writeFile(filePath, fileContent, 'utf8');

        return NextResponse.json({ message: `${category} updated successfully.` });
    } catch (error) {
        console.error(`Failed to update ${category}:`, error);
        return NextResponse.json({ error: 'Failed to update tag data.' }, { status: 500 });
    }
}
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const mood = searchParams.get('mood')?.toLowerCase() || 'happy';
    
    // Map internal mood names to file names if necessary
    const moodMap = {
        'happy': 'happy',
        'chill': 'chill',
        'tired': 'tired',
        'stress': 'stressed'
    };

    const fileName = moodMap[mood] || 'happy';
    const filePath = path.join(process.cwd(), 'data', 'quotes', `${fileName}.json`);

    try {
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'Quote file not found' }, { status: 404 });
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');
        const quotes = JSON.parse(fileContent);
        
        if (!Array.isArray(quotes) || quotes.length === 0) {
            return NextResponse.json({ error: 'No quotes available' }, { status: 404 });
        }

        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        return NextResponse.json(randomQuote);
    } catch (error) {
        console.error('Failed to load quote:', error);
        return NextResponse.json({ error: 'Failed to load quote' }, { status: 500 });
    }
}

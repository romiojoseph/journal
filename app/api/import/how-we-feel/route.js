import { NextResponse } from 'next/server';
import db from '../../../../lib/db';
import { validateSession } from '../../../../lib/security';

function parseHowWeFeelDate(dateStr) {
    const months = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
        Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
    };
    const parts = dateStr.trim().split(/\s+/);
    if (parts.length < 6) return null;

    const year = parts[0];
    const month = months[parts[2]];
    const day = parts[3].padStart(2, '0');
    let [hours, minutes] = parts[4].split(':');
    const ampm = parts[5].toUpperCase();

    let h = parseInt(hours);
    if (ampm === 'PM' && h !== 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;
    const hourStr = String(h).padStart(2, '0');

    return `${year}-${month}-${day} ${hourStr}:${minutes}:00`;
}

function parseLine(line, delimiter) {
    const result = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                cur += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === delimiter && !inQuotes) {
            result.push(cur.trim());
            cur = "";
        } else {
            cur += char;
        }
    }
    result.push(cur.trim());
    return result;
}

export async function POST(request) {
    if (!await validateSession(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { tsvData } = await request.json();
        const cleanData = tsvData.replace(/^\ufeff/, '');
        const lines = cleanData.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
            return NextResponse.json({ error: 'CSV is empty or invalid.' }, { status: 400 });
        }

        const firstLine = lines[0];
        let delimiter = '\t';
        if (!firstLine.includes('\t') && firstLine.includes(',')) {
            delimiter = ',';
        }

        const headers = parseLine(firstLine, delimiter).map(h => h.toLowerCase());
        const dateIdx = headers.indexOf('date');
        const notesIdx = headers.indexOf('notes');
        const peopleIdx = headers.indexOf('tags (people)');
        const placesIdx = headers.indexOf('tags (places)');
        const eventsIdx = headers.indexOf('tags (events)');
        const moodIdx = headers.indexOf('mood');

        if (dateIdx === -1) {
            return NextResponse.json({ 
                error: `Required column "Date" not found. Found columns: ${headers.join(', ')}`,
                detectedDelimiter: delimiter === '\t' ? 'tab' : 'comma'
            }, { status: 400 });
        }

        let imported = 0;
        let skipped = 0;
        const skipReasons = { no_date: 0, duplicate: 0, parse_error: 0 };
        const rawMoodsSet = new Set();

        const transaction = db.transaction((rows) => {
            // Clear old staging
            db.prepare("DELETE FROM temp_import_rows").run();
            db.prepare("DELETE FROM temp_import_mood_mappings").run();
            db.prepare("DELETE FROM temp_import_moods").run();
            db.prepare("DELETE FROM settings WHERE key = 'hvf_import_summary'").run();

            const insertRowStmt = db.prepare("INSERT INTO temp_import_rows (content) VALUES (?)");
            const insertTempMoodStmt = db.prepare("INSERT OR IGNORE INTO temp_import_moods (journal_id, raw_mood) VALUES (?, ?)");
            const findJournalStmt = db.prepare("SELECT id FROM journals WHERE createdAt = ?");

            for (const line of rows) {
                const cols = parseLine(line, delimiter);
                const rawDate = cols[dateIdx];
                if (!rawDate) {
                    skipped++;
                    skipReasons.no_date++;
                    continue;
                }

                const dbDate = parseHowWeFeelDate(rawDate);
                if (!dbDate) {
                    skipped++;
                    skipReasons.parse_error++;
                    continue;
                }

                const exists = findJournalStmt.get(dbDate);
                if (exists) {
                    skipped++;
                    skipReasons.duplicate++;
                    continue;
                }

                // Store row for staging
                const rowId = insertRowStmt.run(JSON.stringify(cols)).lastInsertRowid;
                imported++;

                if (cols[moodIdx]) {
                    const moods = cols[moodIdx].split(';').map(m => m.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
                    for (const mood of moods) {
                        rawMoodsSet.add(mood);
                        // Using rowId as a temporary journal_id for mapping
                        insertTempMoodStmt.run(String(rowId), mood);
                    }
                }
            }
        });

        transaction(lines.slice(1));

        // Auto-match moods and build mappings
        const allRawMoods = Array.from(rawMoodsSet);
        const findMoodWithParentStmt = db.prepare(`
            SELECT t.id, t.name, p.name as parentName 
            FROM tags t 
            JOIN tags p ON t.parent_mood_id = p.id 
            WHERE LOWER(t.name) = LOWER(?) AND t.type = 'mood'
        `);
        const insertMappingStmt = db.prepare("INSERT OR REPLACE INTO temp_import_mood_mappings (raw_mood, target_tag_id, is_auto_matched) VALUES (?, ?, ?)");
        
        const matchedMoods = [];
        const unmatchedMoods = [];

        for (const mood of allRawMoods) {
            const match = findMoodWithParentStmt.get(mood);
            if (match) {
                insertMappingStmt.run(mood, match.id, 1);
                matchedMoods.push({ name: mood, parent: match.parentName });
            } else {
                insertMappingStmt.run(mood, null, 0);
                unmatchedMoods.push(mood);
            }
        }

        const summary = {
            total: lines.length - 1,
            imported,
            skipped,
            reasons: skipReasons,
            rawMoods: unmatchedMoods.sort(),
            matchedMoods: matchedMoods.sort((a, b) => a.name.localeCompare(b.name)),
            headers,
            dateIdx, notesIdx, peopleIdx, placesIdx, eventsIdx, moodIdx,
            delimiter
        };

        // Persist summary in settings
        db.prepare("INSERT INTO settings (key, value) VALUES ('hvf_import_summary', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(JSON.stringify(summary));

        return NextResponse.json({
            summary,
            rawMoods: summary.rawMoods,
            matchedMoods: summary.matchedMoods
        });

    } catch (error) {
        console.error('Import failed:', error);
        return NextResponse.json({ error: 'Import failed.' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import db from '../../../../lib/db';
import { validateSession, isPinEnabled, getEncryptionKey, encrypt } from '../../../../lib/security';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
    if (!await validateSession(request)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const sentencesPath = path.join(process.cwd(), 'context', 'sentence.json');
        const moodSentences = JSON.parse(fs.readFileSync(sentencesPath, 'utf8')).sentences || [];

        const summaryRow = db.prepare("SELECT value FROM settings WHERE key = 'hvf_import_summary'").get();
        if (!summaryRow) return NextResponse.json({ error: 'No staged import found.' }, { status: 400 });

        const summary = JSON.parse(summaryRow.value);
        const { dateIdx, notesIdx, peopleIdx, placesIdx, eventsIdx, moodIdx } = summary;

        const stagedRows = db.prepare("SELECT content FROM temp_import_rows").all();
        const moodMappings = db.prepare("SELECT raw_mood, target_tag_id FROM temp_import_mood_mappings").all().reduce((acc, row) => {
            acc[row.raw_mood] = row.target_tag_id;
            return acc;
        }, {});

        let finalImported = 0;

        const transaction = db.transaction(() => {
            const insertJournalStmt = db.prepare("INSERT INTO journals (id, content, createdAt, updatedAt, mood_sentence_id) VALUES (?, ?, ?, ?, ?)");
            const findTagStmt = db.prepare("SELECT id FROM tags WHERE name = ? AND type = ?");
            const insertTagStmt = db.prepare("INSERT INTO tags (name, type) VALUES (?, ?)");
            const linkTagStmt = db.prepare("INSERT OR IGNORE INTO journal_tags (journal_id, tag_id) VALUES (?, ?)");
            const getParentMoodStmt = db.prepare("SELECT p.name FROM tags t JOIN tags p ON t.parent_mood_id = p.id WHERE t.id = ?");

            for (const staged of stagedRows) {
                const cols = JSON.parse(staged.content);
                const journalId = crypto.randomUUID();
                const content = cols[notesIdx] || "";
                const dbDate = parseHowWeFeelDate(cols[dateIdx]);

                if (!dbDate) {
                    // Skip rows with unparseable dates in staging
                    continue;
                }

                // Collect matched tag IDs to find a sentence
                const matchedTagIds = [];
                if (cols[moodIdx]) {
                    const moods = cols[moodIdx].split(';').map(m => m.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
                    for (const mood of moods) {
                        const targetId = moodMappings[mood];
                        if (targetId) matchedTagIds.push(targetId);
                    }
                }

                // Determine mood sentence
                let moodSentenceId = null;
                if (matchedTagIds.length > 0) {
                    const parentMoods = matchedTagIds.map(id => getParentMoodStmt.get(id)?.name).filter(Boolean);
                    if (parentMoods.length > 0) {
                        const dominantParent = parentMoods[0].toLowerCase();
                        const prefixMap = {
                            'chill': 'pc',
                            'happy': 'ph',
                            'stress': 'ps',
                            'stressed': 'ps',
                            'tired': 'pt'
                        };
                        const targetPrefix = prefixMap[dominantParent];
                        
                        if (targetPrefix) {
                            const candidates = moodSentences.filter(s => s.id && s.id.startsWith(targetPrefix));
                            if (candidates.length > 0) {
                                moodSentenceId = candidates[Math.floor(Math.random() * candidates.length)].id;
                            }
                        }
                    }
                }

                let finalContent = content;
                if (isPinEnabled()) {
                    finalContent = encrypt(content, getEncryptionKey());
                }

                insertJournalStmt.run(journalId, finalContent, dbDate, dbDate, moodSentenceId);
                finalImported++;

                const handleTags = (raw, type) => {
                    if (!raw) return;
                    const tagNames = raw.split(';').map(t => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
                    for (const name of tagNames) {
                        let tagRow = findTagStmt.get(name, type);
                        let tagId = tagRow ? tagRow.id : insertTagStmt.run(name, type).lastInsertRowid;
                        linkTagStmt.run(journalId, tagId);
                    }
                };

                handleTags(cols[peopleIdx], 'people');
                handleTags(cols[placesIdx], 'place');
                handleTags(cols[eventsIdx], 'activity');

                for (const targetId of matchedTagIds) {
                    linkTagStmt.run(journalId, targetId);
                }
            }

            // Cleanup staging
            db.prepare("DELETE FROM temp_import_rows").run();
            db.prepare("DELETE FROM temp_import_mood_mappings").run();
            db.prepare("DELETE FROM temp_import_moods").run();
            db.prepare("DELETE FROM settings WHERE key = 'hvf_import_summary'").run();
        });

        transaction();

        return NextResponse.json({ message: `Successfully imported ${finalImported} entries with mood sentences.` });

    } catch (error) {
        console.error('Final import failed:', error);
        return NextResponse.json({ error: error.message || 'Final import failed.' }, { status: 500 });
    }
}

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
    return `${year}-${month}-${day} ${String(h).padStart(2, '0')}:${minutes}:00`;
}

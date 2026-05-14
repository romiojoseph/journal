import fs from 'fs';
import path from 'path';
import { getClosestMoodSentence } from './mood-scoring';

// ─────────────────────────────────────────────────────────────────────────────
// Migration definitions. Each migration runs EXACTLY ONCE, tracked by version.
// All migrations must be synchronous (better-sqlite3 is synchronous).
// ─────────────────────────────────────────────────────────────────────────────

const MIGRATIONS = [
    {
        version: 1,
        name: 'add_tag_metadata_columns',
        fn: (db) => {
            const cols = db.prepare("PRAGMA table_info(tags)").all().map(c => c.name);
            if (!cols.includes('description')) {
                db.exec("ALTER TABLE tags ADD COLUMN description TEXT");
            }
            if (!cols.includes('color')) {
                db.exec("ALTER TABLE tags ADD COLUMN color TEXT");
            }
            if (!cols.includes('parent_mood_id')) {
                db.exec("ALTER TABLE tags ADD COLUMN parent_mood_id INTEGER REFERENCES tags(id) ON DELETE SET NULL");
            }
        },
    },
    {
        version: 2,
        name: 'normalize_legacy_tag_types',
        fn: (db) => {
            const normalize = (legacyType, canonicalType) => {
                if (legacyType === canonicalType) return;
                const dupPairs = db.prepare(`
                    SELECT l.id AS legacy_id, c.id AS canonical_id
                    FROM tags l
                    JOIN tags c ON c.name = l.name AND c.type = ?
                    WHERE l.type = ?
                `).all(canonicalType, legacyType);

                for (const pair of dupPairs) {
                    db.prepare("INSERT OR IGNORE INTO journal_tags (journal_id, tag_id) SELECT journal_id, ? FROM journal_tags WHERE tag_id = ?").run(pair.canonical_id, pair.legacy_id);
                    db.prepare("DELETE FROM journal_tags WHERE tag_id = ?").run(pair.legacy_id);
                    db.prepare("DELETE FROM tags WHERE id = ?").run(pair.legacy_id);
                }
                db.prepare("UPDATE tags SET type = ? WHERE type = ?").run(canonicalType, legacyType);
            };
            db.prepare("UPDATE tags SET type = LOWER(TRIM(type)) WHERE type IS NOT NULL").run();
            db.prepare("UPDATE tags SET name = TRIM(name) WHERE name IS NOT NULL").run();

            normalize('activities', 'activity');
            normalize('places', 'place');
            normalize('person', 'people');
            normalize('persons', 'people');
            normalize('moods', 'mood');
        },
    },
    {
        version: 3,
        name: 'seed_tags_from_json',
        fn: (db) => {
            const dataDir = path.join(process.cwd(), 'data');
            const simpleFiles = [
                { file: 'activities.json', key: 'activities', type: 'activity' },
                { file: 'people.json', key: 'people', type: 'people' },
                { file: 'places.json', key: 'places', type: 'place' },
            ];
            for (const { file, key, type } of simpleFiles) {
                const filePath = path.join(dataDir, file);
                if (!fs.existsSync(filePath)) continue;
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                const insert = db.prepare('INSERT OR IGNORE INTO tags (name, type) VALUES (?, ?)');
                for (const name of data[key] || []) {
                    insert.run(name, type);
                }
            }
            const moodsPath = path.join(dataDir, 'moods.json');
            if (!fs.existsSync(moodsPath)) return;
            const moodsData = JSON.parse(fs.readFileSync(moodsPath, 'utf8'));
            const insertParent = db.prepare("INSERT OR IGNORE INTO tags (name, type, description, color) VALUES (?, 'mood', ?, ?)");
            const updateParent = db.prepare("UPDATE tags SET description = ?, color = ? WHERE name = ? AND type = 'mood' AND parent_mood_id IS NULL");
            const getParentId = db.prepare("SELECT id FROM tags WHERE name = ? AND type = 'mood' AND parent_mood_id IS NULL");
            const insertChild = db.prepare("INSERT OR IGNORE INTO tags (name, type, parent_mood_id) VALUES (?, 'mood', ?)");
            const linkChild = db.prepare("UPDATE tags SET parent_mood_id = ? WHERE name = ? AND type = 'mood' AND parent_mood_id IS NULL AND color IS NULL AND description IS NULL");

            for (const mood of moodsData.moods || []) {
                insertParent.run(mood.name, mood.emotionDescription, mood.color);
                updateParent.run(mood.emotionDescription, mood.color, mood.name);
                const parentRow = getParentId.get(mood.name);
                if (!parentRow) continue;
                const parentId = parentRow.id;
                for (const emotionTag of mood.tags || []) {
                    insertChild.run(emotionTag, parentId);
                    linkChild.run(parentId, emotionTag);
                }
            }
        },
    },
    {
        version: 4,
        name: 'migrate_letters_to_uuid',
        fn: (db) => {
            const tableInfo = db.prepare("PRAGMA table_info(letters)").all();
            if (tableInfo.length === 0) return;
            const idCol = tableInfo.find(col => col.name === 'id');
            if (!idCol || idCol.type.toUpperCase() !== 'INTEGER') return;
            db.exec(`
                ALTER TABLE letters RENAME TO letters_old;
                CREATE TABLE letters (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    body TEXT NOT NULL DEFAULT '',
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                INSERT INTO letters (id, title, body, createdAt, updatedAt)
                    SELECT CAST(id AS TEXT), title, body, createdAt, updatedAt FROM letters_old;
                DROP TABLE letters_old;
            `);
        },
    },
    {
        version: 5,
        name: 'migrate_journals_schema_to_text_id',
        fn: (db) => {
            const journalInfo = db.prepare("PRAGMA table_info(journals)").all();
            if (journalInfo.length === 0) return;
            const idCol = journalInfo.find(col => col.name === 'id');
            if (!idCol || idCol.type.toUpperCase() !== 'INTEGER') return;
            // Note: foreign_keys = OFF is handled by the migration runner
            db.exec(`
                ALTER TABLE follow_ups RENAME TO follow_ups_old;
                ALTER TABLE journal_tags RENAME TO journal_tags_old;
                ALTER TABLE journals RENAME TO journals_old;
                CREATE TABLE journals (
                    id TEXT PRIMARY KEY,
                    content TEXT NOT NULL,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    isBookmarked BOOLEAN DEFAULT 0,
                    quoted_journal_id TEXT,
                    FOREIGN KEY (quoted_journal_id) REFERENCES journals (id) ON DELETE SET NULL
                );
                CREATE TABLE journal_tags (
                    journal_id TEXT,
                    tag_id INTEGER,
                    PRIMARY KEY (journal_id, tag_id),
                    FOREIGN KEY (journal_id) REFERENCES journals (id) ON DELETE CASCADE,
                    FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
                );
                CREATE TABLE follow_ups (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    journal_id TEXT NOT NULL,
                    parent_id INTEGER,
                    content TEXT NOT NULL,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (journal_id) REFERENCES journals (id) ON DELETE CASCADE,
                    FOREIGN KEY (parent_id) REFERENCES follow_ups (id) ON DELETE CASCADE
                );
                INSERT INTO journals (id, content, createdAt, updatedAt, isBookmarked, quoted_journal_id)
                    SELECT CAST(id AS TEXT), content, createdAt, updatedAt, isBookmarked,
                           CASE WHEN quoted_journal_id IS NULL THEN NULL ELSE CAST(quoted_journal_id AS TEXT) END
                    FROM journals_old;
                INSERT INTO journal_tags (journal_id, tag_id)
                    SELECT CAST(journal_id AS TEXT), tag_id FROM journal_tags_old;
                INSERT INTO follow_ups (id, journal_id, parent_id, content, createdAt, updatedAt)
                    SELECT id, CAST(journal_id AS TEXT), parent_id, content, createdAt, updatedAt
                    FROM follow_ups_old;
                DROP TABLE follow_ups_old;
                DROP TABLE journal_tags_old;
                DROP TABLE journals_old;
            `);
        },
    },
    {
        version: 6,
        name: 'assign_journal_uuids',
        fn: (db) => {
            const allJournals = db.prepare("SELECT id FROM journals").all();
            const numericRows = allJournals.filter(row => /^\d+$/.test(row.id));
            if (numericRows.length === 0) return;
            const idMap = new Map();
            for (const row of numericRows) {
                idMap.set(row.id, crypto.randomUUID());
            }
            // Note: foreign_keys = OFF is handled by the migration runner
            const migrate = db.transaction(() => {
                for (const [oldId, newId] of idMap) {
                    db.prepare("UPDATE journal_tags SET journal_id = ? WHERE journal_id = ?").run(newId, oldId);
                    db.prepare("UPDATE follow_ups SET journal_id = ? WHERE journal_id = ?").run(newId, oldId);
                    db.prepare("UPDATE journals SET quoted_journal_id = ? WHERE quoted_journal_id = ?").run(newId, oldId);
                    db.prepare("UPDATE journals SET id = ? WHERE id = ?").run(newId, oldId);
                }
            });
            migrate();
        },
    },
    {
        version: 7,
        name: 'add_mood_sentence_id_to_journals',
        fn: (db) => {
            const cols = db.prepare("PRAGMA table_info(journals)").all().map(c => c.name);
            if (!cols.includes('mood_sentence_id')) {
                db.exec("ALTER TABLE journals ADD COLUMN mood_sentence_id TEXT");
            }
        },
    },
    {
        version: 10, // Bumped to 10 for variety logic
        name: 'backfill_mood_sentences_with_variety',
        fn: (db) => {
            console.log('  → Backfilling mood sentences with variety...');
            const journals = db.prepare(`
                SELECT j.id, GROUP_CONCAT(t.type || ':' || t.name, '|') AS tags
                FROM journals j
                LEFT JOIN journal_tags jt ON j.id = jt.journal_id
                LEFT JOIN tags t ON jt.tag_id = t.id
                GROUP BY j.id
            `).all();

            const updateStmt = db.prepare("UPDATE journals SET mood_sentence_id = ? WHERE id = ?");
            let count = 0;

            for (const journal of journals) {
                const tagsArray = journal.tags ? journal.tags.split('|').map(tagString => ({ 
                    type: tagString.split(':')[0], 
                    name: tagString.split(':')[1] 
                })) : [];
                
                const closest = getClosestMoodSentence(db, tagsArray, journal.id);
                if (closest) {
                    updateStmt.run(closest.id, journal.id);
                    count++;
                }
            }
            console.log(`  → Successfully backfilled ${count} / ${journals.length} journals with variety.`);
        },
    },
    {
        version: 11,
        name: 'create_temp_import_moods_table',
        fn: (db) => {
            db.exec(`
                CREATE TABLE IF NOT EXISTS temp_import_moods (
                    journal_id TEXT,
                    raw_mood TEXT,
                    PRIMARY KEY (journal_id, raw_mood)
                )
            `);
        },
    },
    {
        version: 12,
        name: 'create_staging_tables',
        fn: (db) => {
            db.exec(`
                CREATE TABLE IF NOT EXISTS temp_import_rows (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content TEXT
                );
                CREATE TABLE IF NOT EXISTS temp_import_mood_mappings (
                    raw_mood TEXT PRIMARY KEY,
                    target_tag_id INTEGER,
                    is_auto_matched INTEGER DEFAULT 0
                );
            `);
        }
    },
    {
        version: 13,
        name: 'remove_parent_id_from_follow_ups',
        fn: (db) => {
            const cols = db.prepare("PRAGMA table_info(follow_ups)").all().map(c => c.name);
            if (cols.includes('parent_id')) {
                console.log("  → Properly reconstructing follow_ups table to remove parent_id and its constraint...");
                // Note: foreign_keys = OFF is handled by the migration runner
                db.transaction(() => {
                    db.exec(`
                        ALTER TABLE follow_ups RENAME TO follow_ups_old;
                        CREATE TABLE follow_ups (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            journal_id TEXT NOT NULL,
                            content TEXT NOT NULL,
                            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                            FOREIGN KEY (journal_id) REFERENCES journals (id) ON DELETE CASCADE
                        );
                        INSERT INTO follow_ups (id, journal_id, content, createdAt, updatedAt)
                            SELECT id, journal_id, content, createdAt, updatedAt FROM follow_ups_old;
                        DROP TABLE follow_ups_old;
                    `);
                })();
            }
        }
    }
];

function detectCurrentVersion(db) {
    try {
        const row = db.prepare("SELECT value FROM settings WHERE key = 'db_version'").get();
        if (row) return parseInt(row.value, 10);
    } catch {}

    let detectedVersion = 0;
    try {
        const cols = db.prepare("PRAGMA table_info(tags)").all().map(c => c.name);
        if (cols.includes('description') && cols.includes('color') && cols.includes('parent_mood_id')) detectedVersion = 1;
    } catch {}
    if (detectedVersion < 1) return detectedVersion;
    try {
        const legacyCount = db.prepare("SELECT COUNT(*) as c FROM tags WHERE type IN ('activities', 'places', 'person', 'persons', 'moods')").get().c;
        if (legacyCount === 0) detectedVersion = 2;
    } catch {}
    if (detectedVersion < 2) return detectedVersion;
    try {
        const uncoloredParents = db.prepare("SELECT COUNT(*) as c FROM tags WHERE type = 'mood' AND parent_mood_id IS NULL AND color IS NULL").get().c;
        const totalMoods = db.prepare("SELECT COUNT(*) as c FROM tags WHERE type = 'mood'").get().c;
        if (totalMoods > 0 && uncoloredParents === 0) detectedVersion = 3;
    } catch {}
    if (detectedVersion < 3) return detectedVersion;
    try {
        const letterInfo = db.prepare("PRAGMA table_info(letters)").all();
        const idCol = letterInfo.find(c => c.name === 'id');
        if (!idCol || idCol.type.toUpperCase() !== 'INTEGER') detectedVersion = 4;
    } catch {}
    if (detectedVersion < 4) return detectedVersion;
    try {
        const journalInfo = db.prepare("PRAGMA table_info(journals)").all();
        const idCol = journalInfo.find(c => c.name === 'id');
        if (!idCol || idCol.type.toUpperCase() !== 'INTEGER') detectedVersion = 5;
    } catch {}
    if (detectedVersion < 5) return detectedVersion;
    try {
        const allJournals = db.prepare("SELECT id FROM journals").all();
        const numericRows = allJournals.filter(row => /^\d+$/.test(row.id));
        if (numericRows.length === 0) detectedVersion = 6;
    } catch {}
    if (detectedVersion < 6) return detectedVersion;
    try {
        const cols = db.prepare("PRAGMA table_info(journals)").all().map(c => c.name);
        if (cols.includes('mood_sentence_id')) detectedVersion = 7;
    } catch {}

    return detectedVersion;
}

export function runMigrations(db) {
    // IMPORTANT: PRAGMA foreign_keys is a no-op inside a transaction in SQLite.
    // Several migrations (v5, v6, v13) need FK checks disabled to restructure tables.
    // We disable FK enforcement BEFORE starting the exclusive transaction, and
    // re-enable it AFTER committing. This is safe because we hold an exclusive lock.
    db.pragma('foreign_keys = OFF');

    // Acquire an exclusive lock to prevent concurrent workers (e.g. during
    // `next build` with 15 workers) from racing each other on migrations.
    try {
        db.exec('BEGIN EXCLUSIVE');
    } catch (lockErr) {
        // If we can't acquire the lock, another worker is migrating right now.
        // We can safely skip — that worker will finish the job.
        db.pragma('foreign_keys = ON');
        if (lockErr.code === 'SQLITE_BUSY' || lockErr.code === 'SQLITE_LOCKED') {
            console.log('Database migration already in progress by another worker, skipping.');
            return;
        }
        throw lockErr;
    }

    try {
        // Re-detect inside the lock — another worker may have finished before us.
        let currentVersion = detectCurrentVersion(db);
        const pending = MIGRATIONS.filter(m => m.version > currentVersion);
        if (pending.length === 0) {
            db.prepare("INSERT INTO settings (key, value) VALUES ('db_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(String(MIGRATIONS[MIGRATIONS.length - 1].version));
            db.exec('COMMIT');
            db.pragma('foreign_keys = ON');
            return;
        }
        console.log(`Database at version ${currentVersion}. Running ${pending.length} migration(s)...`);
        for (const migration of pending) {
            console.log(`  [v${migration.version}] ${migration.name}`);
            try {
                migration.fn(db);
                db.prepare("INSERT INTO settings (key, value) VALUES ('db_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(String(migration.version));
                currentVersion = migration.version;
            } catch (error) {
                console.error(`  ✗ Migration v${migration.version} (${migration.name}) failed:`, error);
                db.exec('ROLLBACK');
                db.pragma('foreign_keys = ON');
                throw error;
            }
        }
        db.exec('COMMIT');
        db.pragma('foreign_keys = ON');
        console.log(`Database migrated to version ${currentVersion}.`);
    } catch (error) {
        // Ensure we don't leave a dangling transaction or FK checks disabled
        try { db.exec('ROLLBACK'); } catch { /* already rolled back */ }
        db.pragma('foreign_keys = ON');
        throw error;
    }
}

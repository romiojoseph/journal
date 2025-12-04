import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

// The global object is not affected by hot-reloading in development,
// making it the perfect place to store a single database instance.
const globalForDb = global;

const storagePath = path.join(process.cwd(), 'storage');
const dbPath = path.join(storagePath, 'journal.db');

// Check for the existence of the DB file *before* we do anything else.
const initialFileExists = fs.existsSync(dbPath);

fs.mkdirSync(storagePath, { recursive: true });

// If a database instance doesn't exist on the global object, create it.
// This block will only run ONCE per server start.
if (!globalForDb.db) {
    globalForDb.db = new Database(dbPath);
    globalForDb.isFirstLaunch = !initialFileExists;

    // Initialize the schema only when the new connection is made.
    try {
        const schemaPath = path.join(process.cwd(), 'sql', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        globalForDb.db.exec(schema);

        // Generate a unique server session ID for this run
        const serverSessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);

        // Store it in the settings table (upsert)
        const insertStmt = globalForDb.db.prepare(`
            INSERT INTO settings (key, value) VALUES ('server_session_id', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
        `);
        insertStmt.run(serverSessionId);

        if (globalForDb.isFirstLaunch) {
            console.log('New database created and schema initialized successfully.');
        }
    } catch (error) {
        console.error('Failed to initialize database schema:', error);
    }
}

const db = globalForDb.db;
export const isFirstLaunch = globalForDb.isFirstLaunch;

export default db;
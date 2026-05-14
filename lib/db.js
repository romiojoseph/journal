import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { runMigrations } from './migrations.js';

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

    // Allow SQLite to wait up to 5 seconds for locks instead of failing immediately.
    // Critical during `next build` where 15 workers hit the same DB file.
    globalForDb.db.pragma('busy_timeout = 5000');

    // Initialize the schema (CREATE TABLE IF NOT EXISTS — always safe to run).
    try {
        const schemaPath = path.join(process.cwd(), 'sql', 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        globalForDb.db.exec(schema);

        // Generate a unique server session ID for this run.
        // Always ensure settings table exists
        globalForDb.db.prepare('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)').run();

        // Generate a stable server session ID
        const existingSession = globalForDb.db.prepare('SELECT value FROM settings WHERE key = ?').get('server_session_id');
        if (!existingSession) {
            const serverSessionId = Date.now().toString(36) + Math.random().toString(36).substring(2);
            globalForDb.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('server_session_id', serverSessionId);
        }

        // Initialize vault_locked setting
        const existingVaultLocked = globalForDb.db.prepare('SELECT value FROM settings WHERE key = ?').get('vault_locked');
        if (!existingVaultLocked) {
            globalForDb.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('vault_locked', 'false');
        }

        // Run any pending database migrations.
        runMigrations(globalForDb.db);

        if (globalForDb.isFirstLaunch) {
            console.log('New database created and initialized successfully.');
        }
    } catch (error) {
        console.error('Failed to initialize database:', error);
    }
}

const db = globalForDb.db;
export const isFirstLaunch = globalForDb.isFirstLaunch;

export default db;

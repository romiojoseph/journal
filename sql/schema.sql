-- This file defines the database schema for the journal app.
-- We use "IF NOT EXISTS" to ensure these commands can be run safely multiple times.

-- The main table for journal entries
-- id is a UUID (TEXT) generated in application code
CREATE TABLE IF NOT EXISTS journals (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    isBookmarked BOOLEAN DEFAULT 0,
    quoted_journal_id TEXT,
    FOREIGN KEY (quoted_journal_id) REFERENCES journals (id) ON DELETE SET NULL
);

-- Table for all tags (moods, activities, etc.)
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'mood', 'activity', 'people', 'place'
    description TEXT, -- for mood descriptions
    color TEXT, -- for mood colors
    parent_mood_id INTEGER, -- for emotion tags linked to main moods
    CONSTRAINT unique_tag_name_type UNIQUE (name, type),
    FOREIGN KEY (parent_mood_id) REFERENCES tags (id) ON DELETE SET NULL
);

-- A "linking" table to connect journals with their tags (many-to-many relationship)
CREATE TABLE IF NOT EXISTS journal_tags (
    journal_id TEXT,
    tag_id INTEGER,
    PRIMARY KEY (journal_id, tag_id),
    FOREIGN KEY (journal_id) REFERENCES journals (id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
);

-- Table for follow-up notes, structured for threading
CREATE TABLE IF NOT EXISTS follow_ups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    journal_id TEXT NOT NULL,
    content TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (journal_id) REFERENCES journals (id) ON DELETE CASCADE
);


-- Table for application settings like the security PIN
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Table for letters (long-form, multi-session writing)
-- id is a UUID (TEXT) generated in application code
CREATE TABLE IF NOT EXISTS letters (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
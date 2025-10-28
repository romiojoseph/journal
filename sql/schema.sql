-- This file defines the database schema for the journal app.
-- We use "IF NOT EXISTS" to ensure these commands can be run safely multiple times.

-- The main table for journal entries
CREATE TABLE IF NOT EXISTS journals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    isBookmarked BOOLEAN DEFAULT 0,
    -- THIS IS THE NEW COLUMN --
    quoted_journal_id INTEGER,
    FOREIGN KEY (quoted_journal_id) REFERENCES journals (id) ON DELETE SET NULL
);

-- Table for all tags (moods, activities, etc.)
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'mood', 'activity', 'people', 'place'
    CONSTRAINT unique_tag_name_type UNIQUE (name, type)
);

-- A "linking" table to connect journals with their tags (many-to-many relationship)
CREATE TABLE IF NOT EXISTS journal_tags (
    journal_id INTEGER,
    tag_id INTEGER,
    PRIMARY KEY (journal_id, tag_id),
    FOREIGN KEY (journal_id) REFERENCES journals (id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
);

-- Table for follow-up notes, structured for threading
CREATE TABLE IF NOT EXISTS follow_ups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    journal_id INTEGER NOT NULL,
    parent_id INTEGER, -- NULL for a direct reply, or an ID for a reply-to-a-reply
    content TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (journal_id) REFERENCES journals (id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES follow_ups (id) ON DELETE CASCADE
);


-- Table for application settings like the security PIN
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);
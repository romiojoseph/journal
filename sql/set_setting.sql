-- This will insert a new setting or replace it if it already exists.
INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);
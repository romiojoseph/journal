-- Deletes a journal by its ID.
-- The 'ON DELETE CASCADE' in our schema will automatically delete associated journal_tags and follow_ups.
DELETE FROM journals WHERE id = ?;
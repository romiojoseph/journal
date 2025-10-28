-- This query cleverly toggles the boolean value.
-- isBookmarked = 1 becomes 0, and isBookmarked = 0 becomes 1.
UPDATE journals
SET isBookmarked = NOT isBookmarked
WHERE id = ?;
UPDATE journals
SET
    content = ?,
    updatedAt = CURRENT_TIMESTAMP,
    quoted_journal_id = NULL
WHERE
    id = ?;
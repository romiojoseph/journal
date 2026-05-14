UPDATE journals
SET
    content = ?,
    mood_sentence_id = ?,
    updatedAt = CURRENT_TIMESTAMP,
    quoted_journal_id = NULL
WHERE
    id = ?;
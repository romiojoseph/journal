UPDATE journals
SET
    content = ?,
    mood_sentence_id = ?,
    updatedAt = CURRENT_TIMESTAMP
WHERE
    id = ?;
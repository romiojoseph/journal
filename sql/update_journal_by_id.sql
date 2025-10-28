UPDATE journals
SET
    content = ?,
    updatedAt = CURRENT_TIMESTAMP
WHERE
    id = ?;
-- This query gets the creation date and tag details for every single tag on every journal.
SELECT
    j.createdAt,
    t.name,
    t.type
FROM
    journals j
JOIN
    journal_tags jt ON j.id = jt.journal_id
JOIN
    tags t ON jt.tag_id = t.id
ORDER BY
    j.createdAt ASC;
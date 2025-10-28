-- This query joins tags with their journal entries,
-- groups by the tag's name and type, and counts the occurrences.
SELECT
    t.name,
    t.type,
    COUNT(jt.journal_id) as count
FROM
    tags t
JOIN
    journal_tags jt ON t.id = jt.tag_id
GROUP BY
    t.id;
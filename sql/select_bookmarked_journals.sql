-- This is similar to our 'select all' query but filtered for bookmarks.
SELECT
    j.id,
    j.content,
    j.createdAt,
    j.updatedAt,
    j.isBookmarked,
    GROUP_CONCAT(t.type || ':' || t.name, '|') AS tags
FROM
    journals j
LEFT JOIN
    journal_tags jt ON j.id = jt.journal_id
LEFT JOIN
    tags t ON jt.tag_id = t.id
WHERE
    j.isBookmarked = 1
GROUP BY
    j.id
ORDER BY
    j.updatedAt DESC; -- Show most recently updated bookmarked items first
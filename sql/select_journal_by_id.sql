SELECT
    j.id,
    j.content,
    j.createdAt,
    j.updatedAt,
    j.isBookmarked,
    GROUP_CONCAT(t.type || ':' || t.name, '|') AS tags,
    qj.id as quoted_id,
    qj.content as quoted_content,
    qj.createdAt as quoted_createdAt
FROM
    journals j
LEFT JOIN
    journals qj ON j.quoted_journal_id = qj.id
LEFT JOIN
    journal_tags jt ON j.id = jt.journal_id
LEFT JOIN
    tags t ON jt.tag_id = t.id
WHERE
    j.id = ?
GROUP BY
    j.id;
SELECT
    j.id,
    j.content,
    j.createdAt,
    j.updatedAt,
    j.isBookmarked,
    j.mood_sentence_id,
    j.quoted_follow_up_id,
    GROUP_CONCAT(t.type || ':' || t.name, '|') AS tags,
    qj.id as quoted_id,
    qj.content as quoted_content,
    qj.createdAt as quoted_createdAt,
    qfu.id as quoted_follow_up_id,
    qfu.journal_id as quoted_follow_up_journal_id,
    qfu.content as quoted_follow_up_content,
    qfu.createdAt as quoted_follow_up_createdAt
FROM
    journals j
LEFT JOIN
    journals qj ON j.quoted_journal_id = qj.id
LEFT JOIN
    follow_ups qfu ON j.quoted_follow_up_id = qfu.id
LEFT JOIN
    journal_tags jt ON j.id = jt.journal_id
LEFT JOIN
    tags t ON jt.tag_id = t.id
WHERE
    j.id = ?
GROUP BY
    j.id;

-- This query now also aggregates the content of all follow-ups for each journal.
SELECT
    j.id,
    j.content,
    j.createdAt,
    j.updatedAt,
    j.isBookmarked,
    j.quoted_journal_id,
    j.quoted_follow_up_id,
    j.mood_sentence_id,
    GROUP_CONCAT(t.type || ':' || t.name, '|') AS tags,
    qj.id as quoted_id,
    qj.content as quoted_content,
    qj.createdAt as quoted_createdAt,
    qfu.id as quoted_follow_up_id,
    qfu.journal_id as quoted_follow_up_journal_id,
    qfu.content as quoted_follow_up_content,
    qfu.createdAt as quoted_follow_up_createdAt,
    (SELECT GROUP_CONCAT(fu.content, ' ') FROM follow_ups fu WHERE fu.journal_id = j.id) as follow_up_content,
    (SELECT COUNT(*) FROM follow_ups WHERE journal_id = j.id) as follow_up_count,
    (SELECT COUNT(*) FROM journals WHERE quoted_journal_id = j.id) as quote_count
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
GROUP BY
    j.id
ORDER BY
    j.createdAt DESC;

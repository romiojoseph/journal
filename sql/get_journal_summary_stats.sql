SELECT
    COUNT(*) as totalJournals,
    MIN(createdAt) as firstDate,
    MAX(createdAt) as lastDate
FROM
    journals;
import { NextResponse } from 'next/server';
import db from '../../../../lib/db';
import fs from 'fs';
import path from 'path';

const getQuery = (fileName) => {
    const filePath = path.join(process.cwd(), 'sql', fileName);
    return fs.readFileSync(filePath, 'utf8');
};

export async function PUT(request, { params }) {
    try {
        const resolvedParams = await params;
        const journalId = resolvedParams.id;
        const { content, tags, detachQuote } = await request.json();

        if (!content || !tags) {
            return NextResponse.json({ error: 'Content and tags are required.' }, { status: 400 });
        }

        const updateSql = detachQuote
            ? getQuery('update_journal_detach_quote.sql')
            : getQuery('update_journal_by_id.sql');

        const deleteTagsSql = getQuery('delete_tags_by_journal_id.sql');
        const findTagSql = getQuery('find_tag_by_name_and_type.sql');
        const insertTagSql = getQuery('insert_tag.sql');
        const linkTagSql = getQuery('link_journal_to_tag.sql');

        const transaction = db.transaction((data) => {
            db.prepare(updateSql).run(data.content, data.journalId);
            db.prepare(deleteTagsSql).run(data.journalId);

            const findTagStmt = db.prepare(findTagSql);
            const insertTagStmt = db.prepare(insertTagSql);
            const linkTagStmt = db.prepare(linkTagSql);

            for (const tag of data.tags) {
                let tagRecord = findTagStmt.get(tag.name, tag.type);
                let tagId = tagRecord ? tagRecord.id : insertTagStmt.run(tag.name, tag.type).lastInsertRowid;
                linkTagStmt.run(data.journalId, tagId);
            }
        });

        transaction({ content, tags, journalId });

        return NextResponse.json({ message: 'Journal updated successfully', journalId }, { status: 200 });
    } catch (error) {
        console.error('Failed to update journal:', error);
        return NextResponse.json({ error: 'Failed to update journal.' }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    try {
        const resolvedParams = await params;
        const journalId = resolvedParams.id;
        const deleteSql = getQuery('delete_journal_by_id.sql');

        const stmt = db.prepare(deleteSql);
        const result = stmt.run(journalId);

        if (result.changes === 0) {
            return NextResponse.json({ error: 'Journal not found or already deleted.' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Journal deleted successfully.' }, { status: 200 });
    } catch (error) {
        console.error('Failed to delete journal:', error);
        return NextResponse.json({ error: 'Failed to delete journal.' }, { status: 500 });
    }
}
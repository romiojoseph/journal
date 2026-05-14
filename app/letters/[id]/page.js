import db from '../../../lib/db';
import fs from 'fs';
import path from 'path';
import { notFound, redirect } from 'next/navigation';
import LetterView from '../../../components/LetterView';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

import { validateSession, isPinEnabled, getEncryptionKey, decrypt } from '../../../lib/security';

function getLetter(id) {
    try {
        const sql = fs.readFileSync(path.join(process.cwd(), 'sql', 'select_letter_by_id.sql'), 'utf8');
        const letter = db.prepare(sql).get(id);
        
        if (letter && isPinEnabled()) {
            const key = getEncryptionKey();
            letter.title = decrypt(letter.title, key);
            letter.body = decrypt(letter.body, key);
        }
        
        return letter;
    } catch (error) {
        console.error('Failed to fetch letter:', error);
        return null;
    }
}

export default async function LetterDetailPage({ params }) {
    if (!await validateSession({ cookies: cookies() })) {
        redirect('/access-vault');
    }

    const { id } = await params;
    const letter = getLetter(id);

    if (!letter) {
        notFound();
    }

    return <LetterView letter={letter} />;
}

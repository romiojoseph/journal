import db from '../../lib/db';
import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import LetterCard from '../../components/LetterCard';
import styles from '../../styles/LettersPage.module.css';
import { FeatherIcon, TextboxIcon } from '@phosphor-icons/react/dist/ssr';
import { validateSession } from '../../lib/security';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

import { isPinEnabled, getEncryptionKey, decrypt } from '../../lib/security';

function getLetters() {
    try {
        const sql = fs.readFileSync(path.join(process.cwd(), 'sql', 'select_all_letters.sql'), 'utf8');
        let letters = db.prepare(sql).all();
        
        if (isPinEnabled()) {
            const key = getEncryptionKey();
            letters = letters.map(l => ({ 
                ...l, 
                title: decrypt(l.title, key),
                body: decrypt(l.body, key) 
            }));
        }
        
        return letters;
    } catch (error) {
        console.error('Failed to fetch letters:', error);
        return [];
    }
}

export default async function LettersPage() {
    if (!await validateSession({ cookies: cookies() })) {
        redirect('/access-vault');
    }
    const letters = getLetters();

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Letters</h1>
                <Link href="/letters/new" className={styles.newButton}>
                    <FeatherIcon size={20} weight="duotone" />
                    New Letter
                </Link>
            </div>

            {letters.length === 0 ? (
                <div className={styles.empty}>
                    <p>Some things are better written than said. Write a letter you never have to send.</p>
                    <Link href="/letters/new" className={styles.newButton}>
                        <TextboxIcon size={20} weight="duotone" />
                        Try It
                    </Link>
                </div>
            ) : (
                <div className={styles.list}>
                    {letters.map(letter => (
                        <LetterCard key={letter.id} letter={letter} />
                    ))}
                </div>
            )}
        </div>
    );
}

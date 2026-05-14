import crypto from 'crypto';
import db from './db';

if (global.journalEncryptionKey === undefined) {
    global.journalEncryptionKey = null;
}

export const setEncryptionKey = (key) => {
    global.journalEncryptionKey = key;
};

export const getEncryptionKey = () => {
    return global.journalEncryptionKey;
};

export const clearEncryptionKey = () => {
    global.journalEncryptionKey = null;
};

export const isEncrypted = (text) => {
    if (!text) return false;
    const parts = text.split(':');
    if (parts.length !== 3) return false;
    return parts.every(part => /^[0-9a-fA-F]+$/.test(part));
};

export const getOrCreateEncryptionSalt = () => {
    const existing = db.prepare('SELECT value FROM settings WHERE key = ?').get('encryption_salt');
    if (existing?.value) return existing.value;
    const salt = crypto.randomBytes(32).toString('hex');
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('encryption_salt', ?)").run(salt);
    return salt;
};

export const deriveKey = (passphrase, salt) => {
    return crypto.pbkdf2Sync(passphrase, salt, 100000, 32, 'sha256');
};

export const hashPin = async (passphrase) => {
    const argon2 = await import('argon2');
    return argon2.hash(passphrase);
};

export const verifyPin = async (passphrase, storedHash) => {
    const argon2 = await import('argon2');
    return argon2.verify(storedHash, passphrase);
};

export const encrypt = (text, key) => {
    if (!text) return text;
    if (!key) throw new Error('Encryption key is not set');

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${encrypted}:${authTag}`;
};

export const decrypt = (encryptedText, key) => {
    if (!encryptedText) return encryptedText;

    if (!isEncrypted(encryptedText)) {
        return encryptedText;
    }

    if (!key) throw new Error('Encryption key is not set for decryption');

    const [ivHex, encryptedHex, authTagHex] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
};

export function migrateData(encrypting, key) {
    db.transaction(() => {
        const journals = db.prepare('SELECT id, content FROM journals').all();
        const updateJournal = db.prepare('UPDATE journals SET content = ? WHERE id = ?');
        for (const j of journals) {
            const alreadyEncrypted = isEncrypted(j.content);
            if (encrypting && !alreadyEncrypted) {
                updateJournal.run(encrypt(j.content, key), j.id);
            } else if (!encrypting && alreadyEncrypted) {
                updateJournal.run(decrypt(j.content, key), j.id);
            }
        }

        const followUps = db.prepare('SELECT id, content FROM follow_ups').all();
        const updateFollowUp = db.prepare('UPDATE follow_ups SET content = ? WHERE id = ?');
        for (const f of followUps) {
            const alreadyEncrypted = isEncrypted(f.content);
            if (encrypting && !alreadyEncrypted) {
                updateFollowUp.run(encrypt(f.content, key), f.id);
            } else if (!encrypting && alreadyEncrypted) {
                updateFollowUp.run(decrypt(f.content, key), f.id);
            }
        }

        const letters = db.prepare('SELECT id, title, body FROM letters').all();
        const updateLetter = db.prepare('UPDATE letters SET title = ?, body = ? WHERE id = ?');
        for (const l of letters) {
            const titleEncrypted = isEncrypted(l.title);
            const bodyEncrypted = isEncrypted(l.body);

            let finalTitle = l.title;
            let finalBody = l.body;

            if (encrypting) {
                if (!titleEncrypted) finalTitle = encrypt(l.title, key);
                if (!bodyEncrypted) finalBody = encrypt(l.body, key);
            } else {
                if (titleEncrypted) finalTitle = decrypt(l.title, key);
                if (bodyEncrypted) finalBody = decrypt(l.body, key);
            }

            updateLetter.run(finalTitle, finalBody, l.id);
        }

        // Migrate Journal Draft in settings table
        const getSetting = db.prepare('SELECT value FROM settings WHERE key = ?');
        const updateSetting = db.prepare('UPDATE settings SET value = ? WHERE key = ?');

        const row = getSetting.get('journal_draft_content');
        if (row?.value) {
            const alreadyEncrypted = isEncrypted(row.value);
            if (encrypting && !alreadyEncrypted) {
                updateSetting.run(encrypt(row.value, key), 'journal_draft_content');
            } else if (!encrypting && alreadyEncrypted) {
                updateSetting.run(decrypt(row.value, key), 'journal_draft_content');
            }
        }

        const followUpDraftsRow = getSetting.get('follow_up_drafts');
        if (followUpDraftsRow?.value) {
            let drafts = {};
            try {
                drafts = JSON.parse(followUpDraftsRow.value);
            } catch (e) {
                drafts = {};
            }

            const migrated = {};
            for (const [jid, draft] of Object.entries(drafts)) {
                const content = draft.content || '';
                if (!content) {
                    migrated[jid] = draft;
                    continue;
                }
                const alreadyEncrypted = isEncrypted(content);
                if (encrypting && !alreadyEncrypted) {
                    migrated[jid] = { ...draft, content: encrypt(content, key) };
                } else if (!encrypting && alreadyEncrypted) {
                    migrated[jid] = { ...draft, content: decrypt(content, key) };
                } else {
                    migrated[jid] = draft;
                }
            }
            updateSetting.run(JSON.stringify(migrated), 'follow_up_drafts');
        }
    })();
}

export const isPinEnabled = () => {
    try {
        const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('securityPinEnabled');
        return setting?.value === 'true';
    } catch (e) { return false; }
};

export const validateSession = async (request) => {
    if (!isPinEnabled()) return true;

    try {
        const cookies = await (request.cookies);
        if (!cookies || typeof cookies.get !== 'function') {
            return false;
        }

        const sessionCookie = cookies.get('journal-session')?.value;
        const serverSessionId = db.prepare('SELECT value FROM settings WHERE key = ?').get('server_session_id')?.value;

        const hasKey = !!global.journalEncryptionKey;

        return sessionCookie === serverSessionId && hasKey;
    } catch (error) {
        console.error('Session validation error:', error);
        return false;
    }
};
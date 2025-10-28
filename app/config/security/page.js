import SecurityManager from '../../../components/SecurityManager';
import db from '../../../lib/db';

export const dynamic = 'force-dynamic';

const getQuery = (fileName) => require('fs').readFileSync(require('path').join(process.cwd(), 'sql', fileName), 'utf8');

function getPinStatus() {
    try {
        const sql = getQuery('get_setting.sql');
        const setting = db.prepare(sql).get('securityPinEnabled');
        return setting?.value === 'true';
    } catch (e) {
        return false;
    }
}

export default function SecurityPage() {
    const isEnabled = getPinStatus();
    return <SecurityManager initialIsEnabled={isEnabled} />;
}
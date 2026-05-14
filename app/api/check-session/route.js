import { NextResponse } from 'next/server';
import { validateSession } from '../../../lib/security';

export async function GET(request) {
    const isValid = await validateSession(request);
    if (isValid) {
        return NextResponse.json({ authenticated: true });
    } else {
        return NextResponse.json({ authenticated: false }, { status: 401 });
    }
}

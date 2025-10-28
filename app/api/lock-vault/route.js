import { NextResponse } from 'next/server';

export async function POST() {
    try {
        const response = NextResponse.json({ message: 'Vault locked successfully.' });

        // Clear the session cookie by setting its expiration date to the past.
        response.cookies.set('journal-session', '', {
            httpOnly: true,
            path: '/',
            expires: new Date(0),
        });

        return response;
    } catch (error) {
        console.error('Lock Vault API error:', error);
        return NextResponse.json({ error: 'Failed to lock vault.' }, { status: 500 });
    }
}
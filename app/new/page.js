import { redirect } from 'next/navigation';

export default async function NewJournalPage({ searchParams }) {
    // 1. Await the searchParams promise to get the plain object inside.
    const resolvedSearchParams = await searchParams;

    // 2. Now, create the URLSearchParams object from the resolved, plain object.
    const params = new URLSearchParams(resolvedSearchParams);

    // 3. Convert it back into a string (e.g., "quoteId=112").
    const queryString = params.toString();

    // 4. Construct the full redirect path, including the query string if it exists.
    const redirectPath = `/${queryString ? `?${queryString}` : ''}`;

    // 5. Redirect to the homepage, now with the parameters correctly preserved.
    redirect(redirectPath);
}
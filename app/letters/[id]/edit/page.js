import { redirect } from 'next/navigation';

// Editing is now inline on the letter page via the mode toggle
export default async function EditLetterPage({ params }) {
    const { id } = await params;
    redirect(`/letters/${id}`);
}

import { NoteForm } from "./note-form";

export default async function NewNotePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">Catatan baru</h1>
      <NoteForm orgSlug={orgSlug} />
    </main>
  );
}

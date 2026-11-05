import { notFound } from "next/navigation";
import { isUuid } from "@/lib/notes";
import { createClient } from "@/lib/supabase/server";
import { NoteForm } from "../../new/note-form";

export default async function EditNotePage({ params }: { params: Promise<{ orgSlug: string; noteId: string }> }) {
  const { orgSlug, noteId } = await params;
  if (!isUuid(noteId)) notFound();

  const supabase = await createClient();
  const { data: org } = await supabase.from("organizations").select("id").eq("slug", orgSlug).maybeSingle();
  if (!org) notFound();

  const { data: note } = await supabase
    .from("notes")
    .select("id, title, body")
    .eq("id", noteId)
    .eq("organization_id", org.id)
    .maybeSingle();
  if (!note) notFound();

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">Edit catatan</h1>
      <NoteForm orgSlug={orgSlug} note={note} />
    </main>
  );
}

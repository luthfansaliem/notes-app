import { notFound } from "next/navigation";
import { canEditNote, isUuid } from "@/lib/notes";
import { createClient } from "@/lib/supabase/server";
import { NoteDetail } from "./note-detail";

export default async function NotePage({ params }: { params: Promise<{ orgSlug: string; noteId: string }> }) {
  const { orgSlug, noteId } = await params;
  if (!isUuid(noteId)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound(); // layout sudah mengalihkan ke /login; ini hanya penjaga tipe.

  // Isolasi oleh RLS: catatan organisasi lain tidak dikembalikan. Slug dicocokkan agar URL org lain tetap 404.
  const { data: org } = await supabase.from("organizations").select("id").eq("slug", orgSlug).maybeSingle();
  if (!org) notFound();

  const { data: note } = await supabase
    .from("notes")
    .select("id, organization_id, author_id, title, body, updated_at, author:profiles(full_name, email)")
    .eq("id", noteId)
    .eq("organization_id", org.id)
    .maybeSingle();
  if (!note) notFound();

  const { data: member } = await supabase
    .from("members")
    .select("role")
    .eq("organization_id", org.id)
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-3xl p-6">
      <NoteDetail note={note} orgSlug={orgSlug} canEdit={canEditNote(member?.role ?? null, note.author_id, user.id)} />
    </main>
  );
}

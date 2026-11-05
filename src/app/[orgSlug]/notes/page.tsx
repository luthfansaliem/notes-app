import { createClient } from "@/lib/supabase/server";
import { NotesList } from "./notes-list";

export default async function NotesPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  // Layout sudah memastikan organisasi milik user (404 bila bukan). `await params` dipertahankan
  // sesuai konvensi Next 16; tidak ada filter organisasi di sini: isolasi sepenuhnya oleh RLS.
  await params;
  const supabase = await createClient();
  const { data: notes, error } = await supabase
    .from("notes")
    .select("id, title, updated_at, author:profiles(full_name, email)")
    .order("updated_at", { ascending: false });

  if (error) throw new Error("Gagal memuat catatan.");

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      <h1 className="text-xl font-semibold">Catatan</h1>
      <NotesList notes={notes ?? []} />
    </main>
  );
}

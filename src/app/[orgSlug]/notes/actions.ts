"use server";

import { redirect } from "next/navigation";
import { parseNote } from "@/lib/notes";
import { createClient } from "@/lib/supabase/server";

export type NoteFormState = { error?: string; values?: { title: string; body: string } };

export async function createNote(orgSlug: string, _prev: NoteFormState, formData: FormData): Promise<NoteFormState> {
  const values = { title: String(formData.get("title") ?? ""), body: String(formData.get("body") ?? "") };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = parseNote(formData);
  if ("error" in parsed) return { error: parsed.error, values };

  // RLS hanya mengembalikan organisasi milik user; tidak ketemu berarti tidak punya akses.
  const { data: org } = await supabase.from("organizations").select("id").eq("slug", orgSlug).maybeSingle();
  if (!org) return { error: "Organisasi tidak ditemukan.", values };

  const { error } = await supabase
    .from("notes")
    .insert({ organization_id: org.id, author_id: user.id, title: parsed.title, body: parsed.body });
  if (error) return { error: "Gagal menyimpan catatan.", values };

  redirect(`/${orgSlug}/notes`);
}

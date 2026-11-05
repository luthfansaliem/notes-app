// Batas ini harus sama dengan check constraint di supabase/migrations/0004_notes.sql.
export const TITLE_MAX = 200;
export const BODY_MAX = 10000;

export type NoteInput = { title: string; body: string };

// char_length() Postgres menghitung code point, bukan UTF-16 unit seperti String.length.
function charLength(value: string): number {
  return Array.from(value).length;
}

export function validateNote(input: { title: string; body: string }): NoteInput | { error: string } {
  const title = input.title.trim();
  const body = input.body;

  if (charLength(title) < 1) return { error: "Judul wajib diisi." };
  if (charLength(title) > TITLE_MAX) return { error: `Judul maksimal ${TITLE_MAX} karakter.` };
  if (charLength(body) > BODY_MAX) return { error: `Isi maksimal ${BODY_MAX.toLocaleString("id-ID")} karakter.` };
  return { title, body };
}

export function parseNote(formData: FormData): NoteInput | { error: string } {
  return validateNote({
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

// Hanya untuk menampilkan tombol; penegakan sebenarnya oleh RLS (lihat migrasi 0005).
export function canEditNote(role: string | null, authorId: string | null, userId: string): boolean {
  if (role === "owner" || role === "admin") return true;
  return role === "member" && authorId !== null && authorId === userId;
}

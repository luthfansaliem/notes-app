import Link from "next/link";

export type NoteListItem = {
  id: string;
  title: string;
  updated_at: string;
  author: { full_name: string | null; email: string | null } | null;
};

export function authorName(author: NoteListItem["author"]): string {
  return author?.full_name?.trim() || author?.email || "Mantan anggota";
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(
    new Date(iso),
  );
}

export function NotesList({ notes, orgSlug }: { notes: NoteListItem[]; orgSlug: string }) {
  if (notes.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-gray-300 p-6 text-center text-gray-600">
        Belum ada catatan.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-gray-200 rounded-md border border-gray-200 bg-white">
      {notes.map((note) => (
        <li key={note.id} className="flex items-baseline justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <Link href={`/${orgSlug}/notes/${note.id}`} className="block truncate font-medium hover:underline">
              {note.title}
            </Link>
            <p className="text-sm text-gray-600">{authorName(note.author)}</p>
          </div>
          <time dateTime={note.updated_at} className="shrink-0 text-sm text-gray-500">
            {formatDate(note.updated_at)}
          </time>
        </li>
      ))}
    </ul>
  );
}

import Link from "next/link";
import { DeleteButton } from "./delete-button";
import { authorName, type NoteListItem } from "../notes-list";

export type NoteDetailData = {
  id: string;
  title: string;
  body: string;
  updated_at: string;
  author: NoteListItem["author"];
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(
    new Date(iso),
  );
}

export function NoteDetail({ note, orgSlug, canEdit }: { note: NoteDetailData; orgSlug: string; canEdit: boolean }) {
  return (
    <article className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-xl font-semibold break-words">{note.title}</h1>
        {canEdit && (
          <Link
            href={`/${orgSlug}/notes/${note.id}/edit`}
            className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            Edit
          </Link>
        )}
      </div>
      <p className="text-sm text-gray-600">
        {authorName(note.author)} · diubah{" "}
        <time dateTime={note.updated_at}>{formatDate(note.updated_at)}</time>
      </p>
      <p className="whitespace-pre-wrap break-words">{note.body}</p>
      {canEdit && <DeleteButton orgSlug={orgSlug} noteId={note.id} />}
      <Link href={`/${orgSlug}/notes`} className="inline-block text-blue-600 underline">
        Kembali ke daftar
      </Link>
    </article>
  );
}

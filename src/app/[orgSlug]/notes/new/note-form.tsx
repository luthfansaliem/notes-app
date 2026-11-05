"use client";

import Link from "next/link";
import { useActionState } from "react";
import { BODY_MAX, TITLE_MAX } from "@/lib/notes";
import { createNote, type NoteFormState } from "../actions";

const initial: NoteFormState = {};

export function NoteForm({ orgSlug }: { orgSlug: string }) {
  const [state, action, pending] = useActionState(createNote.bind(null, orgSlug), initial);

  return (
    <form className="space-y-4" action={action}>
      <div>
        <label htmlFor="title" className="block text-sm font-medium">
          Judul
        </label>
        <input
          id="title"
          name="title"
          type="text"
          defaultValue={state.values?.title}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
        />
      </div>
      <div>
        <label htmlFor="body" className="block text-sm font-medium">
          Isi
        </label>
        <textarea
          id="body"
          name="body"
          rows={10}
          defaultValue={state.values?.body}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"
        />
        <p className="mt-1 text-xs text-gray-500">
          Judul maksimal {TITLE_MAX} karakter, isi maksimal {BODY_MAX.toLocaleString("id-ID")} karakter.
        </p>
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-md bg-gray-900 px-4 py-2 text-white disabled:opacity-50">
          Simpan
        </button>
        <Link href={`/${orgSlug}/notes`} className="rounded-md border border-gray-300 px-4 py-2">
          Batal
        </Link>
      </div>
    </form>
  );
}

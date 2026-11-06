"use client";

import { useActionState, useState } from "react";
import { deleteNote } from "../actions";

type State = { error?: string };

export function DeleteButton({ orgSlug, noteId }: { orgSlug: string; noteId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState<State>(() => deleteNote(orgSlug, noteId), {});

  if (!confirming) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700"
        >
          Hapus
        </button>
        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={action} role="alertdialog" aria-labelledby="hapus-judul" className="space-y-2 rounded-md border border-red-300 p-3">
      <p id="hapus-judul" className="text-sm">
        Hapus catatan ini secara permanen? Tindakan ini tidak bisa dibatalkan.
      </p>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">
          Ya, hapus
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
        >
          Batal
        </button>
      </div>
    </form>
  );
}

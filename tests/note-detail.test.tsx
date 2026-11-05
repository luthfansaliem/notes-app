import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NoteDetail } from "@/app/[orgSlug]/notes/[noteId]/note-detail";
import { canEditNote } from "@/lib/notes";

vi.mock("@/app/[orgSlug]/notes/actions", () => ({
  createNote: vi.fn(async () => ({})),
  updateNote: vi.fn(async () => ({})),
}));

import { NoteForm } from "@/app/[orgSlug]/notes/new/note-form";

afterEach(cleanup);

const note = {
  id: "n1",
  title: "Rapat",
  body: "baris 1\nbaris 2",
  updated_at: "2026-11-05T10:00:00Z",
  author: { full_name: "Siti", email: "siti@x.id" },
};

describe("NoteDetail", () => {
  it("menampilkan judul, isi, penulis, dan tombol edit bila canEdit", () => {
    render(<NoteDetail note={note} orgSlug="acme" canEdit />);
    expect(screen.getByRole("heading", { name: "Rapat" })).toBeInTheDocument();
    expect(screen.getByText(/baris 1/)).toBeInTheDocument();
    expect(screen.getByText(/Siti/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute("href", "/acme/notes/n1/edit");
  });

  it("menyembunyikan tombol edit bila tidak boleh mengubah", () => {
    render(<NoteDetail note={note} orgSlug="acme" canEdit={false} />);
    expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();
  });
});

describe("canEditNote", () => {
  it("owner dan admin boleh semua; member hanya miliknya; bukan anggota tidak", () => {
    expect(canEditNote("owner", "other", "me")).toBe(true);
    expect(canEditNote("admin", "other", "me")).toBe(true);
    expect(canEditNote("member", "me", "me")).toBe(true);
    expect(canEditNote("member", "other", "me")).toBe(false);
    expect(canEditNote("member", null, "me")).toBe(false);
    expect(canEditNote(null, "me", "me")).toBe(false);
  });
});

describe("NoteForm mode edit", () => {
  it("terisi awal dan batal kembali ke detail", () => {
    render(<NoteForm orgSlug="acme" note={{ id: "n1", title: "Rapat", body: "isi" }} />);
    expect(screen.getByLabelText("Judul")).toHaveValue("Rapat");
    expect(screen.getByLabelText("Isi")).toHaveValue("isi");
    expect(screen.getByRole("link", { name: "Batal" })).toHaveAttribute("href", "/acme/notes/n1");
  });
});

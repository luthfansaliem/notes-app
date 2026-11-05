import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { authorName, NotesList, type NoteListItem } from "@/app/[orgSlug]/notes/notes-list";

const notes: NoteListItem[] = [
  { id: "1", title: "Terbaru", updated_at: "2026-11-05T10:00:00Z", author: { full_name: "Siti", email: "siti@x.id" } },
  { id: "2", title: "Tanpa nama", updated_at: "2026-11-04T10:00:00Z", author: { full_name: null, email: "budi@x.id" } },
  { id: "3", title: "Nama kosong", updated_at: "2026-11-03T10:00:00Z", author: { full_name: "  ", email: "ani@x.id" } },
  { id: "4", title: "Terlama", updated_at: "2026-11-02T10:00:00Z", author: null },
];

afterEach(cleanup);

describe("NotesList", () => {
  it("menampilkan catatan sesuai urutan yang diberikan, lengkap dengan penulis dan tanggal", () => {
    render(<NotesList notes={notes} />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => within(li).getByText(/Terbaru|Tanpa nama|Nama kosong|Terlama/).textContent)).toEqual([
      "Terbaru",
      "Tanpa nama",
      "Nama kosong",
      "Terlama",
    ]);
    const first = items[0];
    if (!first) throw new Error("daftar kosong");
    expect(within(first).getByText("Siti")).toBeInTheDocument();
    expect(within(first).getByText(/5 Nov 2026/)).toBeInTheDocument();
  });

  it("memakai email bila nama kosong dan 'Mantan anggota' bila penulis tidak ada", () => {
    render(<NotesList notes={notes} />);
    expect(screen.getByText("budi@x.id")).toBeInTheDocument();
    expect(screen.getByText("ani@x.id")).toBeInTheDocument();
    expect(screen.getByText("Mantan anggota")).toBeInTheDocument();
  });

  it("menampilkan tampilan kosong bila belum ada catatan", () => {
    render(<NotesList notes={[]} />);
    expect(screen.getByText("Belum ada catatan.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});

describe("authorName", () => {
  it("menolak profil tanpa nama dan email", () => {
    expect(authorName({ full_name: null, email: null })).toBe("Mantan anggota");
  });
});

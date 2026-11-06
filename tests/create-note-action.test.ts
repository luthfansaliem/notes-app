import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));

const insert = vi.fn();
const selectAfterUpdate = vi.fn();
const selectAfterDelete = vi.fn();
const del = vi.fn(() => ({ eq: () => ({ select: selectAfterDelete }) }));
const update = vi.fn(() => ({ eq: () => ({ select: selectAfterUpdate }) }));
let user: { id: string } | null = { id: "user-1" };
let org: { id: string } | null = { id: "org-1" };
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user } }) },
    from: (table: string) =>
      table === "organizations"
        ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: org }) }) }) }
        : { insert, update, delete: del },
  }),
}));

import { createNote, deleteNote, updateNote } from "@/app/[orgSlug]/notes/actions";

function form(title: string, body = "") {
  const fd = new FormData();
  fd.set("title", title);
  fd.set("body", body);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  user = { id: "user-1" };
  org = { id: "org-1" };
  insert.mockResolvedValue({ error: null });
});

describe("createNote", () => {
  it("inserts with author_id from the user and redirects to the list", async () => {
    await expect(createNote("acme", {}, form("  Judul  ", "isi"))).rejects.toThrow("REDIRECT:/acme/notes");
    expect(insert).toHaveBeenCalledWith({ organization_id: "org-1", author_id: "user-1", title: "Judul", body: "isi" });
  });

  it("returns validation error for empty title and does not insert", async () => {
    const res = await createNote("acme", {}, form("   "));
    expect(res.error).toBe("Judul wajib diisi.");
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects title longer than 200 characters", async () => {
    const res = await createNote("acme", {}, form("a".repeat(201)));
    expect(res.error).toMatch(/maksimal 200/);
    expect(insert).not.toHaveBeenCalled();
  });

  it("redirects to /login without a user and does not insert", async () => {
    user = null;
    await expect(createNote("acme", {}, form("Judul"))).rejects.toThrow("REDIRECT:/login");
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns an error when the organization is not accessible", async () => {
    org = null;
    const res = await createNote("acme", {}, form("Judul"));
    expect(res.error).toBe("Organisasi tidak ditemukan.");
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns an error when insert fails", async () => {
    insert.mockResolvedValue({ error: { code: "42501" } });
    const res = await createNote("acme", {}, form("Judul"));
    expect(res.error).toBe("Gagal menyimpan catatan.");
  });
});

describe("updateNote", () => {
  beforeEach(() => {
    selectAfterUpdate.mockResolvedValue({ data: [{ id: "n1" }], error: null });
  });

  it("hanya mengirim judul dan isi lalu redirect ke detail", async () => {
    await expect(updateNote("acme", "n1", {}, form("  Baru ", "isi"))).rejects.toThrow("REDIRECT:/acme/notes/n1");
    expect(update).toHaveBeenCalledWith({ title: "Baru", body: "isi" });
  });

  it("galat validasi tidak memanggil update", async () => {
    const res = await updateNote("acme", "n1", {}, form("  "));
    expect(res.error).toBe("Judul wajib diisi.");
    expect(update).not.toHaveBeenCalled();
  });

  it("0 baris terubah (ditolak RLS) menampilkan galat jelas", async () => {
    selectAfterUpdate.mockResolvedValue({ data: [], error: null });
    const res = await updateNote("acme", "n1", {}, form("Judul"));
    expect(res.error).toMatch(/tidak berhak/);
  });

  it("tanpa user diarahkan ke /login", async () => {
    user = null;
    await expect(updateNote("acme", "n1", {}, form("Judul"))).rejects.toThrow("REDIRECT:/login");
    expect(update).not.toHaveBeenCalled();
  });
});

describe("deleteNote", () => {
  beforeEach(() => {
    selectAfterDelete.mockResolvedValue({ data: [{ id: "n1" }], error: null });
  });

  it("menghapus lalu redirect ke daftar", async () => {
    await expect(deleteNote("acme", "n1")).rejects.toThrow("REDIRECT:/acme/notes");
    expect(del).toHaveBeenCalled();
  });

  it("tanpa user diarahkan ke /login dan tidak menghapus", async () => {
    user = null;
    await expect(deleteNote("acme", "n1")).rejects.toThrow("REDIRECT:/login");
    expect(del).not.toHaveBeenCalled();
  });

  it("0 baris terhapus (ditolak RLS) menampilkan galat jelas", async () => {
    selectAfterDelete.mockResolvedValue({ data: [], error: null });
    const res = await deleteNote("acme", "n1");
    expect(res.error).toMatch(/tidak berhak/);
  });

  it("galat database menampilkan galat umum", async () => {
    selectAfterDelete.mockResolvedValue({ data: null, error: { code: "XX000" } });
    const res = await deleteNote("acme", "n1");
    expect(res.error).toBe("Gagal menghapus catatan.");
  });
});

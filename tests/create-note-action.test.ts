import { beforeEach, describe, expect, it, vi } from "vitest";

const redirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));

const insert = vi.fn();
let user: { id: string } | null = { id: "user-1" };
let org: { id: string } | null = { id: "org-1" };
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user } }) },
    from: (table: string) =>
      table === "organizations"
        ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: org }) }) }) }
        : { insert },
  }),
}));

import { createNote } from "@/app/[orgSlug]/notes/actions";

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

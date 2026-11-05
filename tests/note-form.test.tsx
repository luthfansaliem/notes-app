import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/[orgSlug]/notes/actions", () => ({
  createNote: vi.fn(async () => ({})),
}));

import { NoteForm } from "@/app/[orgSlug]/notes/new/note-form";

afterEach(cleanup);

describe("NoteForm", () => {
  it("renders title, body, submit and cancel link", () => {
    render(<NoteForm orgSlug="acme" />);
    expect(screen.getByLabelText("Judul")).toBeInTheDocument();
    expect(screen.getByLabelText("Isi")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Simpan" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Batal" })).toHaveAttribute("href", "/acme/notes");
  });

  it("shows validation error returned by the action and keeps input", async () => {
    const actions = await import("@/app/[orgSlug]/notes/actions");
    vi.mocked(actions.createNote).mockResolvedValueOnce({
      error: "Judul wajib diisi.",
      values: { title: "", body: "isi saya" },
    });
    const { default: userEvent } = await import("@testing-library/user-event");
    render(<NoteForm orgSlug="acme" />);
    await userEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Judul wajib diisi.");
    expect(screen.getByLabelText("Isi")).toHaveValue("isi saya");
  });
});

import { describe, expect, it } from "vitest";
import { BODY_MAX, parseNote, TITLE_MAX, validateNote } from "@/lib/notes";

describe("validateNote", () => {
  it("menerima judul dan isi yang sah", () => {
    expect(validateNote({ title: "Rapat", body: "Agenda" })).toEqual({ title: "Rapat", body: "Agenda" });
  });
  it("menolak judul kosong", () => {
    expect(validateNote({ title: "", body: "" })).toEqual({ error: "Judul wajib diisi." });
  });
  it("menolak judul spasi saja", () => {
    expect(validateNote({ title: "  \t ", body: "" })).toEqual({ error: "Judul wajib diisi." });
  });
  it("menerima judul 200 karakter, menolak 201", () => {
    expect(validateNote({ title: "x".repeat(TITLE_MAX), body: "" })).not.toHaveProperty("error");
    expect(validateNote({ title: "x".repeat(TITLE_MAX + 1), body: "" })).toEqual({
      error: "Judul maksimal 200 karakter.",
    });
  });
  it("men-trim judul sebelum menghitung panjang", () => {
    const r = validateNote({ title: `  ${"x".repeat(TITLE_MAX)}  `, body: "" });
    expect(r).toEqual({ title: "x".repeat(TITLE_MAX), body: "" });
  });
  it("men-trim judul pada hasil", () => {
    expect(validateNote({ title: "  Halo  ", body: "" })).toEqual({ title: "Halo", body: "" });
  });
  it("menerima isi kosong", () => {
    expect(validateNote({ title: "a", body: "" })).toEqual({ title: "a", body: "" });
  });
  it("tidak men-trim isi", () => {
    expect(validateNote({ title: "a", body: "  baris  \n" })).toEqual({ title: "a", body: "  baris  \n" });
  });
  it("menerima isi 10.000 karakter, menolak 10.001", () => {
    expect(validateNote({ title: "a", body: "z".repeat(BODY_MAX) })).not.toHaveProperty("error");
    expect(validateNote({ title: "a", body: "z".repeat(BODY_MAX + 1) })).toEqual({
      error: "Isi maksimal 10.000 karakter.",
    });
  });
  it("menghitung per code point seperti char_length Postgres", () => {
    // 200 emoji = 400 UTF-16 unit, tetapi 200 karakter bagi database.
    expect(validateNote({ title: "😀".repeat(TITLE_MAX), body: "" })).not.toHaveProperty("error");
    expect(validateNote({ title: "😀".repeat(TITLE_MAX + 1), body: "" })).toHaveProperty("error");
  });
});

describe("parseNote", () => {
  it("membaca title dan body dari FormData", () => {
    const fd = new FormData();
    fd.set("title", " Judul ");
    fd.set("body", "Isi");
    expect(parseNote(fd)).toEqual({ title: "Judul", body: "Isi" });
  });
  it("field hilang dianggap kosong", () => {
    expect(parseNote(new FormData())).toEqual({ error: "Judul wajib diisi." });
  });
});

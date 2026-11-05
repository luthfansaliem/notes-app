# SPEC: Aplikasi Catatan Organisasi

Status: **disetujui** (dengan tambahan eksplisit: check constraint, kunci kolom, test lintas organisasi)

## Tujuan

Setiap organisasi punya satu daftar catatan bersama (judul dan isi). Anggota organisasi bisa membaca, menambah, mengedit, dan menghapus catatan. Orang di luar organisasi tidak bisa melihat apa pun.

## Pengguna

Anggota organisasi yang sudah login (peran `owner`, `admin`, atau `member`, sesuai template). Pembuatan organisasi dan login sudah ada di template dan tidak diubah.

## Fitur MVP

1. **Daftar catatan** di `/[orgSlug]/notes`: menampilkan judul, nama penulis, dan tanggal terakhir diubah. Urut dari yang terbaru diubah. Ada tampilan kosong bila belum ada catatan.
2. **Tambah catatan**: judul (wajib) dan isi (boleh kosong).
3. **Lihat catatan**: halaman detail menampilkan judul dan isi lengkap.
4. **Edit catatan**: ubah judul dan isi.
5. **Hapus catatan**: ada konfirmasi sebelum dihapus. Hapus bersifat permanen.
6. **Navigasi**: dari dashboard organisasi ada tautan ke daftar catatan.

Aturan isian:
- Teks biasa (tanpa format kaya).
- Judul wajib, 1–200 karakter setelah spasi di ujung dibuang.
- Isi maksimal 10.000 karakter.
- Aturan ini diterapkan di form dan Server Action, dan **wajib** juga sebagai `check` constraint di database (batas judul 200 dan isi 10.000 karakter), supaya tetap berlaku walau aplikasi dilewati.

## Sengaja ditunda (tidak dibuat)

Pencarian, tag, folder, pin, tempat sampah/pemulihan, format kaya (Markdown, gambar, lampiran), berbagi ke luar organisasi, komentar, riwayat versi, notifikasi, pagination, dan pengelolaan anggota.

## Model data

Satu tabel baru, lewat migrasi `0004_notes.sql`:

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | uuid, PK | default `gen_random_uuid()` |
| `organization_id` | uuid, not null | FK ke `organizations(id)`, `on delete cascade` |
| `author_id` | uuid, null | FK ke `profiles(id)`, `on delete set null`. Penulis asli, tidak bisa diubah |
| `title` | text, not null | `check` constraint: `char_length(btrim(title)) between 1 and 200` |
| `body` | text, not null, default `''` | `check` constraint: `char_length(body) <= 10000` |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | default `now()`, diperbarui trigger saat edit |

Indeks: `(organization_id, updated_at desc)`.

Trigger penjaga: `organization_id` dan `author_id` **terkunci setelah insert**. Update yang mengubah salah satunya ditolak untuk **semua role** (owner, admin, member), mengikuti pola migrasi 0003. Catatan tidak ikut terhapus bila penulisnya keluar (`author_id` jadi null, tampil sebagai "Mantan anggota").

Nama penulis diambil dari `profiles.full_name`, atau `email` bila kosong. Profil rekan satu organisasi sudah bisa dibaca lewat policy `shares_org_with`.

## Aturan akses (RLS)

RLS **aktif** di `notes`. Semua policy memakai `is_org_member` / `has_org_role`.

| Aksi | owner | admin | member | Bukan anggota |
|---|---|---|---|---|
| Lihat catatan org | ✅ | ✅ | ✅ | ❌ |
| Tambah catatan (sebagai dirinya sendiri) | ✅ | ✅ | ✅ | ❌ |
| Edit catatan | semua | semua | hanya miliknya | ❌ |
| Hapus catatan | semua | semua | hanya miliknya | ❌ |

Policy:
- `select`: `is_org_member(organization_id)`.
- `insert`: `is_org_member(organization_id)` dan `author_id = auth.uid()`.
- `update` / `delete`: `has_org_role(organization_id, '{owner,admin}')` atau (`is_org_member(organization_id)` dan `author_id = auth.uid()`).
- Tidak ada akses untuk `anon`.

Isolasi antar organisasi hanya bergantung pada RLS, bukan filter di kode aplikasi. Tidak memakai service-role key.

## Test

- **RLS** (`supabase/tests/notes_rls.sql`, dijalankan `supabase/tests/run.sh` dan job CI `rls`). Wajib mencakup:
  - **Lintas organisasi**: user di organisasi B tidak bisa **membaca**, **mengubah**, atau **menghapus** catatan organisasi A (select kosong; update/delete mengenai 0 baris), dan tidak bisa insert dengan `organization_id` organisasi A.
  - **Anggota biasa terhadap catatan orang lain** (satu organisasi yang sama): bisa membaca, tetapi tidak bisa mengubah atau menghapus.
  - **Kontrol positif**: anggota biasa bisa mengubah/menghapus catatannya sendiri; admin dan owner bisa mengubah/menghapus catatan siapa pun di organisasinya.
  - **Terkunci**: update `organization_id` atau `author_id` ditolak untuk owner, admin, dan member.
  - **Constraint**: judul kosong/spasi saja, judul 201 karakter, dan isi 10.001 karakter ditolak; batas 200 dan 10.000 diterima.
  - `anon` ditolak, dan insert dengan `author_id` orang lain ditolak.
- **Unit/komponen** (Vitest): validasi judul dan isi, render daftar (termasuk kosong), form tambah/edit, dan konfirmasi hapus. Server Actions di-mock.
- Sebelum selesai: `pnpm lint && pnpm typecheck && pnpm test`, dan `supabase/tests/run.sh` untuk perubahan migrasi.

## Pertanyaan terbuka

Tidak ada. Semua keputusan di atas sudah dijawab pengguna.

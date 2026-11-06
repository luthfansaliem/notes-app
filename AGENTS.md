## Review guidelines

- Setiap tabel baru wajib punya kolom organization_id dan RLS aktif sejak dibuat.
- Policy RLS tidak boleh membuka data lintas organisasi; kolom organization_id dan author_id harus dikunci pada update.
- Tidak boleh ada kunci rahasia, token, atau isi .env di kode, tes, atau dokumentasi.
- Tabel baru wajib punya tes RLS lintas organisasi di supabase/tests.
- Tandai pelanggaran poin-poin di atas sebagai P0.

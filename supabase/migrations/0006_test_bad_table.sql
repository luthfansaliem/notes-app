-- SENGAJA SALAH: file uji untuk reviewer. Jangan merge.
-- Tidak ada organization_id dan tidak ada RLS.
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

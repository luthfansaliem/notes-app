-- Tabel `notes`: catatan bersama per organisasi. RLS aktif sejak dibuat.
-- Issue ini hanya memberi policy select + insert. Update/delete sengaja belum punya policy
-- (ditolak) dan akan ditambah di issue berikutnya.

create table public.notes (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  author_id       uuid references public.profiles (id) on delete set null,
  title           text not null check (char_length(btrim(title)) between 1 and 200),
  body            text not null default '' check (char_length(body) <= 10000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index notes_org_updated_idx on public.notes (organization_id, updated_at desc);

create function public.notes_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger notes_touch_updated_at
  before update on public.notes
  for each row execute function public.notes_touch_updated_at();

alter table public.notes enable row level security;

-- anon tidak punya akses sama sekali
revoke all on public.notes from anon;

create policy notes_select on public.notes for select to authenticated
  using (public.is_org_member(organization_id));

create policy notes_insert on public.notes for insert to authenticated
  with check (public.is_org_member(organization_id) and author_id = (select auth.uid()));

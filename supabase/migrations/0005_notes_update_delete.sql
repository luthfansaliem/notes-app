-- Policy update/delete untuk `notes` dan penguncian kolom identitas.
--
-- owner/admin boleh mengubah/menghapus catatan apa pun di organisasinya; member hanya
-- catatan miliknya (author_id = dirinya). Catatan tanpa penulis (author_id null, penulis
-- sudah keluar) hanya bisa diubah/dihapus owner/admin.
--
-- `organization_id` dan `author_id` terkunci setelah insert untuk SEMUA peran
-- (pola 0003). Tanpa ini, admin yang juga admin di organisasi lain bisa memindahkan
-- catatan antar organisasi, dan member bisa mengalihkan kepemilikan catatan.
--
-- Pengecualian: FK `author_id ... on delete set null` (0004) melakukan UPDATE internal
-- saat profil penulis dihapus. Update itu berjalan di dalam trigger FK (pg_trigger_depth() > 1),
-- sedangkan update langsung dari klien berada di kedalaman 1 dan tetap ditolak.

create policy notes_update on public.notes for update to authenticated
  using (
    public.has_org_role(organization_id, array['owner', 'admin']::public.member_role[])
    or (public.is_org_member(organization_id) and author_id = (select auth.uid()))
  )
  with check (
    public.has_org_role(organization_id, array['owner', 'admin']::public.member_role[])
    or (public.is_org_member(organization_id) and author_id = (select auth.uid()))
  );

create policy notes_delete on public.notes for delete to authenticated
  using (
    public.has_org_role(organization_id, array['owner', 'admin']::public.member_role[])
    or (public.is_org_member(organization_id) and author_id = (select auth.uid()))
  );

create function public.notes_lock_identity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception 'notes.organization_id and notes.author_id are immutable'
      using errcode = '42501';
  end if;
  if new.author_id is distinct from old.author_id
     and not (pg_trigger_depth() > 1 and new.author_id is null) then
    raise exception 'notes.organization_id and notes.author_id are immutable'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger notes_lock_identity
  before update of organization_id, author_id on public.notes
  for each row execute function public.notes_lock_identity();

-- Uji RLS + constraint tabel `notes` (issue #3: baca/tambah saja).
-- Dijalankan oleh supabase/tests/run.sh pada Postgres sekali pakai (bukan project Supabase).
\set ON_ERROR_STOP on
begin;

create temp table results (name text, ok boolean, detail text);

create function pg_temp.try_as(uid uuid, stmt text) returns text
language plpgsql as $$
declare n bigint;
begin
  perform set_config('request.jwt.claim.sub', uid::text, true);
  set local role authenticated;
  begin
    execute stmt;
    get diagnostics n = row_count;
    reset role;
    return format('ok (%s baris)', n);
  exception when others then
    reset role;
    return 'error: ' || sqlerrm;
  end;
end $$;

-- Sama seperti try_as tetapi sebagai role anon (tanpa auth.uid()).
create function pg_temp.try_anon(stmt text) returns text
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  set local role anon;
  begin
    execute stmt;
    reset role;
    return 'ok';
  exception when others then
    reset role;
    return 'error: ' || sqlerrm;
  end;
end $$;

create function pg_temp.check(p_name text, p_ok boolean, p_detail text default null)
returns void language sql as $$
  insert into results values (p_name, coalesce(p_ok, false), p_detail);
$$;

-- Menghitung baris notes yang terlihat oleh user tertentu.
create function pg_temp.visible(uid uuid, p_where text default 'true') returns bigint
language plpgsql as $$
declare n bigint;
begin
  perform set_config('request.jwt.claim.sub', uid::text, true);
  set local role authenticated;
  execute 'select count(*) from public.notes where ' || p_where into n;
  reset role;
  return n;
end $$;

-- ------------------------------------------------------------ fixture
-- Org A: ua (owner), uadm (admin), umem (member). Org B: ub (owner).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'ua@test'),
  ('00000000-0000-0000-0000-0000000000a2', 'uadm@test'),
  ('00000000-0000-0000-0000-0000000000a3', 'umem@test'),
  ('00000000-0000-0000-0000-0000000000b1', 'ub@test');

insert into public.organizations (id, name, slug, created_by) values
  ('00000000-0000-0000-0000-00000000000a', 'Org A', 'org-a', null),
  ('00000000-0000-0000-0000-00000000000b', 'Org B', 'org-b', null);

insert into public.members (organization_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a2', 'admin'),
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a3', 'member'),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'owner');

-- Catatan awal (dimasukkan sebagai superuser): satu per organisasi.
insert into public.notes (id, organization_id, author_id, title, body) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000000a',
   '00000000-0000-0000-0000-0000000000a1', 'Catatan A', 'rahasia A'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-00000000000b',
   '00000000-0000-0000-0000-0000000000b1', 'Catatan B', 'rahasia B');

-- ------------------------------------------------- 1. baca (positif + lintas org)
select pg_temp.check('1a. (kontrol) owner/admin/member org A melihat catatan A',
  pg_temp.visible('00000000-0000-0000-0000-0000000000a1', $$id = '00000000-0000-0000-0000-0000000000f1'$$) = 1
  and pg_temp.visible('00000000-0000-0000-0000-0000000000a2', $$id = '00000000-0000-0000-0000-0000000000f1'$$) = 1
  and pg_temp.visible('00000000-0000-0000-0000-0000000000a3', $$id = '00000000-0000-0000-0000-0000000000f1'$$) = 1);

select pg_temp.check('1b. user org B TIDAK melihat catatan org A (select kosong)',
  pg_temp.visible('00000000-0000-0000-0000-0000000000b1', $$id = '00000000-0000-0000-0000-0000000000f1'$$) = 0
  and pg_temp.visible('00000000-0000-0000-0000-0000000000b1') = 1);

select pg_temp.check('1c. user org A TIDAK melihat catatan org B',
  pg_temp.visible('00000000-0000-0000-0000-0000000000a1', $$id = '00000000-0000-0000-0000-0000000000f2'$$) = 0);

-- ------------------------------------------------- 2. insert
select pg_temp.try_as('00000000-0000-0000-0000-0000000000a3',
  $q$ insert into public.notes (organization_id, author_id, title)
      values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a3', 'Dari member') $q$) as hasil \gset
select pg_temp.check('2a. (kontrol) member org A bisa insert catatan di A sebagai dirinya',
  exists (select 1 from public.notes where title = 'Dari member'), :'hasil');

select pg_temp.try_as('00000000-0000-0000-0000-0000000000b1',
  $q$ insert into public.notes (organization_id, author_id, title)
      values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000b1', 'Penyusup') $q$) as hasil \gset
select pg_temp.check('2b. user org B TIDAK bisa insert dengan organization_id org A',
  not exists (select 1 from public.notes where title = 'Penyusup') and :'hasil' like 'error:%', :'hasil');

select pg_temp.try_as('00000000-0000-0000-0000-0000000000a3',
  $q$ insert into public.notes (organization_id, author_id, title)
      values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'Palsu') $q$) as hasil \gset
select pg_temp.check('2c. insert dengan author_id orang lain ditolak',
  not exists (select 1 from public.notes where title = 'Palsu') and :'hasil' like 'error:%', :'hasil');

select pg_temp.try_as('00000000-0000-0000-0000-0000000000a3',
  $q$ insert into public.notes (organization_id, author_id, title)
      values ('00000000-0000-0000-0000-00000000000a', null, 'Tanpa penulis') $q$) as hasil \gset
select pg_temp.check('2d. insert dengan author_id null ditolak',
  not exists (select 1 from public.notes where title = 'Tanpa penulis') and :'hasil' like 'error:%', :'hasil');

-- ------------------------------------------------- 3. anon
select pg_temp.try_anon($q$ select count(*) from public.notes $q$) as hasil \gset
select pg_temp.check('3a. anon TIDAK bisa select', :'hasil' like 'error:%', :'hasil');

select pg_temp.try_anon(
  $q$ insert into public.notes (organization_id, author_id, title)
      values ('00000000-0000-0000-0000-00000000000a', null, 'Dari anon') $q$) as hasil \gset
select pg_temp.check('3b. anon TIDAK bisa insert',
  not exists (select 1 from public.notes where title = 'Dari anon') and :'hasil' like 'error:%', :'hasil');

-- ------------------------------------------------- 4. constraint
-- Setiap kasus: insert sah secara RLS (member org A, dirinya sendiri), hanya panjang yang diuji.
create function pg_temp.ins(p_title text, p_body text) returns text language sql as $f$
  select pg_temp.try_as('00000000-0000-0000-0000-0000000000a3',
    format($q$ insert into public.notes (organization_id, author_id, title, body)
               values ('00000000-0000-0000-0000-00000000000a',
                       '00000000-0000-0000-0000-0000000000a3', %L, %L) $q$, p_title, p_body));
$f$;

select pg_temp.check('4a. judul kosong ditolak', pg_temp.ins('', '') like 'error:%');
select pg_temp.check('4b. judul spasi saja ditolak', pg_temp.ins('   ', '') like 'error:%');
select pg_temp.check('4c. judul 201 karakter ditolak', pg_temp.ins(repeat('x', 201), '') like 'error:%');
select pg_temp.check('4d. isi 10.001 karakter ditolak', pg_temp.ins('ok', repeat('x', 10001)) like 'error:%');
select pg_temp.check('4e. (kontrol) judul 200 karakter diterima', pg_temp.ins(repeat('y', 200), '') like 'ok%');
select pg_temp.check('4f. (kontrol) isi 10.000 karakter diterima', pg_temp.ins('isi penuh', repeat('z', 10000)) like 'ok%');
select pg_temp.check('4g. (kontrol) isi default kosong bila tidak diberikan',
  (select body from public.notes where title = 'Dari member') = '');

-- ------------------------------------------------- 5. update/delete belum ada policy
select pg_temp.try_as('00000000-0000-0000-0000-0000000000a1',
  $q$ update public.notes set title = 'Diubah' where id = '00000000-0000-0000-0000-0000000000f1' $q$) as hasil \gset
select pg_temp.check('5a. update belum diizinkan (0 baris, owner sekalipun)',
  (select title from public.notes where id = '00000000-0000-0000-0000-0000000000f1') = 'Catatan A', :'hasil');

select pg_temp.try_as('00000000-0000-0000-0000-0000000000a1',
  $q$ delete from public.notes where id = '00000000-0000-0000-0000-0000000000f1' $q$) as hasil \gset
select pg_temp.check('5b. delete belum diizinkan (0 baris, owner sekalipun)',
  exists (select 1 from public.notes where id = '00000000-0000-0000-0000-0000000000f1'), :'hasil');

-- ------------------------------------------------- 6. struktur
select pg_temp.check('6a. RLS aktif di notes',
  (select relrowsecurity from pg_class where oid = 'public.notes'::regclass));

do $$
declare t2 timestamptz;
begin
  -- now() konstan dalam satu transaksi, jadi set dulu ke masa lalu lalu update (sebagai superuser).
  set local session_replication_role = replica; -- trigger mati sementara
  update public.notes set updated_at = now() - interval '1 day'
    where id = '00000000-0000-0000-0000-0000000000f1';
  set local session_replication_role = origin;
  update public.notes set body = 'x' where id = '00000000-0000-0000-0000-0000000000f1';
  select updated_at into t2 from public.notes where id = '00000000-0000-0000-0000-0000000000f1';
  insert into results values ('6b. trigger memperbarui updated_at saat update', t2 = now(), null);
end $$;

-- ------------------------------------------------------------ laporan
select case when ok then 'PASS' else 'FAIL' end as status, name, detail from results order by name;

do $$
begin
  if exists (select 1 from results where not ok) then
    raise exception '% test gagal', (select count(*) from results where not ok);
  end if;
end $$;

rollback;

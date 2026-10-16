-- =============================================================
-- Fitur C: Inventory dan Setelan (PRD 9.2 & PRD Bab 11)
-- =============================================================

-- 1. Fungsi catat_stok_masuk (PRD 9.2)
-- Dipanggil oleh: Admin, Owner
-- Menambah stok spare part (jenis = 'part') dan mencatat ke stock_movements
create or replace function public.catat_stok_masuk(
  p_item uuid,
  p_jumlah int,
  p_keterangan text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_peran text := private.peran_saya();
  v_jenis text;
  v_stok_lama int;
  v_stok_baru int;
begin
  -- 1. Periksa peran di awal
  if v_peran not in ('admin', 'owner') or v_peran is null then
    raise exception 'Hanya Admin atau Owner yang boleh mencatat stok masuk';
  end if;

  -- 2. Validasi input
  if p_jumlah is null or p_jumlah < 1 then
    raise exception 'Jumlah stok masuk minimal 1';
  end if;

  -- 3. Kunci baris item dengan FOR UPDATE
  select jenis, stok into v_jenis, v_stok_lama
  from public.inventory_items
  where id = p_item
  for update;

  if not found then
    raise exception 'Item tidak ditemukan';
  end if;

  if v_jenis <> 'part' then
    raise exception 'Hanya spare part yang memiliki stok';
  end if;

  -- 4. Hitung stok baru dan perbarui inventory_items
  v_stok_baru := v_stok_lama + p_jumlah;

  update public.inventory_items
  set stok = v_stok_baru
  where id = p_item;

  -- 5. Catat pergerakan stok
  insert into public.stock_movements (
    item_id,
    jenis,
    jumlah,
    stok_sesudah,
    keterangan,
    dicatat_oleh
  ) values (
    p_item,
    'masuk',
    p_jumlah,
    v_stok_baru,
    p_keterangan,
    auth.uid()
  );
end $$;

revoke all on function public.catat_stok_masuk(uuid, int, text) from public, anon;
grant execute on function public.catat_stok_masuk(uuid, int, text) to authenticated;


-- 2. Fungsi sesuaikan_stok (PRD 9.2)
-- Dipanggil oleh: Owner
-- Menghitung selisih stok fisik, memperbarui stok, dan mencatat pergerakan 'penyesuaian'
create or replace function public.sesuaikan_stok(
  p_item uuid,
  p_stok_fisik int,
  p_alasan text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_peran text := private.peran_saya();
  v_jenis text;
  v_stok_lama int;
  v_selisih int;
begin
  -- 1. Periksa peran di awal
  if v_peran <> 'owner' or v_peran is null then
    raise exception 'Hanya Owner yang boleh menyesuaikan stok';
  end if;

  -- 2. Validasi input
  if p_stok_fisik is null or p_stok_fisik < 0 then
    raise exception 'Stok hasil hitung fisik tidak boleh kurang dari 0';
  end if;

  if p_alasan is null or trim(p_alasan) = '' then
    raise exception 'Alasan penyesuaian stok wajib diisi';
  end if;

  -- 3. Kunci baris item dengan FOR UPDATE
  select jenis, stok into v_jenis, v_stok_lama
  from public.inventory_items
  where id = p_item
  for update;

  if not found then
    raise exception 'Item tidak ditemukan';
  end if;

  if v_jenis <> 'part' then
    raise exception 'Hanya spare part yang memiliki stok';
  end if;

  -- 4. Hitung selisih dan perbarui stok
  v_selisih := p_stok_fisik - v_stok_lama;

  update public.inventory_items
  set stok = p_stok_fisik
  where id = p_item;

  -- 5. Catat pergerakan stok 'penyesuaian'
  insert into public.stock_movements (
    item_id,
    jenis,
    jumlah,
    stok_sesudah,
    keterangan,
    dicatat_oleh
  ) values (
    p_item,
    'penyesuaian',
    v_selisih,
    p_stok_fisik,
    p_alasan,
    auth.uid()
  );
end $$;

revoke all on function public.sesuaikan_stok(uuid, int, text) from public, anon;
grant execute on function public.sesuaikan_stok(uuid, int, text) to authenticated;


-- 3. Storage Bucket publik (PRD Bab 11.1)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'publik',
  'publik',
  true,
  1048576,
  array['image/webp', 'image/jpeg', 'image/png']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 1048576,
  allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png'];


-- 4. Storage Policies untuk Bucket publik (PRD Bab 11.2)
-- Sesuai PRD 11.2: Unduh / tampil dapat diakses siapa pun via URL publik tanpa policy select.
-- Operasi unggah, ganti, dan hapus hanya untuk Owner.

create policy "publik_tambah_owner" on storage.objects for insert to authenticated
  with check (bucket_id = 'publik' and (select private.peran_saya()) = 'owner');

create policy "publik_ubah_owner" on storage.objects for update to authenticated
  using (bucket_id = 'publik' and (select private.peran_saya()) = 'owner')
  with check (bucket_id = 'publik' and (select private.peran_saya()) = 'owner');

create policy "publik_hapus_owner" on storage.objects for delete to authenticated
  using (bucket_id = 'publik' and (select private.peran_saya()) = 'owner');

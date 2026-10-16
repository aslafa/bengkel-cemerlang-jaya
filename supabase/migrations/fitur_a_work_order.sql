-- =============================================================
-- App 4 Cemerlang Jaya Motor · Fitur A (Work Order)
-- PRD 9.2: buat_work_order, tugaskan_mekanik, ubah_status_wo
-- PRD 9.4: trigger jaga_wo
-- PRD Bab 11: bucket foto-wo dan policy
-- =============================================================

-- 1. Fungsi buat_work_order (PRD 9.2)
create or replace function public.buat_work_order(
  p_vehicle_id uuid,
  p_kepala_mekanik_id uuid,
  p_odometer int,
  p_keluhan text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_peran text;
  v_customer_id uuid;
  v_periode text;
  v_urutan int;
  v_nomor text;
  v_wo_id uuid;
begin
  v_peran := private.peran_saya();
  if v_peran is null or v_peran not in ('admin', 'owner') then
    raise exception 'Hanya Admin atau Owner yang boleh membuat Work Order';
  end if;

  if p_odometer is null or p_odometer < 0 then
    raise exception 'Odometer harus diisi angka 0 atau lebih';
  end if;

  if p_keluhan is null or trim(p_keluhan) = '' then
    raise exception 'Keluhan wajib diisi';
  end if;

  select customer_id into v_customer_id
  from public.vehicles
  where id = p_vehicle_id;

  if not found then
    raise exception 'Kendaraan tidak ditemukan';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_kepala_mekanik_id and role = 'kepala_mekanik' and aktif = true
  ) then
    raise exception 'Kepala Mekanik tidak ditemukan atau tidak aktif';
  end if;

  v_periode := to_char(now(), 'YYMM');
  v_urutan := private.nomor_berikut('WO', v_periode);
  v_nomor := 'WO-' || v_periode || '-' || lpad(v_urutan::text, 4, '0');

  insert into public.work_orders (
    nomor,
    vehicle_id,
    customer_id,
    kepala_mekanik_id,
    odometer,
    keluhan,
    status,
    dibuat_oleh
  ) values (
    v_nomor,
    p_vehicle_id,
    v_customer_id,
    p_kepala_mekanik_id,
    p_odometer,
    trim(p_keluhan),
    'menunggu',
    auth.uid()
  )
  returning id into v_wo_id;

  insert into public.wo_status_history (
    work_order_id,
    dari_status,
    ke_status,
    catatan,
    oleh
  ) values (
    v_wo_id,
    null,
    'menunggu',
    'Work Order dibuat',
    auth.uid()
  );

  return v_wo_id;
end;
$$;

revoke all on function public.buat_work_order(uuid, uuid, int, text) from public, anon;
grant execute on function public.buat_work_order(uuid, uuid, int, text) to authenticated;


-- 2. Fungsi tugaskan_mekanik (PRD 9.2)
create or replace function public.tugaskan_mekanik(
  p_wo uuid,
  p_mekanik uuid[],
  p_estimasi date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_peran text;
  v_wo record;
  v_count int;
  v_m_id uuid;
begin
  v_peran := private.peran_saya();
  if v_peran is null or v_peran not in ('owner', 'kepala_mekanik') then
    raise exception 'Hanya Kepala Mekanik atau Owner yang boleh menugaskan mekanik';
  end if;

  select * into v_wo
  from public.work_orders
  where id = p_wo
  for update;

  if not found then
    raise exception 'Work Order tidak ditemukan';
  end if;

  if v_wo.status <> 'menunggu' then
    raise exception 'Mekanik hanya dapat ditugaskan saat status menunggu';
  end if;

  if v_peran = 'kepala_mekanik' and v_wo.kepala_mekanik_id <> auth.uid() then
    raise exception 'Hanya Kepala Mekanik tim ini yang boleh menugaskan mekanik';
  end if;

  if p_mekanik is null or array_length(p_mekanik, 1) is null or array_length(p_mekanik, 1) < 1 then
    raise exception 'Pilih minimal 1 mekanik';
  end if;

  if p_estimasi is null or p_estimasi < current_date then
    raise exception 'Tanggal estimasi selesai tidak boleh sebelum hari ini';
  end if;

  select count(*) into v_count
  from public.mekanik
  where id = any(p_mekanik)
    and kepala_mekanik_id = v_wo.kepala_mekanik_id
    and aktif = true;

  if v_count <> array_length(p_mekanik, 1) then
    raise exception 'Semua mekanik harus aktif dan berasal dari tim yang ditugaskan';
  end if;

  update public.work_orders
  set estimasi_selesai = p_estimasi,
      updated_at = now()
  where id = p_wo;

  delete from public.work_order_mekanik
  where work_order_id = p_wo;

  foreach v_m_id in array p_mekanik
  loop
    insert into public.work_order_mekanik (work_order_id, mekanik_id)
    values (p_wo, v_m_id);
  end loop;
end;
$$;

revoke all on function public.tugaskan_mekanik(uuid, uuid[], date) from public, anon;
grant execute on function public.tugaskan_mekanik(uuid, uuid[], date) to authenticated;


-- 3. Fungsi ubah_status_wo (PRD 7.2, 9.2)
create or replace function public.ubah_status_wo(
  p_wo uuid,
  p_status text,
  p_catatan text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_peran text;
  v_wo record;
  v_mekanik_count int;
  v_billing_count int;
  v_foto_count int;
  v_inv record;
  r_item record;
  v_stok int;
begin
  v_peran := private.peran_saya();
  if v_peran is null then
    raise exception 'Pengguna tidak memiliki akses';
  end if;

  select * into v_wo
  from public.work_orders
  where id = p_wo
  for update;

  if not found then
    raise exception 'Work Order tidak ditemukan';
  end if;

  if v_wo.status = p_status then
    return;
  end if;

  -- 1. menunggu -> dikerjakan
  if v_wo.status = 'menunggu' and p_status = 'dikerjakan' then
    if v_peran not in ('owner', 'kepala_mekanik') or (v_peran = 'kepala_mekanik' and v_wo.kepala_mekanik_id <> auth.uid()) then
      raise exception 'Hanya Kepala Mekanik tim ini atau Owner yang boleh memulai pengerjaan';
    end if;
    if v_wo.estimasi_selesai is null then
      raise exception 'Estimasi selesai harus diisi sebelum memulai pengerjaan';
    end if;
    select count(*) into v_mekanik_count from public.work_order_mekanik where work_order_id = p_wo;
    if v_mekanik_count < 1 then
      raise exception 'Minimal 1 mekanik harus ditugaskan sebelum memulai pengerjaan';
    end if;

  -- 2. dikerjakan -> tertunda
  elsif v_wo.status = 'dikerjakan' and p_status = 'tertunda' then
    if v_peran not in ('owner', 'kepala_mekanik') or (v_peran = 'kepala_mekanik' and v_wo.kepala_mekanik_id <> auth.uid()) then
      raise exception 'Hanya Kepala Mekanik tim ini atau Owner yang boleh menunda pengerjaan';
    end if;
    if p_catatan is null or trim(p_catatan) = '' then
      raise exception 'Catatan penundaan wajib diisi';
    end if;

  -- 3. tertunda -> dikerjakan
  elsif v_wo.status = 'tertunda' and p_status = 'dikerjakan' then
    if v_peran not in ('owner', 'kepala_mekanik') or (v_peran = 'kepala_mekanik' and v_wo.kepala_mekanik_id <> auth.uid()) then
      raise exception 'Hanya Kepala Mekanik tim ini atau Owner yang boleh melanjutkan pengerjaan';
    end if;

  -- 4. dikerjakan -> selesai
  elsif v_wo.status = 'dikerjakan' and p_status = 'selesai' then
    if v_peran not in ('owner', 'kepala_mekanik') or (v_peran = 'kepala_mekanik' and v_wo.kepala_mekanik_id <> auth.uid()) then
      raise exception 'Hanya Kepala Mekanik tim ini atau Owner yang boleh menyelesaikan pengerjaan';
    end if;
    select count(*) into v_billing_count from public.billing_items where work_order_id = p_wo;
    if v_billing_count < 1 then
      raise exception 'Catat minimal 1 jasa atau spare part sebelum menyelesaikan pengerjaan';
    end if;

  -- 5. selesai -> siap_diambil (QC Lulus)
  elsif v_wo.status = 'selesai' and p_status = 'siap_diambil' then
    if v_peran not in ('owner', 'kepala_mekanik') or (v_peran = 'kepala_mekanik' and v_wo.kepala_mekanik_id <> auth.uid()) then
      raise exception 'Hanya Kepala Mekanik tim ini atau Owner yang boleh melakukan verifikasi QC';
    end if;

  -- 6. selesai -> dikerjakan (QC Gagal)
  elsif v_wo.status = 'selesai' and p_status = 'dikerjakan' then
    if v_peran not in ('owner', 'kepala_mekanik') or (v_peran = 'kepala_mekanik' and v_wo.kepala_mekanik_id <> auth.uid()) then
      raise exception 'Hanya Kepala Mekanik tim ini atau Owner yang boleh mengembalikan pengerjaan';
    end if;
    if p_catatan is null or trim(p_catatan) = '' then
      raise exception 'Catatan QC gagal wajib diisi';
    end if;

  -- 7. siap_diambil -> diambil
  elsif v_wo.status = 'siap_diambil' and p_status = 'diambil' then
    if v_peran not in ('owner', 'admin') then
      raise exception 'Hanya Admin atau Owner yang boleh menyerahkan kendaraan';
    end if;
    select * into v_inv from public.invoices where work_order_id = p_wo;
    if not found or v_inv.status_bayar <> 'lunas' then
      raise exception 'Kendaraan hanya boleh diserahkan jika invoice sudah lunas';
    end if;
    select count(*) into v_foto_count from public.work_order_photos where work_order_id = p_wo and jenis = 'kondisi_akhir';
    if v_foto_count < 1 then
      raise exception 'Minimal 1 foto kondisi akhir wajib diunggah sebelum penyerahan';
    end if;

  -- 8. menunggu / dikerjakan / tertunda -> dibatalkan
  elsif v_wo.status in ('menunggu', 'dikerjakan', 'tertunda') and p_status = 'dibatalkan' then
    if v_peran not in ('owner', 'admin') then
      raise exception 'Hanya Admin atau Owner yang boleh membatalkan Work Order';
    end if;
    if p_catatan is null or trim(p_catatan) = '' then
      raise exception 'Alasan pembatalan wajib diisi';
    end if;

    -- Kembalikan stok spare part yang sudah tercatat
    for r_item in
      select bi.item_id, bi.jumlah
      from public.billing_items bi
      where bi.work_order_id = p_wo and bi.jenis = 'part'
    loop
      select stok into v_stok
      from public.inventory_items
      where id = r_item.item_id
      for update;

      update public.inventory_items
      set stok = stok + r_item.jumlah,
          updated_at = now()
      where id = r_item.item_id;

      insert into public.stock_movements (
        item_id, jenis, jumlah, stok_sesudah, keterangan, work_order_id, dicatat_oleh
      ) values (
        r_item.item_id,
        'kembali',
        r_item.jumlah,
        v_stok + r_item.jumlah,
        'Pengembalian stok pembatalan WO: ' || coalesce(p_catatan, ''),
        p_wo,
        auth.uid()
      );
    end loop;

  else
    raise exception 'Perpindahan status dari % ke % tidak diizinkan', v_wo.status, p_status;
  end if;

  -- Update status work order
  update public.work_orders
  set status = p_status,
      catatan_status = coalesce(p_catatan, catatan_status),
      selesai_at = case when p_status = 'selesai' and v_wo.selesai_at is null then now() else selesai_at end,
      diambil_at = case when p_status = 'diambil' then now() else diambil_at end,
      updated_at = now()
  where id = p_wo;

  -- Catat riwayat status
  insert into public.wo_status_history (
    work_order_id, dari_status, ke_status, catatan, oleh
  ) values (
    p_wo, v_wo.status, p_status, p_catatan, auth.uid()
  );
end;
$$;

revoke all on function public.ubah_status_wo(uuid, text, text) from public, anon;
grant execute on function public.ubah_status_wo(uuid, text, text) to authenticated;


-- 4. Trigger jaga_wo (PRD 9.4)
create or replace function private.jaga_wo()
returns trigger language plpgsql set search_path = ''
as $$
declare
  v_peran text;
begin
  if current_user = 'authenticated' then
    v_peran := private.peran_saya();

    -- Status, nomor, id, vehicle, customer, diskon tidak boleh diubah langsung
    if new.status is distinct from old.status then
      raise exception 'Status Work Order hanya boleh diubah melalui fungsi ubah_status_wo';
    end if;
    if new.id is distinct from old.id or new.nomor is distinct from old.nomor or new.vehicle_id is distinct from old.vehicle_id or new.customer_id is distinct from old.customer_id or new.created_at is distinct from old.created_at or new.dibuat_oleh is distinct from old.dibuat_oleh then
      raise exception 'Kolom data utama Work Order tidak dapat diubah langsung';
    end if;
    if new.estimasi_selesai is distinct from old.estimasi_selesai then
      raise exception 'Estimasi selesai hanya boleh diubah melalui fungsi penugasan mekanik';
    end if;
    if new.diskon is distinct from old.diskon or new.alasan_diskon is distinct from old.alasan_diskon then
      raise exception 'Diskon hanya boleh diatur melalui fungsi atur_diskon';
    end if;

    -- Periksa perubahan keluhan, odometer, kepala_mekanik_id
    if (new.keluhan is distinct from old.keluhan or new.odometer is distinct from old.odometer or new.kepala_mekanik_id is distinct from old.kepala_mekanik_id) then
      if old.status <> 'menunggu' or v_peran not in ('admin', 'owner') then
        raise exception 'Keluhan, odometer, dan tim hanya boleh diubah oleh Admin atau Owner saat status menunggu';
      end if;
    end if;

    -- Periksa perubahan diagnosis
    if new.diagnosis is distinct from old.diagnosis then
      if old.status not in ('dikerjakan', 'tertunda') or (v_peran <> 'owner' and (v_peran <> 'kepala_mekanik' or old.kepala_mekanik_id <> auth.uid())) then
        raise exception 'Diagnosis hanya boleh diubah oleh Kepala Mekanik tim WO atau Owner saat status dikerjakan atau tertunda';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create or replace trigger jaga_wo
before update on public.work_orders
for each row execute function private.jaga_wo();


-- 5. Bucket foto-wo dan Policy Storage (PRD Bab 11)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('foto-wo', 'foto-wo', false, 1048576, array['image/webp', 'image/jpeg'])
on conflict (id) do update set
  public = false,
  file_size_limit = 1048576,
  allowed_mime_types = array['image/webp', 'image/jpeg'];

drop policy if exists "foto_wo_lihat" on storage.objects;
create policy "foto_wo_lihat" on storage.objects for select to authenticated
using (
  bucket_id = 'foto-wo' and (select private.peran_saya()) is not null
);

drop policy if exists "foto_wo_unggah_awal" on storage.objects;
create policy "foto_wo_unggah_awal" on storage.objects for insert to authenticated
with check (
  bucket_id = 'foto-wo'
  and (select private.peran_saya()) in ('admin', 'owner')
  and (storage.foldername(name))[2] in ('stnk', 'kondisi_awal')
  and exists (
    select 1 from public.work_orders w
    where w.id::text = (storage.foldername(name))[1]
      and w.status = 'menunggu'
  )
);

drop policy if exists "foto_wo_unggah_akhir" on storage.objects;
create policy "foto_wo_unggah_akhir" on storage.objects for insert to authenticated
with check (
  bucket_id = 'foto-wo'
  and (select private.peran_saya()) in ('admin', 'owner')
  and (storage.foldername(name))[2] = 'kondisi_akhir'
  and exists (
    select 1 from public.work_orders w
    where w.id::text = (storage.foldername(name))[1]
      and w.status = 'siap_diambil'
  )
);

drop policy if exists "foto_wo_unggah_pengerjaan" on storage.objects;
create policy "foto_wo_unggah_pengerjaan" on storage.objects for insert to authenticated
with check (
  bucket_id = 'foto-wo'
  and (storage.foldername(name))[2] = 'pengerjaan'
  and (
    (select private.peran_saya()) = 'owner'
    or (
      (select private.peran_saya()) = 'kepala_mekanik'
      and exists (
        select 1 from public.work_orders w
        where w.id::text = (storage.foldername(name))[1]
          and w.status = 'dikerjakan'
          and w.kepala_mekanik_id = auth.uid()
      )
    )
  )
);

drop policy if exists "foto_wo_hapus" on storage.objects;
create policy "foto_wo_hapus" on storage.objects for delete to authenticated
using (
  bucket_id = 'foto-wo' and (select private.peran_saya()) = 'owner'
);

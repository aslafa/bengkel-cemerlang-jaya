-- ====================================================================
-- Fitur B: Tagihan dan Invoice
-- PRD 9.2 Database Functions
-- ====================================================================

-- 1. tambah_item_tagihan(p_wo, p_item, p_jumlah)
-- Dipanggil oleh: Kepala Mekanik tim WO, Owner
-- Syarat: Status WO harus 'dikerjakan'
-- Mengunci baris item inventory_items dengan FOR UPDATE untuk mencegah stok minus
create or replace function public.tambah_item_tagihan(
  p_wo uuid,
  p_item uuid,
  p_jumlah int
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_peran text;
  v_wo_status text;
  v_item record;
  v_modal bigint := 0;
  v_billing_item_id uuid;
begin
  -- 1. Periksa peran pemanggil
  v_peran := private.peran_saya();
  if v_peran is null then
    raise exception 'Akses ditolak: pengguna tidak aktif atau belum login';
  end if;

  if v_peran <> 'owner' and (v_peran <> 'kepala_mekanik' or private.tim_wo(p_wo) <> auth.uid()) then
    raise exception 'Hanya Kepala Mekanik tim ini atau Owner yang boleh menambah item tagihan';
  end if;

  -- 2. Validasi jumlah
  if p_jumlah is null or p_jumlah < 1 then
    raise exception 'Jumlah item minimal 1';
  end if;

  -- 3. Periksa status WO (harus 'dikerjakan')
  select status into v_wo_status
  from public.work_orders
  where id = p_wo;

  if not found then
    raise exception 'Work Order tidak ditemukan';
  end if;

  if v_wo_status <> 'dikerjakan' then
    raise exception 'Item tagihan hanya bisa ditambah saat status WO dikerjakan (status saat ini: %)', v_wo_status;
  end if;

  -- 4. Kunci baris inventory_items dengan FOR UPDATE
  select id, kode, jenis, nama, harga_jual, stok
  into v_item
  from public.inventory_items
  where id = p_item and aktif
  for update;

  if not found then
    raise exception 'Item tidak ditemukan atau tidak aktif';
  end if;

  -- 5. Jika spare part, kurangi stok dan catat stock_movements
  if v_item.jenis = 'part' then
    if v_item.stok < p_jumlah then
      raise exception 'Stok % tidak mencukupi (sisa %)', v_item.nama, v_item.stok;
    end if;

    update public.inventory_items
    set stok = stok - p_jumlah
    where id = p_item;

    insert into public.stock_movements (
      item_id, jenis, jumlah, stok_sesudah, keterangan, work_order_id, dicatat_oleh
    ) values (
      p_item, 'keluar', -p_jumlah, v_item.stok - p_jumlah, 'Dipakai untuk WO', p_wo, auth.uid()
    );

    -- Ambil modal saat ini dari inventory_costs
    select coalesce(harga_modal, 0)
    into v_modal
    from public.inventory_costs
    where item_id = p_item;
  else
    -- Jasa tidak memiliki stok dan modal 0
    v_modal := 0;
  end if;

  -- 6. Simpan baris billing_items
  insert into public.billing_items (
    work_order_id,
    item_id,
    nama_item,
    jenis,
    jumlah,
    harga_master,
    harga_dipakai,
    ditambah_oleh
  ) values (
    p_wo,
    p_item,
    v_item.nama,
    v_item.jenis,
    p_jumlah,
    v_item.harga_jual,
    v_item.harga_jual,
    auth.uid()
  )
  returning id into v_billing_item_id;

  -- 7. Simpan billing_item_costs (rahasia, hanya Owner)
  insert into public.billing_item_costs (
    billing_item_id,
    harga_modal
  ) values (
    v_billing_item_id,
    v_modal
  );

  return v_billing_item_id;
end;
$$;


-- 2. hapus_item_tagihan(p_billing_item)
-- Dipanggil oleh: Kepala Mekanik tim WO, Owner
-- Syarat: Status WO harus 'dikerjakan'
-- Jika part, kembalikan stok dengan FOR UPDATE dan catat pergerakan stok 'kembali'
create or replace function public.hapus_item_tagihan(
  p_billing_item uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_peran text;
  v_bi record;
  v_wo_status text;
  v_stok_lama int;
begin
  -- 1. Periksa peran pemanggil
  v_peran := private.peran_saya();
  if v_peran is null then
    raise exception 'Akses ditolak: pengguna tidak aktif atau belum login';
  end if;

  -- 2. Ambil data billing_item
  select id, work_order_id, item_id, jenis, nama_item, jumlah
  into v_bi
  from public.billing_items
  where id = p_billing_item;

  if not found then
    raise exception 'Item tagihan tidak ditemukan';
  end if;

  -- 3. Periksa hak akses WO
  if v_peran <> 'owner' and (v_peran <> 'kepala_mekanik' or private.tim_wo(v_bi.work_order_id) <> auth.uid()) then
    raise exception 'Hanya Kepala Mekanik tim ini atau Owner yang boleh menghapus item tagihan';
  end if;

  -- 4. Periksa status WO (harus 'dikerjakan')
  select status into v_wo_status
  from public.work_orders
  where id = v_bi.work_order_id;

  if v_wo_status <> 'dikerjakan' then
    raise exception 'Item tagihan hanya bisa dihapus saat status WO dikerjakan (status saat ini: %)', v_wo_status;
  end if;

  -- 5. Jika spare part, kunci inventory_items dan kembalikan stok
  if v_bi.jenis = 'part' then
    select stok into v_stok_lama
    from public.inventory_items
    where id = v_bi.item_id
    for update;

    update public.inventory_items
    set stok = stok + v_bi.jumlah
    where id = v_bi.item_id;

    insert into public.stock_movements (
      item_id, jenis, jumlah, stok_sesudah, keterangan, work_order_id, dicatat_oleh
    ) values (
      v_bi.item_id, 'kembali', v_bi.jumlah, v_stok_lama + v_bi.jumlah, 'Dihapus dari tagihan WO', v_bi.work_order_id, auth.uid()
    );
  end if;

  -- 6. Hapus billing_item (billing_item_costs terhapus otomatis via on delete cascade)
  delete from public.billing_items
  where id = p_billing_item;
end;
$$;


-- 3. sesuaikan_harga_item(p_billing_item, p_harga, p_alasan)
-- Dipanggil oleh: Admin, Owner
-- Syarat: Invoice belum terbit, alasan wajib diisi, p_harga >= 0
-- Mengembalikan true jika harga disesuaikan di bawah modal (tanpa menampilkan angka modal)
create or replace function public.sesuaikan_harga_item(
  p_billing_item uuid,
  p_harga bigint,
  p_alasan text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_peran text;
  v_bi record;
  v_modal bigint := 0;
begin
  -- 1. Periksa peran pemanggil
  v_peran := private.peran_saya();
  if v_peran not in ('admin', 'owner') then
    raise exception 'Hanya Admin atau Owner yang boleh menyesuaikan harga item';
  end if;

  -- 2. Validasi input
  if p_harga is null or p_harga < 0 then
    raise exception 'Harga item tidak boleh negatif';
  end if;

  if coalesce(trim(p_alasan), '') = '' then
    raise exception 'Alasan penyesuaian harga wajib diisi';
  end if;

  -- 3. Ambil data billing_item dan kunci baris
  select id, work_order_id, harga_master
  into v_bi
  from public.billing_items
  where id = p_billing_item
  for update;

  if not found then
    raise exception 'Item tagihan tidak ditemukan';
  end if;

  -- 4. Pastikan invoice belum terbit
  if exists (select 1 from public.invoices where work_order_id = v_bi.work_order_id) then
    raise exception 'Harga tidak bisa disesuaikan karena invoice sudah terbit';
  end if;

  -- 5. Ambil harga modal dari billing_item_costs
  select coalesce(harga_modal, 0)
  into v_modal
  from public.billing_item_costs
  where billing_item_id = p_billing_item;

  -- 6. Update harga_dipakai dan alasan
  update public.billing_items
  set
    harga_dipakai = p_harga,
    alasan_penyesuaian = p_alasan,
    disesuaikan_oleh = auth.uid(),
    disesuaikan_at = now()
  where id = p_billing_item;

  -- 7. Kembalikan true jika di bawah modal
  return (p_harga < v_modal);
end;
$$;


-- 4. atur_diskon(p_wo, p_diskon, p_alasan)
-- Dipanggil oleh: Admin, Owner
-- Syarat: Invoice belum terbit, diskon <= subtotal tagihan
create or replace function public.atur_diskon(
  p_wo uuid,
  p_diskon bigint,
  p_alasan text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_peran text;
  v_subtotal bigint;
begin
  -- 1. Periksa peran pemanggil
  v_peran := private.peran_saya();
  if v_peran not in ('admin', 'owner') then
    raise exception 'Hanya Admin atau Owner yang boleh mengatur diskon';
  end if;

  -- 2. Validasi input
  if p_diskon is null or p_diskon < 0 then
    raise exception 'Diskon tidak boleh negatif';
  end if;

  if p_diskon > 0 and coalesce(trim(p_alasan), '') = '' then
    raise exception 'Alasan diskon wajib diisi';
  end if;

  -- 3. Kunci baris WO
  perform 1
  from public.work_orders
  where id = p_wo
  for update;

  if not found then
    raise exception 'Work Order tidak ditemukan';
  end if;

  -- 4. Pastikan invoice belum terbit
  if exists (select 1 from public.invoices where work_order_id = p_wo) then
    raise exception 'Diskon tidak bisa diubah karena invoice sudah terbit';
  end if;

  -- 5. Hitung subtotal tagihan
  select coalesce(sum(jumlah * harga_dipakai), 0)
  into v_subtotal
  from public.billing_items
  where work_order_id = p_wo;

  -- 6. Validasi diskon <= subtotal
  if p_diskon > v_subtotal then
    raise exception 'Diskon (Rp%) tidak boleh melebihi subtotal tagihan (Rp%)', p_diskon, v_subtotal;
  end if;

  -- 7. Update diskon dan alasan di work_orders
  update public.work_orders
  set
    diskon = p_diskon,
    alasan_diskon = case when p_diskon > 0 then p_alasan else null end
  where id = p_wo;
end;
$$;


-- 5. terbitkan_invoice(p_wo)
-- Dipanggil oleh: Admin, Owner
-- Syarat: Status WO 'siap_diambil', belum ada invoice
-- Mengunci baris counter 'INV' pada number_counters dengan FOR UPDATE agar nomor INV-YYYYMM-0001 tidak ganda
create or replace function public.terbitkan_invoice(
  p_wo uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_peran text;
  v_wo record;
  v_subtotal bigint := 0;
  v_diskon bigint := 0;
  v_total bigint := 0;
  v_periode text;
  v_nomor_urut int;
  v_nomor_inv text;
  v_invoice_id uuid;
begin
  -- 1. Periksa peran pemanggil
  v_peran := private.peran_saya();
  if v_peran not in ('admin', 'owner') then
    raise exception 'Hanya Admin atau Owner yang boleh menerbitkan invoice';
  end if;

  -- 2. Kunci baris WO dengan FOR UPDATE
  select id, nomor, status, diskon
  into v_wo
  from public.work_orders
  where id = p_wo
  for update;

  if not found then
    raise exception 'Work Order tidak ditemukan';
  end if;

  -- 3. Syarat status WO harus 'siap_diambil'
  if v_wo.status <> 'siap_diambil' then
    raise exception 'Invoice hanya bisa diterbitkan saat status WO siap_diambil (status saat ini: %)', v_wo.status;
  end if;

  -- 4. Pastikan belum ada invoice untuk WO ini
  if exists (select 1 from public.invoices where work_order_id = p_wo) then
    raise exception 'Invoice untuk WO ini sudah pernah diterbitkan';
  end if;

  -- 5. Hitung subtotal dari billing_items
  select coalesce(sum(jumlah * harga_dipakai), 0)
  into v_subtotal
  from public.billing_items
  where work_order_id = p_wo;

  -- 6. Hitung diskon dan total
  v_diskon := coalesce(v_wo.diskon, 0);
  if v_diskon > v_subtotal then
    v_diskon := v_subtotal;
  end if;
  v_total := v_subtotal - v_diskon;

  -- 7. Kunci number_counters periode berjalan dengan FOR UPDATE
  v_periode := to_char(now(), 'YYYYMM');

  insert into public.number_counters (jenis, periode, terakhir)
  values ('INV', v_periode, 0)
  on conflict (jenis, periode) do nothing;

  select terakhir
  into v_nomor_urut
  from public.number_counters
  where jenis = 'INV' and periode = v_periode
  for update;

  v_nomor_urut := v_nomor_urut + 1;

  update public.number_counters
  set terakhir = v_nomor_urut
  where jenis = 'INV' and periode = v_periode;

  v_nomor_inv := 'INV-' || v_periode || '-' || lpad(v_nomor_urut::text, 4, '0');

  -- 8. Buat baris invoice
  insert into public.invoices (
    work_order_id,
    nomor,
    subtotal,
    diskon,
    total,
    terbayar,
    status_bayar,
    diterbitkan_oleh,
    diterbitkan_at
  ) values (
    p_wo,
    v_nomor_inv,
    v_subtotal,
    v_diskon,
    v_total,
    0,
    'belum_bayar',
    auth.uid(),
    now()
  )
  returning id into v_invoice_id;

  return v_invoice_id;
end;
$$;


-- 6. catat_pembayaran(p_invoice, p_metode, p_jumlah)
-- Dipanggil oleh: Admin, Owner
-- Mengunci baris invoice dengan FOR UPDATE dan memvalidasi p_jumlah <= sisa tagihan
create or replace function public.catat_pembayaran(
  p_invoice uuid,
  p_metode text,
  p_jumlah bigint
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_peran text;
  v_inv record;
  v_sisa bigint;
  v_terbayar_baru bigint;
  v_status_baru text;
  v_payment_id uuid;
begin
  -- 1. Periksa peran pemanggil
  v_peran := private.peran_saya();
  if v_peran not in ('admin', 'owner') then
    raise exception 'Hanya Admin atau Owner yang boleh mencatat pembayaran';
  end if;

  -- 2. Validasi metode pembayaran
  if p_metode not in ('tunai', 'transfer', 'qris') then
    raise exception 'Metode pembayaran tidak valid (pilihan: tunai, transfer, qris)';
  end if;

  -- 3. Validasi jumlah pembayaran
  if p_jumlah is null or p_jumlah <= 0 then
    raise exception 'Jumlah pembayaran harus lebih dari 0';
  end if;

  -- 4. Kunci baris invoice dengan FOR UPDATE
  select id, total, terbayar, status_bayar
  into v_inv
  from public.invoices
  where id = p_invoice
  for update;

  if not found then
    raise exception 'Invoice tidak ditemukan';
  end if;

  -- 5. Hitung sisa tagihan dan validasi
  v_sisa := v_inv.total - v_inv.terbayar;
  if v_sisa <= 0 then
    raise exception 'Invoice sudah lunas';
  end if;

  if p_jumlah > v_sisa then
    raise exception 'Jumlah pembayaran (Rp%) melebihi sisa tagihan (Rp%)', p_jumlah, v_sisa;
  end if;

  -- 6. Hitung akumulasi terbayar dan status baru
  v_terbayar_baru := v_inv.terbayar + p_jumlah;
  if v_terbayar_baru >= v_inv.total then
    v_status_baru := 'lunas';
  else
    v_status_baru := 'sebagian';
  end if;

  -- 7. Perbarui status invoice
  update public.invoices
  set
    terbayar = v_terbayar_baru,
    status_bayar = v_status_baru
  where id = p_invoice;

  -- 8. Tambahkan ke payments
  insert into public.payments (
    invoice_id,
    metode,
    jumlah,
    dicatat_oleh
  ) values (
    p_invoice,
    p_metode,
    p_jumlah,
    auth.uid()
  )
  returning id into v_payment_id;

  return v_payment_id;
end;
$$;


-- ---------- Hak Akses Eksekusi (Grant & Revoke) ----------
revoke all on function public.tambah_item_tagihan(uuid, uuid, int) from public, anon;
grant execute on function public.tambah_item_tagihan(uuid, uuid, int) to authenticated;

revoke all on function public.hapus_item_tagihan(uuid) from public, anon;
grant execute on function public.hapus_item_tagihan(uuid) to authenticated;

revoke all on function public.sesuaikan_harga_item(uuid, bigint, text) from public, anon;
grant execute on function public.sesuaikan_harga_item(uuid, bigint, text) to authenticated;

revoke all on function public.atur_diskon(uuid, bigint, text) from public, anon;
grant execute on function public.atur_diskon(uuid, bigint, text) to authenticated;

revoke all on function public.terbitkan_invoice(uuid) from public, anon;
grant execute on function public.terbitkan_invoice(uuid) to authenticated;

revoke all on function public.catat_pembayaran(uuid, text, bigint) from public, anon;
grant execute on function public.catat_pembayaran(uuid, text, bigint) to authenticated;

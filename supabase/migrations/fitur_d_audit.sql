-- =============================================================
-- App 4 Cemerlang Jaya Motor · Fitur D: Audit Log Trigger (PRD 9.4)
-- =============================================================

-- 1. Fungsi trigger pencatatan audit log
create or replace function private.catat_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sebelum jsonb := case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(OLD) else null end;
  v_sesudah jsonb := case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(NEW) else null end;
  v_data_id text;
  v_alasan text;
begin
  -- Menentukan data_id berdasarkan primary key tabel masing-masing
  v_data_id := coalesce(
    v_sesudah->>'id', v_sebelum->>'id',
    v_sesudah->>'billing_item_id', v_sebelum->>'billing_item_id',
    v_sesudah->>'item_id', v_sebelum->>'item_id'
  );

  -- Mengambil alasan jika ada pada kolom tabel yang bersangkutan
  v_alasan := coalesce(
    v_sesudah->>'alasan', v_sebelum->>'alasan',
    v_sesudah->>'alasan_penyesuaian', v_sebelum->>'alasan_penyesuaian',
    v_sesudah->>'alasan_diskon', v_sebelum->>'alasan_diskon',
    v_sesudah->>'catatan_status', v_sebelum->>'catatan_status',
    v_sesudah->>'keterangan', v_sebelum->>'keterangan'
  );

  insert into public.audit_logs (
    waktu,
    pelaku_id,
    pelaku_peran,
    aksi,
    tabel,
    data_id,
    sebelum,
    sesudah,
    alasan
  ) values (
    now(),
    auth.uid(),
    private.peran_saya(),
    TG_OP,
    TG_TABLE_NAME,
    v_data_id,
    v_sebelum,
    v_sesudah,
    v_alasan
  );

  return coalesce(NEW, OLD);
end;
$$;

-- 2. Pasang trigger catat_audit di 9 tabel sesuai PRD 9.4
drop trigger if exists catat_audit on public.work_orders;
create trigger catat_audit
after insert or update or delete on public.work_orders
for each row execute function private.catat_audit();

drop trigger if exists catat_audit on public.billing_items;
create trigger catat_audit
after insert or update or delete on public.billing_items
for each row execute function private.catat_audit();

drop trigger if exists catat_audit on public.billing_item_costs;
create trigger catat_audit
after insert or update or delete on public.billing_item_costs
for each row execute function private.catat_audit();

drop trigger if exists catat_audit on public.inventory_items;
create trigger catat_audit
after insert or update or delete on public.inventory_items
for each row execute function private.catat_audit();

drop trigger if exists catat_audit on public.inventory_costs;
create trigger catat_audit
after insert or update or delete on public.inventory_costs
for each row execute function private.catat_audit();

drop trigger if exists catat_audit on public.invoices;
create trigger catat_audit
after insert or update or delete on public.invoices
for each row execute function private.catat_audit();

drop trigger if exists catat_audit on public.payments;
create trigger catat_audit
after insert or update or delete on public.payments
for each row execute function private.catat_audit();

drop trigger if exists catat_audit on public.stock_movements;
create trigger catat_audit
after insert or update or delete on public.stock_movements
for each row execute function private.catat_audit();

drop trigger if exists catat_audit on public.profiles;
create trigger catat_audit
after insert or update or delete on public.profiles
for each row execute function private.catat_audit();

-- 3. Proteksi audit_logs: tidak dapat diubah atau dihapus siapa pun
create or replace function private.kunci_audit_logs()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Catatan audit log bersifat permanen dan tidak boleh diubah atau dihapus';
end;
$$;

drop trigger if exists jangan_ubah_audit_logs on public.audit_logs;
create trigger jangan_ubah_audit_logs
before update or delete on public.audit_logs
for each row execute function private.kunci_audit_logs();

revoke insert, update, delete on public.audit_logs from public, anon, authenticated;

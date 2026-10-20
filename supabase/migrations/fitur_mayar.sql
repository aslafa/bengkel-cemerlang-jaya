
-- 1. Tambah kolom Mayar pada tabel public.invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS mayar_invoice_id text,
  ADD COLUMN IF NOT EXISTS mayar_link text,
  ADD COLUMN IF NOT EXISTS mayar_jumlah bigint,
  ADD COLUMN IF NOT EXISTS dibayar_online_at timestamptz;

-- 2. Tambah metode pembayaran 'mayar' pada constraint public.payments
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_metode_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_metode_check
  CHECK (metode IN ('tunai', 'transfer', 'qris', 'mayar'));

-- 3. Tabel log webhook Mayar dengan RLS aktif (hanya Owner yang membaca)
CREATE TABLE IF NOT EXISTS public.mayar_webhook_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL,
  mayar_invoice_id text,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'diterima',
  pesan_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mayar_webhook_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_baca_mayar_webhook_log" ON public.mayar_webhook_log;
CREATE POLICY "owner_baca_mayar_webhook_log"
  ON public.mayar_webhook_log
  FOR SELECT
  TO authenticated
  USING (private.peran_saya() = 'owner');

-- 4. Fungsi simpan_link_mayar untuk Admin dan Owner
CREATE OR REPLACE FUNCTION public.simpan_link_mayar(
  p_invoice_id uuid,
  p_mayar_invoice_id text,
  p_mayar_link text,
  p_mayar_jumlah bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_peran text;
  v_status_bayar text;
BEGIN
  -- Periksa peran pemanggil
  v_peran := private.peran_saya();
  IF v_peran NOT IN ('admin', 'owner') THEN
    RAISE EXCEPTION 'Hanya Admin atau Owner yang boleh menyimpan link pembayaran Mayar';
  END IF;

  -- Validasi input
  IF p_mayar_invoice_id IS NULL OR trim(p_mayar_invoice_id) = '' THEN
    RAISE EXCEPTION 'Mayar invoice ID wajib diisi';
  END IF;

  IF p_mayar_link IS NULL OR trim(p_mayar_link) = '' THEN
    RAISE EXCEPTION 'Link pembayaran Mayar wajib diisi';
  END IF;

  IF p_mayar_jumlah IS NULL OR p_mayar_jumlah <= 0 THEN
    RAISE EXCEPTION 'Jumlah pembayaran Mayar harus lebih dari 0';
  END IF;

  -- Kunci baris invoice dengan FOR UPDATE
  SELECT status_bayar
  INTO v_status_bayar
  FROM public.invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice tidak ditemukan';
  END IF;

  IF v_status_bayar = 'lunas' THEN
    RAISE EXCEPTION 'Invoice sudah lunas, tidak dapat membuat link pembayaran baru';
  END IF;

  -- Update data Mayar pada invoice
  UPDATE public.invoices
  SET
    mayar_invoice_id = p_mayar_invoice_id,
    mayar_link = p_mayar_link,
    mayar_jumlah = p_mayar_jumlah
  WHERE id = p_invoice_id;
END;
$$;

REVOKE ALL ON FUNCTION public.simpan_link_mayar(uuid, text, text, bigint) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.simpan_link_mayar(uuid, text, text, bigint) TO authenticated;

-- 5. Fungsi tandai_lunas_mayar (Hanya bisa dijalankan dengan Secret Key / service_role)
CREATE OR REPLACE FUNCTION public.tandai_lunas_mayar(
  p_mayar_invoice_id text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_inv record;
  v_jumlah_bayar bigint;
  v_sisa bigint;
  v_terbayar_baru bigint;
  v_status_baru text;
  v_payment_id uuid;
BEGIN
  -- Validasi keamanan pemanggil: hanya service_role (secret key)
  IF auth.role() IS DISTINCT FROM 'service_role' AND current_user IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Akses ditolak: fungsi ini hanya boleh dipanggil menggunakan secret key (service_role)';
  END IF;

  IF p_mayar_invoice_id IS NULL OR trim(p_mayar_invoice_id) = '' THEN
    RAISE EXCEPTION 'Mayar invoice ID wajib diisi';
  END IF;

  -- Kunci baris invoice dengan FOR UPDATE
  SELECT id, total, terbayar, status_bayar, mayar_jumlah
  INTO v_inv
  FROM public.invoices
  WHERE mayar_invoice_id = p_mayar_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice dengan Mayar ID % tidak ditemukan', p_mayar_invoice_id;
  END IF;

  -- Jika invoice sudah lunas, hentikan pencatatan ganda
  IF v_inv.status_bayar = 'lunas' THEN
    RETURN jsonb_build_object(
      'status', 'sudah_lunas',
      'invoice_id', v_inv.id,
      'pesan', 'Invoice sudah berstatus lunas sebelumnya'
    );
  END IF;

  -- Hitung sisa dan nominal pembayaran
  v_sisa := v_inv.total - v_inv.terbayar;
  v_jumlah_bayar := coalesce(v_inv.mayar_jumlah, v_sisa);

  IF v_jumlah_bayar > v_sisa THEN
    v_jumlah_bayar := v_sisa;
  END IF;

  IF v_jumlah_bayar <= 0 THEN
    RETURN jsonb_build_object(
      'status', 'sudah_lunas',
      'invoice_id', v_inv.id,
      'pesan', 'Sisa tagihan invoice adalah 0'
    );
  END IF;

  -- Hitung akumulasi pembayaran baru
  v_terbayar_baru := v_inv.terbayar + v_jumlah_bayar;
  IF v_terbayar_baru >= v_inv.total THEN
    v_status_baru := 'lunas';
  ELSE
    v_status_baru := 'sebagian';
  END IF;

  -- Perbarui status invoice dan waktu pembayaran online
  UPDATE public.invoices
  SET
    terbayar = v_terbayar_baru,
    status_bayar = v_status_baru,
    dibayar_online_at = now()
  WHERE id = v_inv.id;

  -- Catat entri pembayaran dengan metode 'mayar'
  INSERT INTO public.payments (
    invoice_id,
    metode,
    jumlah,
    dicatat_oleh
  ) VALUES (
    v_inv.id,
    'mayar',
    v_jumlah_bayar,
    NULL
  )
  RETURNING id INTO v_payment_id;

  RETURN jsonb_build_object(
    'status', 'sukses',
    'invoice_id', v_inv.id,
    'payment_id', v_payment_id,
    'jumlah', v_jumlah_bayar,
    'status_bayar', v_status_baru
  );
END;
$$;

-- Cabut akses dari public/anon/authenticated dan batasi hanya untuk service_role
REVOKE ALL ON FUNCTION public.tandai_lunas_mayar(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tandai_lunas_mayar(text) TO service_role;

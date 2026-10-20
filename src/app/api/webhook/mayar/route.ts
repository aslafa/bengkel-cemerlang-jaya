import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database";

// Inisialisasi Supabase Admin Client khusus webhook (menggunakan Secret Key / service_role)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    return null;
  }

  return createClient<Database>(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

interface MayarWebhookPayload {
  event?: string;
  id?: string;
  data?: {
    id?: string;
    invoiceId?: string;
    transactionId?: string;
    status?: string;
    amount?: number;
    totalAmount?: number;
    extraData?: {
      invoiceId?: string;
      invoiceNomor?: string;
    };
  };
  extraData?: {
    invoiceId?: string;
    invoiceNomor?: string;
  };
  [key: string]: unknown;
}

interface MayarDetailResponse {
  statusCode?: number;
  message?: string;
  messages?: string;
  data?: {
    id?: string;
    status?: string;
    amount?: number;
    totalAmount?: number;
  };
  status?: string;
  amount?: number;
  totalAmount?: number;
}

// Hanya menerima metode POST
export async function POST(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin();

  // 1. Validasi konfigurasi Secret Key server (Kegagalan server internal -> HTTP 500 agar diretry)
  if (!supabaseAdmin) {
    return NextResponse.json(
      {
        received: false,
        retry: true,
        error: "Konfigurasi kredensial webhook di server belum lengkap.",
      },
      { status: 500 }
    );
  }

  // 2. Baca dan validasi format payload (Kesalahan client permanen -> HTTP 400)
  let payload: MayarWebhookPayload | null = null;
  try {
    payload = (await req.json()) as MayarWebhookPayload;
  } catch {
    return NextResponse.json(
      {
        received: false,
        error: "Format data webhook tidak valid (bukan JSON).",
      },
      { status: 400 }
    );
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json(
      {
        received: false,
        error: "Isi payload webhook kosong atau tidak sesuai.",
      },
      { status: 400 }
    );
  }

  // 3. Ekstrak data pokok dari webhook
  const event = typeof payload.event === "string" ? payload.event : "unknown";

  // Ekstrak ID invoice Mayar dengan prioritas ketat:
  // Prioritas 1: data.invoiceId (format standar Mayar V2 untuk webhook terkait invoice)
  let mayarInvoiceId: string | null = null;
  if (typeof payload.data?.invoiceId === "string" && payload.data.invoiceId.trim()) {
    mayarInvoiceId = payload.data.invoiceId.trim();
  }
  // Prioritas 2: data.id HANYA jika bukan transaction id (trx_) atau log id (wh_)
  // serta tidak ada field transactionId terpisah dalam data
  else if (
    typeof payload.data?.id === "string" &&
    payload.data.id.trim() &&
    !payload.data.id.startsWith("trx_") &&
    !payload.data.id.startsWith("wh_") &&
    !payload.data.transactionId
  ) {
    mayarInvoiceId = payload.data.id.trim();
  }
  // Prioritas 3: Fallback aman melalui referensi invoice internal di extraData
  // Mencari mayar_invoice_id resmi yang tersimpan di database bengkel
  // (TIDAK pernah memakai internal UUID bengkel langsung sebagai ID invoice Mayar)
  else {
    const rawInternalId =
      payload.data?.extraData?.invoiceId || payload.extraData?.invoiceId;
    if (typeof rawInternalId === "string" && rawInternalId.trim()) {
      const { data: invRow } = await supabaseAdmin
        .from("invoices")
        .select("mayar_invoice_id")
        .eq("id", rawInternalId.trim())
        .maybeSingle();

      if (invRow?.mayar_invoice_id) {
        mayarInvoiceId = invRow.mayar_invoice_id;
      }
    }
  }

  // 4. Catat setiap webhook ke mayar_webhook_log
  let logId: string | null = null;
  try {
    const { data: logEntry } = await supabaseAdmin
      .from("mayar_webhook_log")
      .insert({
        event,
        mayar_invoice_id: mayarInvoiceId,
        payload: payload as unknown as Json,
        status: "diproses",
      })
      .select("id")
      .single();

    if (logEntry) {
      logId = logEntry.id;
    }
  } catch {
    // Tetap lanjutkan pemrosesan meskipun pencatatan awal terkendala
  }

  // Helper untuk memperbarui status log akhir
  async function perbaruiLog(
    status: "diterima" | "ditolak" | "gagal_sementara",
    pesanError: string | null = null
  ) {
    if (!supabaseAdmin || !logId) return;
    try {
      await supabaseAdmin
        .from("mayar_webhook_log")
        .update({
          status,
          pesan_error: pesanError,
        })
        .eq("id", logId);
    } catch {
      // Abaikan kegagalan pembaruan log
    }
  }

  // Validasi keberadaan ID invoice Mayar (Kegagalan permanen -> HTTP 200 ditolak agar tidak diretry)
  if (!mayarInvoiceId) {
    const pesan = "ID invoice Mayar tidak ditemukan di dalam payload webhook.";
    await perbaruiLog("ditolak", pesan);
    return NextResponse.json({
      received: true,
      status: "ditolak",
      pesan,
    });
  }

  // 5. Verifikasi Ulang Out-Of-Band via API Detail Mayar (Jangan percaya payload webhook langsung)
  const mayarApiKey = process.env.MAYAR_API_KEY;
  const mayarBaseUrl = process.env.MAYAR_BASE_URL || "https://api.mayar.io/hl/v2";

  if (!mayarApiKey || !mayarApiKey.trim()) {
    const pesan = "Kunci otentikasi Mayar belum diatur di server.";
    await perbaruiLog("gagal_sementara", pesan);
    return NextResponse.json(
      {
        received: false,
        retry: true,
        error: pesan,
      },
      { status: 500 }
    );
  }

  const endpointDetail = `${mayarBaseUrl.replace(/\/$/, "")}/invoices/${mayarInvoiceId}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  let verifyResponse: Response;
  try {
    verifyResponse = await fetch(endpointDetail, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${mayarApiKey.trim()}`,
      },
      signal: controller.signal,
    });
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const isTimeout = (err as Error)?.name === "AbortError";
    const pesan = isTimeout
      ? "Batas waktu verifikasi ke API detail Mayar terlampaui (10 detik)."
      : "Gagal menghubungkan ke API detail Mayar.";

    // Kegagalan jaringan sementara: catat sebagai gagal_sementara dan kembalikan 5xx agar Mayar me-retry
    await perbaruiLog("gagal_sementara", pesan);
    return NextResponse.json(
      {
        received: false,
        retry: true,
        error: pesan,
      },
      { status: isTimeout ? 504 : 502 }
    );
  } finally {
    clearTimeout(timeoutId);
  }

  let verifyData: MayarDetailResponse | null = null;
  try {
    verifyData = (await verifyResponse.json()) as MayarDetailResponse;
  } catch {
    const pesan = "Respons dari API detail Mayar tidak dapat diproses.";
    await perbaruiLog("gagal_sementara", pesan);
    return NextResponse.json(
      {
        received: false,
        retry: true,
        error: pesan,
      },
      { status: 502 }
    );
  }

  // Jika API Mayar mengembalikan kesalahan
  if (!verifyResponse.ok) {
    const isMayarServerError = verifyResponse.status >= 500;
    const detailError =
      typeof verifyData?.message === "string"
        ? verifyData.message
        : `Server Mayar merespons dengan status ${verifyResponse.status}.`;
    const pesan = `Verifikasi invoice ke Mayar gagal: ${detailError}`;

    if (isMayarServerError) {
      // Server Mayar mengalami gangguan sementara -> kembalikan 502 agar diretry nanti
      await perbaruiLog("gagal_sementara", pesan);
      return NextResponse.json(
        {
          received: false,
          retry: true,
          error: pesan,
        },
        { status: 502 }
      );
    }

    // Kesalahan 4xx dari Mayar (misal 404 invoice tidak ditemukan) -> penolakan definitif
    await perbaruiLog("ditolak", pesan);
    return NextResponse.json({
      received: true,
      status: "ditolak",
      pesan,
    });
  }

  const invoiceMayar = verifyData?.data || verifyData;
  const statusMayar = String(invoiceMayar?.status || "").toLowerCase();
  const amountMayar = Number(invoiceMayar?.amount ?? invoiceMayar?.totalAmount ?? 0);

  // 6. Cek status pembayaran harus 'paid' (Penolakan substantif permanen -> HTTP 200 ditolak)
  if (statusMayar !== "paid") {
    const pesan = `Status pembayaran pada Mayar belum lunas (status saat ini: ${statusMayar || "tidak diketahui"}).`;
    await perbaruiLog("ditolak", pesan);
    return NextResponse.json({
      received: true,
      status: "ditolak",
      pesan,
    });
  }

  // 7. Ambil data invoice internal dan bandingkan nominal
  const { data: invoiceInternal, error: queryError } = await supabaseAdmin
    .from("invoices")
    .select("id, nomor, status_bayar, mayar_jumlah, total, terbayar")
    .eq("mayar_invoice_id", mayarInvoiceId)
    .maybeSingle();

  if (queryError || !invoiceInternal) {
    const pesan = `Invoice internal dengan ID Mayar ${mayarInvoiceId} tidak ditemukan di database.`;
    await perbaruiLog("ditolak", pesan);
    return NextResponse.json({
      received: true,
      status: "ditolak",
      pesan,
    });
  }

  const nominalTercatat = Number(invoiceInternal.mayar_jumlah ?? 0);

  // Cek kesesuaian nominal (Penolakan substantif permanen -> HTTP 200 ditolak)
  if (amountMayar !== nominalTercatat) {
    const pesan = `Nominal pembayaran terverifikasi (${amountMayar}) berbeda dengan nominal tagihan terdaftar (${nominalTercatat}).`;
    await perbaruiLog("ditolak", pesan);
    return NextResponse.json({
      received: true,
      status: "ditolak",
      pesan,
    });
  }

  // 8. Tangani idempotensi jika invoice sudah berstatus lunas sebelumnya
  if (invoiceInternal.status_bayar === "lunas") {
    const pesan = "Invoice sudah berstatus lunas sebelumnya.";
    await perbaruiLog("diterima", pesan);
    return NextResponse.json({
      received: true,
      status: "diterima",
      pesan,
    });
  }

  // 9. Panggil fungsi tandai_lunas_mayar lewat Supabase Admin (service_role)
  const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc("tandai_lunas_mayar", {
    p_mayar_invoice_id: mayarInvoiceId,
  });

  if (rpcError) {
    const pesan = `Gagal memperbarui status lunas di database: ${rpcError.message}`;
    // Kesalahan eksekusi database: catat sebagai gagal_sementara dan minta retry lewat HTTP 500
    await perbaruiLog("gagal_sementara", pesan);
    return NextResponse.json(
      {
        received: false,
        retry: true,
        error: pesan,
      },
      { status: 500 }
    );
  }

  // 10. Sukses: Catat status akhir log sebagai diterima dan balas HTTP 200
  await perbaruiLog("diterima", null);

  return NextResponse.json({
    received: true,
    status: "diterima",
    hasil: rpcResult,
  });
}

// Tolak metode selain POST dengan HTTP 405 Method Not Allowed
export async function GET() {
  return NextResponse.json({ error: "Metode tidak diizinkan. Hanya POST yang diterima." }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Metode tidak diizinkan. Hanya POST yang diterima." }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Metode tidak diizinkan. Hanya POST yang diterima." }, { status: 405 });
}

export async function PATCH() {
  return NextResponse.json({ error: "Metode tidak diizinkan. Hanya POST yang diterima." }, { status: 405 });
}

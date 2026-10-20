import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Verifikasi autentikasi pengguna
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Sesi tidak valid atau Anda belum masuk." },
        { status: 401 }
      );
    }

    // Periksa peran dari tabel profiles (Hanya Admin atau Owner)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, aktif")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || !profile.aktif) {
      return NextResponse.json(
        { error: "Profil pengguna tidak aktif atau tidak ditemukan." },
        { status: 403 }
      );
    }

    if (!["admin", "owner"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya Admin atau Owner yang diizinkan membuat pembayaran." },
        { status: 403 }
      );
    }

    // 2. Baca payload ID invoice
    let body: { id?: string } = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Format data permintaan tidak valid." },
        { status: 400 }
      );
    }

    const invoiceId = body.id;
    if (!invoiceId || typeof invoiceId !== "string" || !invoiceId.trim()) {
      return NextResponse.json(
        { error: "ID invoice wajib diisi." },
        { status: 400 }
      );
    }

    // Ambil data invoice dari database
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(`
        id,
        nomor,
        total,
        terbayar,
        status_bayar,
        mayar_link,
        mayar_jumlah,
        mayar_invoice_id,
        work_order_id
      `)
      .eq("id", invoiceId.trim())
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: "Invoice tidak ditemukan." },
        { status: 404 }
      );
    }

    // Hitung sisa tagihan (total dikurangi terbayar)
    const sisa = (invoice.total ?? 0) - (invoice.terbayar ?? 0);

    // Tolak bila invoice sudah lunas
    if (invoice.status_bayar === "lunas" || sisa <= 0) {
      return NextResponse.json(
        { error: "Invoice ini sudah lunas." },
        { status: 400 }
      );
    }

    // Ambil data pelanggan melalui work order
    const { data: workOrder, error: woError } = await supabase
      .from("work_orders")
      .select(`
        id,
        customers:customer_id (
          id,
          nama,
          email,
          telepon
        )
      `)
      .eq("id", invoice.work_order_id)
      .single();

    if (woError || !workOrder) {
      return NextResponse.json(
        { error: "Data work order untuk invoice ini tidak ditemukan." },
        { status: 404 }
      );
    }

    const customer = workOrder.customers as {
      id: string;
      nama: string;
      email: string | null;
      telepon: string | null;
    } | null;

    // Tolak bila email pelanggan kosong
    if (!customer?.email || !customer.email.trim()) {
      return NextResponse.json(
        {
          error: `Email pelanggan (${customer?.nama || "Pelanggan"}) belum terdaftar. Silakan lengkapi data email pelanggan di menu Pelanggan untuk melanjutkan pembayaran online.`,
          code: "EMAIL_KOSONG",
          customerId: customer?.id ?? null,
        },
        { status: 400 }
      );
    }

    // 3. Bila invoice sudah punya mayar_link dan mayar_jumlah sama dengan sisa tagihan, kembalikan tautan itu
    if (
      invoice.mayar_link &&
      invoice.mayar_jumlah !== null &&
      Number(invoice.mayar_jumlah) === sisa
    ) {
      return NextResponse.json({
        link: invoice.mayar_link,
        mayarInvoiceId: invoice.mayar_invoice_id,
        jumlah: sisa,
      });
    }

    // 4. Buat invoice baru di Mayar
    const mayarApiKey = process.env.MAYAR_API_KEY;
    const mayarBaseUrl = process.env.MAYAR_BASE_URL || "https://api.mayar.io/hl/v2";

    if (!mayarApiKey || !mayarApiKey.trim()) {
      return NextResponse.json(
        { error: "Konfigurasi kunci pembayaran Mayar belum diatur di server." },
        { status: 500 }
      );
    }

    // Ambil item tagihan dari database
    const { data: billingItems } = await supabase
      .from("billing_items")
      .select("id, nama_item, jumlah, harga_dipakai")
      .eq("work_order_id", invoice.work_order_id)
      .order("created_at", { ascending: true });

    // Tentukan item-item untuk invoice Mayar
    // Total rate * quantity di Mayar harus sama persis dengan sisa tagihan
    const totalItems = (billingItems ?? []).reduce(
      (acc, it) => acc + (it.harga_dipakai ?? 0) * (it.jumlah ?? 0),
      0
    );

    let itemsPayload: Array<{
      quantity: number;
      rate: number;
      description: string;
    }> = [];

    if (totalItems === sisa && (billingItems ?? []).length > 0) {
      itemsPayload = (billingItems ?? []).map((it) => ({
        quantity: Math.max(1, it.jumlah || 1),
        rate: it.harga_dipakai || 0,
        description: it.nama_item || "Item Layanan / Suku Cadang",
      }));
    } else {
      // Jika terdapat diskon atau pembayaran sebagian sebelumnya yang menyebabkan
      // total item != sisa tagihan, gunakan 1 item ringkasan sisa tagihan
      itemsPayload = [
        {
          quantity: 1,
          rate: sisa,
          description: `Pelunasan Invoice #${invoice.nomor}`,
        },
      ];
    }

    const payload = {
      name: customer.nama || "Pelanggan",
      email: customer.email.trim(),
      mobile: customer.telepon || "081234567890",
      description: `Pembayaran Invoice #${invoice.nomor}`,
      items: itemsPayload,
      extraData: {
        invoiceId: invoice.id,
        invoiceNomor: invoice.nomor,
      },
    };

    // 5. Permintaan ke API Mayar dengan batas waktu 10 detik
    const endpoint = `${mayarBaseUrl.replace(/\/$/, "")}/invoices/create`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let mayarResponse: Response;
    try {
      mayarResponse = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mayarApiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if ((err as Error)?.name === "AbortError") {
        return NextResponse.json(
          { error: "Waktu permintaan ke layanan pembayaran Mayar habis (batas waktu 10 detik)." },
          { status: 504 }
        );
      }
      return NextResponse.json(
        { error: "Gagal terhubung ke layanan pembayaran Mayar." },
        { status: 502 }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    interface MayarResponseData {
      id?: string;
      link?: string;
      paymentUrl?: string;
      url?: string;
      message?: string;
      error?: string;
      data?: {
        id?: string;
        link?: string;
        paymentUrl?: string;
        url?: string;
      };
    }

    let responseData: MayarResponseData | null = null;
    try {
      responseData = (await mayarResponse.json()) as MayarResponseData;
    } catch {
      return NextResponse.json(
        { error: "Respons dari layanan Mayar tidak dapat dibaca." },
        { status: 502 }
      );
    }

    if (!mayarResponse.ok) {
      const pesanError =
        typeof responseData?.message === "string"
          ? responseData.message
          : typeof responseData?.error === "string"
            ? responseData.error
            : "Permintaan ditolak oleh server Mayar.";

      return NextResponse.json(
        { error: `Gagal membuat invoice di Mayar: ${pesanError}` },
        { status: mayarResponse.status >= 400 && mayarResponse.status < 500 ? 400 : 502 }
      );
    }

    const dataObj = responseData?.data || responseData;
    const mayarInvoiceId = dataObj?.id;
    const mayarLink = dataObj?.link || dataObj?.paymentUrl || dataObj?.url;

    if (!mayarInvoiceId || !mayarLink) {
      return NextResponse.json(
        { error: "Respons Mayar tidak memuat tautan atau ID pembayaran." },
        { status: 502 }
      );
    }

    // Simpan data Mayar ke database lewat fungsi simpan_link_mayar
    const { error: rpcError } = await supabase.rpc("simpan_link_mayar", {
      p_invoice_id: invoice.id,
      p_mayar_invoice_id: String(mayarInvoiceId),
      p_mayar_link: String(mayarLink),
      p_mayar_jumlah: sisa,
    });

    if (rpcError) {
      return NextResponse.json(
        { error: `Gagal menyimpan link pembayaran ke database: ${rpcError.message}` },
        { status: 500 }
      );
    }

    // Kembalikan tautan pembayaran
    return NextResponse.json({
      link: mayarLink,
      mayarInvoiceId: String(mayarInvoiceId),
      jumlah: sisa,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Terjadi kesalahan pada server.";
    return NextResponse.json(
      { error: `Terjadi kesalahan internal: ${message}` },
      { status: 500 }
    );
  }
}

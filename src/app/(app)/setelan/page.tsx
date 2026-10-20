import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ambilProfilSaya } from "@/lib/profil";
import { createClient } from "@/lib/supabase/server";
import { FormSetelan } from "./FormSetelan";
import { PaymentGatewaySetelan, type WebhookLogRow } from "./PaymentGatewaySetelan";

export default async function HalamanSetelan() {
  const profil = await ambilProfilSaya();
  if (profil.peran !== "owner") {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: settings, error } = await supabase
    .from("workshop_settings")
    .select("id, nama, alamat, telepon, jam_buka, logo_path, galeri_paths, updated_at")
    .eq("id", 1)
    .single();

  if (error || !settings) {
    return (
      <div className="p-6 text-center text-danger">
        Setelan bengkel gagal dimuat. Pastikan tabel workshop_settings telah terisi.
      </div>
    );
  }

  // Ambil 10 baris terakhir log webhook Mayar (kebijakan RLS mengizinkan Owner)
  const { data: rawLogs } = await supabase
    .from("mayar_webhook_log")
    .select("id, event, mayar_invoice_id, status, pesan_error, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  const logs: WebhookLogRow[] = rawLogs ?? [];

  // Periksa ketersediaan konfigurasi di server tanpa menampilkan nilainya
  const hasMayarApiKey = Boolean(process.env.MAYAR_API_KEY && process.env.MAYAR_API_KEY.trim());
  const hasSupabaseSecretKey = Boolean(
    process.env.SUPABASE_SECRET_KEY && process.env.SUPABASE_SECRET_KEY.trim()
  );
  const statusTerhubung = hasMayarApiKey && hasSupabaseSecretKey;

  const mayarBaseUrl = process.env.MAYAR_BASE_URL || "https://api.mayar.io/hl/v2";
  const modeSandbox = mayarBaseUrl.includes("mayar.io") || !process.env.MAYAR_BASE_URL;

  // Dapatkan URL Webhook yang dapat disalin
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") || headerList.get("host") || "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") || "http";
  const webhookUrl = `${proto}://${host}/api/webhook/mayar`;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-text">Setelan Bengkel</h1>
        <p className="text-sm text-muted-foreground">
          Kelola profil bengkel, identitas visual (logo), galeri halaman depan, dan integrasi pembayaran.
        </p>
      </div>

      <FormSetelan settings={settings} />

      {/* Bagian Payment Gateway khusus Owner */}
      <PaymentGatewaySetelan
        statusTerhubung={statusTerhubung}
        statusDetail={{
          mayarApiKey: hasMayarApiKey,
          supabaseSecretKey: hasSupabaseSecretKey,
        }}
        modeSandbox={modeSandbox}
        webhookUrl={webhookUrl}
        logs={logs}
      />
    </div>
  );
}


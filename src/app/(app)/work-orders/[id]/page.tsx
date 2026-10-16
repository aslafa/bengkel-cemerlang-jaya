import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertCircle,
  Car,
  Clock,
  MessageCircle,
  Phone,
  User,
  Wrench,
} from "lucide-react";
import { BadgeStatus } from "@/components/BadgeStatus";
import { TabWorkOrder } from "@/components/TabWorkOrder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { rupiah, tanggal } from "@/lib/format";
import { ambilProfilSaya } from "@/lib/profil";
import type { StatusWO } from "@/lib/status-wo";
import { createClient } from "@/lib/supabase/server";
import { isWOTerlambat, linkWhatsApp } from "@/lib/wo-aturan";
import { AksiStatusWO } from "./AksiStatusWO";
import { FormDiagnosisWO } from "./FormDiagnosisWO";
import { FormPenugasanWO } from "./FormPenugasanWO";
import { GaleriFotoWO, type FotoItem } from "./GaleriFotoWO";
import { ModalEditDataMasuk } from "./ModalEditDataMasuk";

function hitungThumbPath(path: string) {
  const parts = path.split("/");
  if (parts.length === 3) {
    return `${parts[0]}/${parts[1]}/thumb/${parts[2]}`;
  }
  return path;
}

export default async function RincianWorkOrder({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profil = await ambilProfilSaya();
  const supabase = await createClient();

  // 1. Ambil data utama Work Order
  const { data: wo, error } = await supabase
    .from("work_orders")
    .select(
      `
      *,
      vehicles (*),
      customers (*),
      profiles!work_orders_kepala_mekanik_id_fkey (id, nama)
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !wo) {
    notFound();
  }

  // 2. Ambil penugasan mekanik saat ini
  const { data: penugasanList } = await supabase
    .from("work_order_mekanik")
    .select("mekanik_id, mekanik (id, nama)")
    .eq("work_order_id", id);

  const mekanikDitugaskan = (penugasanList ?? [])
    .map((p) => p.mekanik)
    .filter((m): m is { id: string; nama: string } => m !== null);

  // 3. Ambil mekanik tim untuk form penugasan di Bagian B
  const [{ data: mekanikTimList }, { data: bebanMekanikList }] = await Promise.all([
    supabase
      .from("mekanik")
      .select("id, nama")
      .eq("kepala_mekanik_id", wo.kepala_mekanik_id)
      .eq("aktif", true)
      .order("nama"),
    supabase
      .from("work_order_mekanik")
      .select("mekanik_id, work_orders!inner(status)")
      .in("work_orders.status", ["dikerjakan", "tertunda", "selesai"]),
  ]);

  const bebanMap = new Map<string, number>();
  bebanMekanikList?.forEach((b) => {
    bebanMap.set(b.mekanik_id, (bebanMap.get(b.mekanik_id) ?? 0) + 1);
  });

  const mekanikTim = (mekanikTimList ?? []).map((m) => ({
    id: m.id,
    nama: m.nama,
    bebanAktif: bebanMap.get(m.id) ?? 0,
  }));

  // 4. Ambil foto-foto WO dan buat signed URLs (PRD 11.3 & 11.4)
  const { data: fotoRows } = await supabase
    .from("work_order_photos")
    .select("id, jenis, path, created_at")
    .eq("work_order_id", id)
    .order("created_at", { ascending: true });

  const pathsUntukSigned: string[] = [];
  fotoRows?.forEach((f) => {
    pathsUntukSigned.push(f.path);
    pathsUntukSigned.push(hitungThumbPath(f.path));
  });

  const urlMap = new Map<string, string>();
  if (pathsUntukSigned.length > 0) {
    const { data: signedData } = await supabase.storage
      .from("foto-wo")
      .createSignedUrls(pathsUntukSigned, 600);

    signedData?.forEach((item) => {
      if (item.path && item.signedUrl) {
        urlMap.set(item.path, item.signedUrl);
      }
    });
  }

  const fotos: FotoItem[] = (fotoRows ?? []).map((f) => {
    const thumbPath = hitungThumbPath(f.path);
    return {
      id: f.id,
      jenis: f.jenis as FotoItem["jenis"],
      path: f.path,
      fullUrl: urlMap.get(f.path) ?? "",
      thumbUrl: urlMap.get(thumbPath) ?? urlMap.get(f.path) ?? "",
    };
  });

  // 5. Ambil item pengerjaan (billing items) untuk validasi selesai dan ringkasan
  const { data: billingItems } = await supabase
    .from("billing_items")
    .select("id, nama_item, jenis, jumlah, harga_dipakai")
    .eq("work_order_id", id)
    .order("created_at", { ascending: true });

  // 6. Ambil status bayar invoice jika ada
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, status_bayar, total, nomor")
    .eq("work_order_id", id)
    .maybeSingle();

  // 7. Ambil riwayat status WO (PRD 6.8 & 7.3)
  const { data: riwayatStatus } = await supabase
    .from("wo_status_history")
    .select("id, dari_status, ke_status, catatan, created_at, profiles(nama, role)")
    .eq("work_order_id", id)
    .order("created_at", { ascending: false });

  // 8. Ambil daftar kepala mekanik untuk modal ubah data masuk
  const { data: daftarTim } = await supabase
    .from("profiles")
    .select("id, nama")
    .eq("role", "kepala_mekanik")
    .eq("aktif", true)
    .order("nama");

  const terlambat = isWOTerlambat(wo.status, wo.estimasi_selesai);
  const bolehEditDataMasuk =
    (profil.peran === "admin" || profil.peran === "owner") && wo.status === "menunggu";

  const hasKondisiAkhir = fotos.some((f) => f.jenis === "kondisi_akhir");

  return (
    <div className="space-y-6">
      {/* Tab Navigasi WO (Rincian | Tagihan) */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <TabWorkOrder id={id} />
        </div>

        {/* Bilah Aksi Status Dinamis (PRD 7.2) */}
        <AksiStatusWO
          woId={wo.id}
          nomorWo={wo.nomor}
          status={wo.status as StatusWO}
          kepalaMekanikId={wo.kepala_mekanik_id}
          profil={profil}
          jumlahItem={billingItems?.length ?? 0}
          statusBayarInvoice={invoice?.status_bayar}
          hasKondisiAkhir={hasKondisiAkhir}
        />
      </div>

      {/* Header Info WO */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-bold tracking-tight text-text">
            {wo.nomor}
          </h1>
          <BadgeStatus status={wo.status} />
          {terlambat && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="size-3.5" />
              Terlambat
            </Badge>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          Dibuat pada: <span className="font-medium text-text">{tanggal(wo.created_at)}</span>
        </div>
      </div>

      {/* Alert Catatan Status Terakhir jika ada (tunda / QC gagal / alasan batal) */}
      {wo.catatan_status && (
        <div
          className={`flex items-start gap-3 rounded-lg border p-4 text-sm ${
            wo.status === "dibatalkan"
              ? "border-danger/40 bg-danger/10 text-danger"
              : wo.status === "tertunda"
                ? "border-warning/40 bg-warning/10 text-warning"
                : "border-primary/40 bg-primary/10 text-primary"
          }`}
        >
          <Clock className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">
              Catatan Status ({wo.status.toUpperCase()}):
            </p>
            <p className="mt-0.5 whitespace-pre-wrap">{wo.catatan_status}</p>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* BAGIAN A. DATA MASUK (PRD 6.8 Bagian A) */}
      {/* ============================================================== */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-base font-semibold text-text">
              Bagian A. Data Masuk Kendaraan
            </CardTitle>
            <CardDescription>
              Informasi pemilik, kendaraan, keluhan, dan tim penanggung jawab.
            </CardDescription>
          </div>

          {bolehEditDataMasuk && (
            <ModalEditDataMasuk
              woId={wo.id}
              odometerAwal={wo.odometer}
              keluhanAwal={wo.keluhan}
              kepalaMekanikIdAwal={wo.kepala_mekanik_id}
              daftarTim={daftarTim ?? []}
            />
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Kartu Pelanggan */}
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 font-semibold text-text">
                <User className="size-4 text-primary" />
                <span>Pelanggan ({wo.customers?.tipe ?? "Perorangan"})</span>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <p className="text-base font-medium text-text">
                  <Link
                    href={`/pelanggan/${wo.customer_id}`}
                    className="text-primary hover:underline"
                  >
                    {wo.customers?.nama}
                  </Link>
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="size-3.5" />
                    {wo.customers?.telepon}
                  </span>
                  {wo.customers?.telepon && (
                    <a
                      href={linkWhatsApp(
                        wo.customers.telepon,
                        `Halo ${wo.customers.nama}, kami dari Bengkel Cemerlang Jaya Motor mengenai kendaraan ${wo.vehicles?.plat} (${wo.nomor})...`,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded bg-emerald-600/10 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-600/20 dark:text-emerald-400"
                    >
                      <MessageCircle className="size-3" />
                      Chat WhatsApp
                    </a>
                  )}
                </div>
                {wo.customers?.email && (
                  <p className="text-xs text-muted-foreground">{wo.customers.email}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Alamat: {wo.customers?.alamat || "-"}
                </p>
              </div>
            </div>

            {/* Kartu Kendaraan */}
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 font-semibold text-text">
                <Car className="size-4 text-primary" />
                <span>Kendaraan</span>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <p className="font-mono text-lg font-bold tracking-wider text-text">
                  {wo.vehicles?.plat}
                </p>
                <p className="font-medium text-text">{wo.vehicles?.merek_model}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Tahun: {wo.vehicles?.tahun ?? "-"}</span>
                  <span>Warna: {wo.vehicles?.warna || "-"}</span>
                  <span>Transmisi: {wo.vehicles?.transmisi || "-"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Odometer, Tim, Keluhan */}
          <div className="grid gap-4 rounded-lg bg-muted/30 p-4 md:grid-cols-3">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Kilometer Odometer
              </span>
              <p className="mt-1 text-base font-semibold tabular-nums text-text">
                {wo.odometer.toLocaleString("id-ID")} km
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Tim Penanggung Jawab
              </span>
              <p className="mt-1 text-base font-semibold text-text">
                Tim {wo.profiles?.nama ?? "-"}
              </p>
            </div>

            <div className="md:col-span-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Keluhan Kendaraan
              </span>
              <p className="mt-1 text-sm whitespace-pre-wrap font-medium text-text">
                {wo.keluhan}
              </p>
            </div>
          </div>

          {/* Galeri Foto Bagian A (STNK & Kondisi Awal) */}
          <GaleriFotoWO
            woId={wo.id}
            statusWo={wo.status}
            kepalaMekanikId={wo.kepala_mekanik_id}
            fotos={fotos}
            profil={profil}
          />
        </CardContent>
      </Card>

      {/* ============================================================== */}
      {/* BAGIAN B. PENUGASAN (PRD 6.8 Bagian B) */}
      {/* ============================================================== */}
      <FormPenugasanWO
        woId={wo.id}
        statusWo={wo.status}
        kepalaMekanikId={wo.kepala_mekanik_id}
        estimasiSelesai={wo.estimasi_selesai}
        mekanikDitugaskan={mekanikDitugaskan}
        mekanikTim={mekanikTim}
        profil={profil}
      />

      {/* ============================================================== */}
      {/* BAGIAN C. PENGERJAAN (PRD 6.8 Bagian C) */}
      {/* ============================================================== */}
      <div className="space-y-6">
        {/* Form Diagnosis */}
        <FormDiagnosisWO
          woId={wo.id}
          statusWo={wo.status}
          kepalaMekanikId={wo.kepala_mekanik_id}
          diagnosisAwal={wo.diagnosis}
          profil={profil}
        />

        {/* Ringkasan Item yang Dikerjakan (Part & Jasa) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wrench className="size-4 text-primary" />
                Bagian C. Ringkasan Item Pengerjaan
              </CardTitle>
              <CardDescription>
                Daftar spare part dan jasa yang tercatat pada Work Order ini.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/work-orders/${wo.id}/tagihan`}>
                Buka Tab Tagihan
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {billingItems?.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                <p>Belum ada suku cadang atau jasa yang dicatat.</p>
                <p className="mt-1 text-xs">
                  Kepala Mekanik dapat mencatat spare part dan jasa melalui tab Tagihan saat status &quot;Dikerjakan&quot;.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-right">Harga Dipakai</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billingItems?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.nama_item}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {item.jenis}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{item.jumlah}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {rupiah(item.harga_dipakai)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {rupiah(item.jumlah * item.harga_dipakai)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ============================================================== */}
      {/* LINIMASA RIWAYAT PERUBAHAN STATUS (PRD 6.8 & 7.3) */}
      {/* ============================================================== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Linimasa Riwayat Status</CardTitle>
          <CardDescription>
            Catatan kronologis perpindahan status dan catatan alasan dari setiap tahap.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {riwayatStatus?.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Belum ada riwayat status tercatat.</p>
          ) : (
            <div className="relative border-l border-border pl-6 space-y-6">
              {riwayatStatus?.map((r) => (
                <div key={r.id} className="relative">
                  {/* Titik indikator */}
                  <div className="absolute -left-[31px] top-1 size-3 rounded-full border-2 border-background bg-primary" />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-text">
                        {r.ke_status.toUpperCase()}
                      </span>
                      {r.dari_status && (
                        <span className="text-xs text-muted-foreground">
                          (dari {r.dari_status})
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">
                        {tanggal(r.created_at)}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Oleh:{" "}
                      <span className="font-medium text-text">
                        {r.profiles?.nama || "Sistem"}
                      </span>{" "}
                      ({r.profiles?.role || "-"})
                    </p>

                    {r.catatan && (
                      <p className="rounded-md bg-muted/50 p-2 text-xs italic text-text">
                        &quot;{r.catatan}&quot;
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

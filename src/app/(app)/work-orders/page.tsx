import Link from "next/link";
import { Plus, Search, AlertCircle } from "lucide-react";
import { BadgeStatus } from "@/components/BadgeStatus";
import { Paginasi } from "@/components/Paginasi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { isStatusWO } from "@/lib/status-wo";
import { createClient } from "@/lib/supabase/server";
import { isWOTerlambat } from "@/lib/wo-aturan";

const PER_HALAMAN = 20;

const DAFTAR_STATUS: Array<{ key: string; label: string }> = [
  { key: "semua", label: "Semua" },
  { key: "menunggu", label: "Menunggu" },
  { key: "dikerjakan", label: "Dikerjakan" },
  { key: "tertunda", label: "Tertunda" },
  { key: "selesai", label: "Selesai" },
  { key: "siap_diambil", label: "Siap Diambil" },
  { key: "diambil", label: "Diambil" },
  { key: "dibatalkan", label: "Dibatalkan" },
];

export default async function HalamanWorkOrders({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    tim?: string;
    hal?: string;
  }>;
}) {
  const { q = "", status: statusParam, tim: timParam, hal } = await searchParams;
  const halaman = Math.max(1, Number(hal) || 1);
  const cari = q.replace(/[,()*%\\]/g, " ").trim();

  const profil = await ambilProfilSaya();
  const supabase = await createClient();

  // Ambil daftar kepala mekanik untuk filter tim
  const { data: daftarKepala } = await supabase
    .from("profiles")
    .select("id, nama")
    .eq("role", "kepala_mekanik")
    .eq("aktif", true)
    .order("nama");

  // Kepala Mekanik default-nya disaring ke timnya sendiri (PRD 6.6)
  const filterTim =
    timParam !== undefined
      ? timParam
      : profil.peran === "kepala_mekanik"
        ? profil.id
        : "semua";

  const filterStatus = statusParam && (statusParam === "semua" || isStatusWO(statusParam))
    ? statusParam
    : "semua";

  // Ambil hitungan status untuk tab header (sesuai filter tim saat ini bila ada)
  let kueriHitung = supabase.from("work_orders").select("status");
  if (filterTim !== "semua") {
    kueriHitung = kueriHitung.eq("kepala_mekanik_id", filterTim);
  }
  const { data: semuaStatus } = await kueriHitung;

  const hitungStatus: Record<string, number> = {
    semua: semuaStatus?.length ?? 0,
    menunggu: 0,
    dikerjakan: 0,
    tertunda: 0,
    selesai: 0,
    siap_diambil: 0,
    diambil: 0,
    dibatalkan: 0,
  };
  semuaStatus?.forEach((row) => {
    if (row.status in hitungStatus) {
      hitungStatus[row.status]++;
    }
  });

  // Query tabel work orders dengan hanya mengambil kolom yang ditampilkan (hemat egress)
  let kueri = supabase
    .from("work_orders")
    .select(
      `
      id,
      nomor,
      status,
      estimasi_selesai,
      created_at,
      kepala_mekanik_id,
      vehicles!inner(plat),
      customers!inner(nama),
      profiles!work_orders_kepala_mekanik_id_fkey(nama),
      invoices(total),
      billing_items(jumlah, harga_dipakai)
    `,
      { count: "exact" },
    );

  if (filterStatus !== "semua") {
    kueri = kueri.eq("status", filterStatus);
  }

  if (filterTim !== "semua") {
    kueri = kueri.eq("kepala_mekanik_id", filterTim);
  }

  if (cari) {
    const [{ data: cocokPlat }, { data: cocokCust }] = await Promise.all([
      supabase.from("vehicles").select("id").ilike("plat", `%${cari}%`).limit(50),
      supabase.from("customers").select("id").ilike("nama", `%${cari}%`).limit(50),
    ]);
    const vehicleIds = (cocokPlat ?? []).map((v) => v.id);
    const custIds = (cocokCust ?? []).map((c) => c.id);
    const syarat: string[] = [`nomor.ilike.%${cari}%`];
    if (vehicleIds.length) syarat.push(`vehicle_id.in.(${vehicleIds.join(",")})`);
    if (custIds.length) syarat.push(`customer_id.in.(${custIds.join(",")})`);
    kueri = kueri.or(syarat.join(","));
  }

  const { data: workOrders, count, error } = await kueri
    .order("created_at", { ascending: false })
    .range((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN - 1);

  const bolehBuatWO = profil.peran === "admin" || profil.peran === "owner";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Work Order</h1>
          <p className="text-sm text-muted-foreground">
            Kelola alur pekerjaan bengkel dari mobil datang hingga penyerahan.
          </p>
        </div>
        {bolehBuatWO && (
          <Button asChild>
            <Link href="/work-orders/baru">
              <Plus className="mr-2 size-4" />
              + Work Order
            </Link>
          </Button>
        )}
      </div>

      {/* Tab Status di atas (PRD 6.6) */}
      <div className="flex flex-wrap gap-1 border-b border-border pb-3">
        {DAFTAR_STATUS.map((tab) => {
          const aktif = filterStatus === tab.key;
          const queryParams = new URLSearchParams();
          if (q) queryParams.set("q", q);
          if (filterTim !== "semua") queryParams.set("tim", filterTim);
          if (tab.key !== "semua") queryParams.set("status", tab.key);

          return (
            <Link
              key={tab.key}
              href={`/work-orders?${queryParams.toString()}`}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                aktif
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-text"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                  aktif
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {hitungStatus[tab.key] ?? 0}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Filter Pencarian dan Pilihan Tim */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form className="flex max-w-md flex-1 gap-2" role="search">
          {filterStatus !== "semua" && <input type="hidden" name="status" value={filterStatus} />}
          {filterTim !== "semua" && <input type="hidden" name="tim" value={filterTim} />}
          <Input
            name="q"
            defaultValue={q}
            placeholder="Cari No WO, plat, atau nama pelanggan"
            aria-label="Cari work order"
          />
          <Button type="submit" variant="outline">
            <Search className="size-4" />
            Cari
          </Button>
        </form>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Penyaring Tim:</span>
          <div className="flex gap-1">
            <Link
              href={`/work-orders?${new URLSearchParams({
                ...(q && { q }),
                ...(filterStatus !== "semua" && { status: filterStatus }),
                tim: "semua",
              }).toString()}`}
            >
              <Button
                variant={filterTim === "semua" ? "default" : "outline"}
                size="sm"
              >
                Semua Tim
              </Button>
            </Link>
            {daftarKepala?.map((k) => (
              <Link
                key={k.id}
                href={`/work-orders?${new URLSearchParams({
                  ...(q && { q }),
                  ...(filterStatus !== "semua" && { status: filterStatus }),
                  tim: k.id,
                }).toString()}`}
              >
                <Button
                  variant={filterTim === k.id ? "default" : "outline"}
                  size="sm"
                >
                  Tim {k.nama}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Tabel Work Order */}
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">No WO</TableHead>
              <TableHead>Plat</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Tim</TableHead>
              <TableHead>Estimasi Selesai</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="pr-4 text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {error && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-danger">
                  Gagal memuat data Work Order. Silakan muat ulang halaman.
                </TableCell>
              </TableRow>
            )}
            {!error && workOrders?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  {cari
                    ? `Tidak ada Work Order yang cocok dengan "${cari}".`
                    : "Belum ada Work Order di kategori ini."}
                </TableCell>
              </TableRow>
            )}
            {workOrders?.map((wo) => {
              // Hitung total: dari invoice bila sudah ada, atau jumlah baris tagihan
              const invoiceTotal = wo.invoices?.total;
              const subtotalTagihan = (wo.billing_items ?? []).reduce(
                (sum, item) => sum + item.jumlah * item.harga_dipakai,
                0,
              );
              const totalNilai = invoiceTotal !== undefined ? invoiceTotal : subtotalTagihan;
              const terlambat = isWOTerlambat(wo.status, wo.estimasi_selesai);

              return (
                <TableRow key={wo.id} className="hover:bg-muted/50">
                  <TableCell className="pl-4 font-medium">
                    <Link
                      href={`/work-orders/${wo.id}`}
                      className="font-mono text-primary hover:underline"
                    >
                      {wo.nomor}
                    </Link>
                  </TableCell>
                  <TableCell className="font-semibold uppercase tracking-wider">
                    {wo.vehicles?.plat ?? "-"}
                  </TableCell>
                  <TableCell>{wo.customers?.nama ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    Tim {wo.profiles?.nama ?? "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>
                        {wo.estimasi_selesai ? tanggal(wo.estimasi_selesai) : "-"}
                      </span>
                      {terlambat && (
                        <Badge variant="destructive" className="gap-1 px-1.5 py-0 text-[10px]">
                          <AlertCircle className="size-3" />
                          Terlambat
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {rupiah(totalNilai)}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <BadgeStatus status={wo.status} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Paginasi
        totalBaris={count ?? 0}
        perHalaman={PER_HALAMAN}
        halaman={halaman}
        params={{
          ...(q && { q }),
          ...(filterStatus !== "semua" && { status: filterStatus }),
          ...(filterTim !== "semua" && { tim: filterTim }),
        }}
      />
    </div>
  );
}

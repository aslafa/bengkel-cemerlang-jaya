import Link from "next/link";
import { redirect } from "next/navigation";
import { TrendingUp, Coins, CircleDollarSign, Percent, FileSpreadsheet, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { rupiah, tanggal } from "@/lib/format";
import { ambilProfilSaya } from "@/lib/profil";
import { createClient } from "@/lib/supabase/server";
import { PenyaringPeriodeLaba } from "./PenyaringPeriodeLaba";

export const dynamic = "force-dynamic";

export default async function HalamanLaporanLaba({
  searchParams,
}: {
  searchParams: Promise<{ dari?: string; sampai?: string }>;
}) {
  const profil = await ambilProfilSaya();
  // Laporan Laba hanya boleh diakses oleh Owner sesuai PRD 2.3 & 6.12
  if (profil.peran !== "owner") {
    redirect("/dashboard");
  }

  const { dari: paramDari, sampai: paramSampai } = await searchParams;

  // Tanggal default: Bulan ini (dari tanggal 1 sampai hari ini)
  const sekarang = new Date();
  const tahunSekarang = sekarang.getFullYear();
  const bulanSekarang = String(sekarang.getMonth() + 1).padStart(2, "0");
  const tglSekarang = String(sekarang.getDate()).padStart(2, "0");

  const defaultDari = `${tahunSekarang}-${bulanSekarang}-01`;
  const defaultSampai = `${tahunSekarang}-${bulanSekarang}-${tglSekarang}`;

  const dari = paramDari || defaultDari;
  const sampai = paramSampai || defaultSampai;

  const supabase = await createClient();

  // Memanggil fungsi database PRD 9.3 laporan_laba(p_dari, p_sampai) lewat supabase.rpc()
  const { data: barisLaba, error } = await supabase.rpc("laporan_laba", {
    p_dari: dari,
    p_sampai: sampai,
  });

  const daftar = barisLaba ?? [];

  // Hitung angka ringkasan kartu KPI dari data baris WO periode ini
  const totalPendapatan = daftar.reduce((acc, r) => acc + Number(r.pendapatan), 0);
  const totalModal = daftar.reduce((acc, r) => acc + Number(r.modal), 0);
  const totalLaba = totalPendapatan - totalModal;
  const marginPersen = totalPendapatan > 0
    ? ((totalLaba / totalPendapatan) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-text">Laporan Laba</h1>
            <Badge variant="outline" className="bg-primary/10 text-primary-strong border-primary/30 text-xs py-0.5">
              Khusus Owner
            </Badge>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Laba kotor dan margin keuntungan per Work Order terbit invoice (dihitung langsung di database).
          </p>
        </div>
      </div>

      {/* Penyaring Periode */}
      <PenyaringPeriodeLaba dariAwal={dari} sampaiAwal={sampai} />

      {/* 4 Kartu KPI Ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pendapatan */}
        <Card className="rounded-xl border border-border shadow-card bg-bg-panel">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted">Total Pendapatan</span>
              <div className="size-8 rounded-lg bg-primary-soft/50 text-primary flex items-center justify-center">
                <TrendingUp className="size-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-semibold text-text">{rupiah(totalPendapatan)}</span>
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              Dari {daftar.length} invoice terbit
            </p>
          </CardContent>
        </Card>

        {/* Modal Spare Part */}
        <Card className="rounded-xl border border-border shadow-card bg-bg-panel">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted">Modal Spare Part</span>
              <div className="size-8 rounded-lg bg-warning/10 text-warning flex items-center justify-center">
                <Coins className="size-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-semibold text-text">{rupiah(totalModal)}</span>
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              Harga modal terpakai di WO
            </p>
          </CardContent>
        </Card>

        {/* Laba Kotor */}
        <Card className="rounded-xl border border-border shadow-card bg-bg-panel">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted">Laba Kotor</span>
              <div className={`size-8 rounded-lg flex items-center justify-center ${totalLaba >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                <CircleDollarSign className="size-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className={`text-2xl font-semibold ${totalLaba >= 0 ? "text-success" : "text-danger"}`}>
                {rupiah(totalLaba)}
              </span>
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              Pendapatan dikurangi modal part
            </p>
          </CardContent>
        </Card>

        {/* Margin Keuntungan */}
        <Card className="rounded-xl border border-border shadow-card bg-bg-panel">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted">Margin Keuntungan</span>
              <div className="size-8 rounded-lg bg-primary/10 text-primary-strong flex items-center justify-center">
                <Percent className="size-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-semibold text-text">{marginPersen}%</span>
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              Rasio laba kotor terhadap pendapatan
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabel Rincian per Work Order */}
      <Card className="rounded-xl border border-border shadow-card overflow-hidden bg-bg-panel">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="size-4 text-primary" />
            <h2 className="text-base font-semibold text-text">Rincian Laba per Work Order</h2>
          </div>
          <span className="text-xs text-text-muted">
            Periode: <strong className="text-text">{tanggal(dari)}</strong> s/d <strong className="text-text">{tanggal(sampai)}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-bg-app hover:bg-bg-app text-xs font-semibold text-text-muted">
                <TableHead className="w-36">No. WO</TableHead>
                <TableHead className="w-36">No. Invoice</TableHead>
                <TableHead className="w-28">Tanggal</TableHead>
                <TableHead className="w-28">Plat</TableHead>
                <TableHead className="text-right">Pendapatan</TableHead>
                <TableHead className="text-right">Modal Part</TableHead>
                <TableHead className="text-right">Laba Kotor</TableHead>
                <TableHead className="text-right w-24">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs divide-y divide-border/60">
              {daftar.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-text-muted">
                    <FileSpreadsheet className="size-8 text-text-muted/40 mx-auto mb-2" />
                    <p className="font-medium text-text">Tidak ada data transaksi invoice pada periode ini</p>
                    <p className="text-xs text-text-muted mt-1">
                      Silakan pilih rentang tanggal lain atau klik tombol &ldquo;30 Hari Terakhir&rdquo; di atas.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                daftar.map((row) => {
                  const laba = Number(row.laba);
                  const isMinus = laba < 0;

                  return (
                    <TableRow key={row.work_order_id} className="hover:bg-bg-app/50 transition-colors">
                      <TableCell className="font-semibold text-primary">
                        <Link
                          href={`/work-orders/${row.work_order_id}`}
                          className="inline-flex items-center gap-1 hover:underline hover:text-primary-strong"
                        >
                          {row.nomor_wo}
                          <ArrowUpRight className="size-3 text-text-muted" />
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-text-body">{row.nomor_invoice}</TableCell>
                      <TableCell className="text-text-muted whitespace-nowrap">{tanggal(row.tanggal)}</TableCell>
                      <TableCell className="font-medium text-text">{row.plat}</TableCell>
                      <TableCell className="text-right font-medium text-text">
                        {rupiah(Number(row.pendapatan))}
                      </TableCell>
                      <TableCell className="text-right text-text-body">
                        {rupiah(Number(row.modal))}
                      </TableCell>
                      <TableCell className="text-right">
                        {isMinus ? (
                          <span className="text-danger font-semibold bg-danger/10 px-2 py-0.5 rounded">
                            {rupiah(laba)}
                          </span>
                        ) : (
                          <span className="text-success font-semibold">
                            {rupiah(laba)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={
                            Number(row.margin_persen) >= 20
                              ? "bg-success/10 text-success border-success/30 font-semibold text-[11px]"
                              : Number(row.margin_persen) > 0
                                ? "bg-primary/10 text-primary-strong border-primary/30 font-semibold text-[11px]"
                                : "bg-danger/10 text-danger border-danger/30 font-semibold text-[11px]"
                          }
                        >
                          {row.margin_persen}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

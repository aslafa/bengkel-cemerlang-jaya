"use client";

import {
  DollarSign,
  TrendingUp,
  Percent,
  Clock,
  AlertTriangle,
  Receipt,
  FileSpreadsheet,
  History,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { rupiah } from "@/lib/format";
import { KartuKpi } from "./KartuKpi";
import { hitungPerubahan } from "./helper";
import { GrafikAreaPendapatan } from "./GrafikAreaPendapatan";
import { GrafikKomposisiPendapatanDonut } from "./GrafikKomposisiPendapatanDonut";
import { GrafikWoStatusHorizontalBar } from "./GrafikWoStatusHorizontalBar";
import { GrafikBebanMekanik } from "./GrafikBebanMekanik";
import { GrafikTopItem } from "./GrafikTopItem";
import { PerhatianOwner } from "./PerhatianOwner";
import { LinimasaAktivitas } from "./LinimasaAktivitas";

interface DashboardOwnerProps {
  ringkasan: {
    pendapatan: number;
    pendapatan_sebelumnya: number;
    laba_kotor: number;
    laba_kotor_sebelumnya: number;
    margin_persen: number;
    wo_aktif: number;
    wo_terlambat: number;
    piutang: number;
  };
  labaHarian: {
    tanggal: string;
    pendapatan: number;
    modal: number;
    laba: number;
  }[];
  pendapatanHarian: {
    tanggal: string;
    pendapatan_jasa: number;
    pendapatan_part: number;
  }[];
  woPerStatus: {
    status: string;
    jumlah: number;
  }[];
  bebanMekanik: {
    mekanik: string;
    tim: string;
    wo_aktif: number;
    wo_selesai: number;
  }[];
  topPart: {
    nama: string;
    jumlah: number;
    pendapatan: number;
  }[];
  topJasa: {
    nama: string;
    jumlah: number;
    pendapatan: number;
  }[];
  perhatianItems: {
    id: string;
    tipe: "terlambat" | "stok" | "bawah_modal";
    judul: string;
    keterangan: string;
    tautan: string;
  }[];
  auditLogs: {
    id: number;
    waktu: string;
    aksi: string;
    tabel: string;
    pelaku_peran: string | null;
    alasan: string | null;
    data_id: string | null;
  }[];
  labelPeriode: string;
}

export function DashboardOwner({
  ringkasan,
  labaHarian,
  pendapatanHarian,
  woPerStatus,
  bebanMekanik,
  topPart,
  topJasa,
  perhatianItems,
  auditLogs,
  labelPeriode,
}: DashboardOwnerProps) {
  const ubahPendapatan = hitungPerubahan(
    ringkasan.pendapatan,
    ringkasan.pendapatan_sebelumnya
  );
  const ubahLaba = hitungPerubahan(
    ringkasan.laba_kotor,
    ringkasan.laba_kotor_sebelumnya
  );

  // Sparkline data 7 hari terakhir
  const sparklinePendapatan = labaHarian.slice(-7).map((d) => d.pendapatan);
  const sparklineLaba = labaHarian.slice(-7).map((d) => d.laba);

  // Hitung total Jasa vs Part untuk Komposisi Donut (PRD 12.2)
  const totalJasa = pendapatanHarian.reduce((acc, d) => acc + Number(d.pendapatan_jasa || 0), 0);
  const totalPart = pendapatanHarian.reduce((acc, d) => acc + Number(d.pendapatan_part || 0), 0);

  return (
    <div className="space-y-6">
      {/* 6 Kartu KPI Owner dengan Sparkline 7 Hari (PRD 12.1 & 12.2) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4">
        {/* 1. Pendapatan */}
        <KartuKpi
          judul="Pendapatan"
          nilai={rupiah(ringkasan.pendapatan)}
          ikon={DollarSign}
          warnaIkon="text-primary"
          latarIkon="bg-primary-soft"
          perubahan={ubahPendapatan}
          sparklineData={sparklinePendapatan}
          tautan="/laporan-laba"
          keteranganTautan="Buka Laporan Laba"
        />

        {/* 2. Laba Kotor */}
        <KartuKpi
          judul="Laba Kotor"
          nilai={rupiah(ringkasan.laba_kotor)}
          ikon={TrendingUp}
          warnaIkon="text-success"
          latarIkon="bg-green-50"
          perubahan={ubahLaba}
          sparklineData={sparklineLaba}
          tautan="/laporan-laba"
          keteranganTautan="Buka Laporan Laba"
        />

        {/* 3. Margin % */}
        <KartuKpi
          judul="Margin Rata-rata"
          nilai={`${ringkasan.margin_persen}%`}
          ikon={Percent}
          warnaIkon="text-[#7E57C2]"
          latarIkon="bg-purple-50"
          subtext={`Laba / Pendapatan`}
          tautan="/laporan-laba"
        />

        {/* 4. WO Aktif */}
        <KartuKpi
          judul="WO Aktif"
          nilai={ringkasan.wo_aktif}
          ikon={Clock}
          warnaIkon="text-primary-strong"
          latarIkon="bg-primary-soft"
          subtext="Sedang berjalan"
          tautan="/work-orders"
          keteranganTautan="Buka Work Order"
        />

        {/* 5. WO Terlambat */}
        <KartuKpi
          judul="WO Terlambat"
          nilai={ringkasan.wo_terlambat}
          ikon={AlertTriangle}
          warnaIkon={ringkasan.wo_terlambat > 0 ? "text-danger" : "text-success"}
          latarIkon={ringkasan.wo_terlambat > 0 ? "bg-red-50" : "bg-green-50"}
          subtext={
            ringkasan.wo_terlambat > 0
              ? "Perlu perhatian segera"
              : "Semua tepat waktu"
          }
          tautan="/work-orders"
        />

        {/* 6. Piutang */}
        <KartuKpi
          judul="Piutang"
          nilai={rupiah(ringkasan.piutang)}
          ikon={Receipt}
          warnaIkon="text-warning"
          latarIkon="bg-amber-50"
          subtext="Tagihan belum lunas"
          tautan="/work-orders?status=siap_diambil"
        />
      </div>

      {/* Baris 1: Pendapatan & Laba Harian (Area + Garis) + Komposisi Pendapatan (Donut) (PRD 12.2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GrafikAreaPendapatan
          data={labaHarian}
          tampilkanLaba={true}
          judul="Pendapatan dan Laba Kotor"
          deskripsi={`Tren harian pendapatan dan garis laba (${labelPeriode})`}
          tautanSumber="/laporan-laba"
        />

        <GrafikKomposisiPendapatanDonut
          totalJasa={totalJasa}
          totalPart={totalPart}
          judul="Komposisi Pendapatan"
          deskripsi="Porsi pemasukan dari Jasa Servis vs Suku Cadang"
        />
      </div>

      {/* Baris 2: WO per Status (Horizontal Bar) + Beban Tim Mekanik (Bar Bertumpuk) (PRD 12.2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GrafikWoStatusHorizontalBar
          data={woPerStatus}
          judul="Work Order per Status"
          deskripsi="Jumlah WO di setiap status dengan warna status PRD 7.1"
        />

        <GrafikBebanMekanik
          data={bebanMekanik}
          judul="Beban Tim Mekanik"
          deskripsi={`WO aktif dan WO selesai periode ${labelPeriode} per mekanik`}
        />
      </div>

      {/* Baris 3: Top 5 Spare Part & Jasa (PRD 12.2) */}
      <div className="grid grid-cols-1 gap-6">
        <GrafikTopItem
          topPart={topPart}
          topJasa={topJasa}
          judul="Top 5 Spare Part dan Jasa"
          deskripsi={`Item terlaris dan kontribusi pendapatannya (${labelPeriode})`}
        />
      </div>

      {/* Baris 4: Perhatian (Daftar badge) + Aktivitas Terbaru (Linimasa) (PRD 12.2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PerhatianOwner items={perhatianItems} />
        <LinimasaAktivitas logs={auditLogs} />
      </div>

      {/* Baris Pintasan Cepat Owner */}
      <div className="bg-bg-panel border border-border rounded-xl p-4 shadow-card flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" />
          <span className="text-xs font-semibold text-text">Pintasan Menu Owner:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5 hover:border-primary hover:text-primary">
            <Link href="/laporan-laba">
              <FileSpreadsheet className="size-3.5 text-primary" />
              Laporan Laba
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5 hover:border-primary hover:text-primary">
            <Link href="/audit-log">
              <History className="size-3.5 text-primary" />
              Audit Log
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

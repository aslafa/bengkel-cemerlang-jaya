"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Car,
  CheckCircle,
  Receipt,
  DollarSign,
  Plus,
  Search,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rupiah } from "@/lib/format";
import { KartuKpi } from "./KartuKpi";
import { hitungPerubahan } from "./helper";
import { GrafikAreaPendapatan } from "./GrafikAreaPendapatan";
import { GrafikWoStatusDonut } from "./GrafikWoStatusDonut";
import { TabelTindakanAdmin, type ItemPerluDitagih, type ItemSiapDiserahkan } from "./TabelTindakanAdmin";
import { DaftarStokMenipis, type ItemStokMenipis } from "./DaftarStokMenipis";

interface DashboardAdminProps {
  ringkasan: {
    mobil_masuk_hari_ini: number;
    siap_diambil: number;
    perlu_ditagih: number;
    pendapatan_hari_ini: number;
    pendapatan: number;
    pendapatan_sebelumnya: number;
  };
  pendapatanHarian: {
    tanggal: string;
    pendapatan_jasa: number;
    pendapatan_part: number;
  }[];
  woPerStatus: {
    status: string;
    jumlah: number;
  }[];
  perluDitagih: ItemPerluDitagih[];
  siapDiserahkan: ItemSiapDiserahkan[];
  stokMenipis: ItemStokMenipis[];
  labelPeriode: string;
}

export function DashboardAdmin({
  ringkasan,
  pendapatanHarian,
  woPerStatus,
  perluDitagih,
  siapDiserahkan,
  stokMenipis,
  labelPeriode,
}: DashboardAdminProps) {
  const router = useRouter();
  const [cariPlat, setCariPlat] = useState("");

  const ubahPendapatan = hitungPerubahan(
    ringkasan.pendapatan,
    ringkasan.pendapatan_sebelumnya
  );

  const sparklinePendapatan = pendapatanHarian
    .slice(-7)
    .map((d) => Number(d.pendapatan_jasa || 0) + Number(d.pendapatan_part || 0));

  const handleCari = (e: React.FormEvent) => {
    e.preventDefault();
    if (cariPlat.trim()) {
      router.push(`/work-orders?q=${encodeURIComponent(cariPlat.trim())}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Baris Atas: Aksi Cepat Admin (PRD 12.3) */}
      <div className="bg-bg-panel border border-border rounded-xl p-4 shadow-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild className="bg-primary text-white hover:bg-primary-strong h-9 text-xs gap-1.5 shadow-sm">
            <Link href="/work-orders/baru">
              <Plus className="size-4" />
              + Work Order
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-9 text-xs gap-1.5 hover:border-primary hover:text-primary">
            <Link href="/pelanggan">
              <Users className="size-3.5 text-primary" />
              Pelanggan
            </Link>
          </Button>
        </div>

        {/* Kolom Cari Plat Nomor (PRD 12.3) */}
        <form onSubmit={handleCari} className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-text-muted" />
            <Input
              type="text"
              placeholder="Ketik plat nomor mobil..."
              value={cariPlat}
              onChange={(e) => setCariPlat(e.target.value)}
              className="pl-8 h-9 text-xs uppercase bg-white font-medium"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm" className="h-9 text-xs">
            Cari
          </Button>
        </form>
      </div>

      {/* 4 Kartu KPI Admin (PRD 12.3) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Mobil Masuk Hari Ini */}
        <KartuKpi
          judul="Mobil Masuk Hari Ini"
          nilai={ringkasan.mobil_masuk_hari_ini}
          ikon={Car}
          warnaIkon="text-primary"
          latarIkon="bg-primary-soft"
          subtext="Unit baru masuk hari ini"
          tautan="/work-orders"
        />

        {/* 2. Siap Diambil */}
        <KartuKpi
          judul="Siap Diambil"
          nilai={ringkasan.siap_diambil}
          ikon={CheckCircle}
          warnaIkon="text-success"
          latarIkon="bg-green-50"
          subtext="Lulus QC, siap penyerahan"
          tautan="/work-orders?status=siap_diambil"
          keteranganTautan="Buka WO Siap Diambil"
        />

        {/* 3. Perlu Ditagih */}
        <KartuKpi
          judul="Perlu Ditagih"
          nilai={ringkasan.perlu_ditagih}
          ikon={Receipt}
          warnaIkon="text-warning"
          latarIkon="bg-amber-50"
          subtext="Belum terbit invoice / lunas"
          tautan="/work-orders?status=siap_diambil"
        />

        {/* 4. Pendapatan Hari Ini */}
        <KartuKpi
          judul="Pendapatan Hari Ini"
          nilai={rupiah(ringkasan.pendapatan_hari_ini)}
          ikon={DollarSign}
          warnaIkon="text-primary-strong"
          latarIkon="bg-primary-soft"
          perubahan={ubahPendapatan}
          sparklineData={sparklinePendapatan}
          subtext={`Periode: ${rupiah(ringkasan.pendapatan)}`}
          tautan="/work-orders"
        />
      </div>

      {/* Grafik Pendapatan Harian + Donut Status WO (PRD 12.3) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GrafikAreaPendapatan
          data={pendapatanHarian}
          tampilkanLaba={false}
          judul="Pendapatan Harian"
          deskripsi={`Pendapatan jasa dan spare part periode ${labelPeriode}`}
          tautanSumber="/work-orders"
        />

        <GrafikWoStatusDonut
          data={woPerStatus}
          judul="WO per Status"
          deskripsi="Komposisi status seluruh kendaraan di bengkel"
        />
      </div>

      {/* Tabel Ringkas: Perlu Ditagih & Siap Diserahkan (PRD 12.3) */}
      <TabelTindakanAdmin
        perluDitagih={perluDitagih}
        siapDiserahkan={siapDiserahkan}
      />

      {/* Stok Menipis dengan Progress Bar (PRD 12.3) */}
      <div className="grid grid-cols-1 gap-6">
        <DaftarStokMenipis items={stokMenipis} />
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { KartuKpi } from "./KartuKpi";
import { hitungPerubahan } from "./helper";
import { GrafikBebanMekanik } from "./GrafikBebanMekanik";
import { GrafikWoSelesaiHarian } from "./GrafikWoSelesaiHarian";
import { AntreanTimMekanik, type ItemAntreanWo } from "./AntreanTimMekanik";

interface DashboardMekanikProps {
  ringkasan: {
    menunggu_ditugaskan: number;
    sedang_dikerjakan: number;
    menunggu_qc: number;
    terlambat: number;
    selesai_periode?: number;
    selesai_sebelumnya?: number;
  };
  bebanMekanik: {
    mekanik: string;
    tim: string;
    wo_aktif: number;
    wo_selesai: number;
  }[];
  woSelesaiHarian: {
    tanggal: string;
    jumlah: number;
  }[];
  antreanTim: ItemAntreanWo[];
  menungguQc: ItemAntreanWo[];
  labelPeriode: string;
}

export function DashboardMekanik({
  ringkasan,
  bebanMekanik,
  woSelesaiHarian,
  antreanTim,
  menungguQc,
  labelPeriode,
}: DashboardMekanikProps) {
  const ubahSelesai =
    ringkasan.selesai_periode !== undefined && ringkasan.selesai_sebelumnya !== undefined
      ? hitungPerubahan(ringkasan.selesai_periode, ringkasan.selesai_sebelumnya)
      : undefined;

  const sparklineSelesai = woSelesaiHarian.slice(-7).map((d) => d.jumlah);

  return (
    <div className="space-y-6">
      {/* 4 Kartu KPI Kepala Mekanik (PRD 12.4) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Menunggu Ditugaskan */}
        <KartuKpi
          judul="Menunggu Ditugaskan"
          nilai={ringkasan.menunggu_ditugaskan}
          ikon={Clock}
          warnaIkon="text-text-muted"
          latarIkon="bg-muted"
          subtext="Perlu penunjukan mekanik"
          tautan="/work-orders?status=menunggu"
          keteranganTautan="Tugaskan mekanik"
        />

        {/* 2. Sedang Dikerjakan */}
        <KartuKpi
          judul="Sedang Dikerjakan"
          nilai={ringkasan.sedang_dikerjakan}
          ikon={Wrench}
          warnaIkon="text-primary"
          latarIkon="bg-primary-soft"
          subtext="Unit aktif di area pengerjaan"
          tautan="/work-orders?status=dikerjakan"
        />

        {/* 3. Menunggu QC */}
        <KartuKpi
          judul="Menunggu QC"
          nilai={ringkasan.menunggu_qc}
          ikon={CheckCircle2}
          warnaIkon="text-[#7E57C2]"
          latarIkon="bg-purple-50"
          subtext="Selesai, menunggu pemeriksaan"
          tautan="/work-orders?status=selesai"
          keteranganTautan="Lakukan QC"
        />

        {/* 4. Terlambat */}
        <KartuKpi
          judul="Terlambat"
          nilai={ringkasan.terlambat}
          ikon={AlertTriangle}
          warnaIkon={ringkasan.terlambat > 0 ? "text-danger" : "text-success"}
          latarIkon={ringkasan.terlambat > 0 ? "bg-red-50" : "bg-green-50"}
          perubahan={ubahSelesai}
          sparklineData={sparklineSelesai}
          subtext={
            ringkasan.terlambat > 0
              ? "Melewati estimasi selesai"
              : "Semua tepat waktu"
          }
          tautan="/work-orders?status=dikerjakan"
        />
      </div>

      {/* Baris Grafik: Beban Mekanik Tim + WO Selesai per Hari (PRD 12.4) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GrafikBebanMekanik
          data={bebanMekanik}
          judul="Beban Mekanik"
          deskripsi={`WO aktif vs selesai per mekanik di tim Anda (${labelPeriode})`}
        />

        <GrafikWoSelesaiHarian
          data={woSelesaiHarian}
          judul="WO Selesai per Hari"
          deskripsi={`Jumlah unit tim yang mencapai status selesai per hari (${labelPeriode})`}
        />
      </div>

      {/* QC Hari Ini & Antrean Tim (PRD 12.4) */}
      <AntreanTimMekanik
        antrean={antreanTim}
        menungguQc={menungguQc}
      />
    </div>
  );
}

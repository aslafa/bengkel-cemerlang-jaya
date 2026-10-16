"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Calendar, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PeriodeDashboard } from "./helper";

interface PenyaringPeriodeDashboardProps {
  periodeAktif: PeriodeDashboard;
  dariAwal: string;
  sampaiAwal: string;
}

export function PenyaringPeriodeDashboard({
  periodeAktif,
  dariAwal,
  sampaiAwal,
}: PenyaringPeriodeDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [tampilkanKustom, setTampilkanKustom] = useState(periodeAktif === "kustom");
  const [dari, setDari] = useState(dariAwal);
  const [sampai, setSampai] = useState(sampaiAwal);

  const gantiPeriode = (p: PeriodeDashboard) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("periode", p);
    sp.delete("dari");
    sp.delete("sampai");
    startTransition(() => {
      router.push(`?${sp.toString()}`);
    });
  };

  const terapkanKustom = (e: React.FormEvent) => {
    e.preventDefault();
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("periode", "kustom");
    sp.set("dari", dari);
    sp.set("sampai", sampai);
    startTransition(() => {
      router.push(`?${sp.toString()}`);
    });
  };

  const daftarPilihan: { id: PeriodeDashboard; label: string }[] = [
    { id: "hari_ini", label: "Hari ini" },
    { id: "7_hari", label: "7 hari" },
    { id: "30_hari", label: "30 hari" },
    { id: "bulan_ini", label: "Bulan ini" },
  ];

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-bg-panel p-3 sm:p-4 rounded-xl border border-border shadow-card">
      {/* Preset Tombol Cepat */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-text-muted flex items-center gap-1.5 mr-1">
          <Calendar className="size-4 text-primary" />
          Periode:
        </span>

        {daftarPilihan.map((item) => {
          const aktif = periodeAktif === item.id;
          return (
            <Button
              key={item.id}
              type="button"
              variant={aktif ? "default" : "outline"}
              size="sm"
              disabled={isPending}
              onClick={() => {
                setTampilkanKustom(false);
                gantiPeriode(item.id);
              }}
              className={`h-8 text-xs font-medium transition-colors ${
                aktif
                  ? "bg-primary text-white hover:bg-primary-strong"
                  : "bg-white text-text-body hover:border-primary hover:text-primary"
              }`}
            >
              {item.label}
            </Button>
          );
        })}

        <Button
          type="button"
          variant={periodeAktif === "kustom" ? "default" : "outline"}
          size="sm"
          disabled={isPending}
          onClick={() => setTampilkanKustom((prev) => !prev)}
          className={`h-8 text-xs font-medium ${
            periodeAktif === "kustom"
              ? "bg-primary text-white hover:bg-primary-strong"
              : "bg-white text-text-body hover:border-primary hover:text-primary"
          }`}
        >
          Rentang Khusus
        </Button>

        {isPending && (
          <span className="inline-flex items-center text-xs text-text-muted gap-1 ml-2">
            <Loader2 className="size-3.5 animate-spin text-primary" />
            Memuat...
          </span>
        )}
      </div>

      {/* Form Tanggal Kustom (tampil bila dipilih atau tombol rentang khusus ditekan) */}
      {tampilkanKustom && (
        <form onSubmit={terapkanKustom} className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
          <div className="flex items-center gap-1.5">
            <Input
              type="date"
              value={dari}
              onChange={(e) => setDari(e.target.value)}
              className="h-8 text-xs w-36 bg-white"
              required
            />
            <span className="text-xs text-text-muted font-medium">s/d</span>
            <Input
              type="date"
              value={sampai}
              onChange={(e) => setSampai(e.target.value)}
              className="h-8 text-xs w-36 bg-white"
              required
            />
          </div>
          <Button type="submit" size="sm" disabled={isPending} className="h-8 text-xs gap-1.5 bg-primary text-white hover:bg-primary-strong">
            <Filter className="size-3" />
            Terapkan
          </Button>
        </form>
      )}
    </div>
  );
}

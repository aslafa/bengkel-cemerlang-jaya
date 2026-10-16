"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export interface PerubahanKpi {
  persen: number;
  arah: "naik" | "turun" | "sama";
  teks?: string;
  kebalikanWarna?: boolean;
}

interface KartuKpiProps {
  judul: string;
  nilai: string | number;
  ikon: React.ComponentType<{ className?: string }>;
  warnaIkon?: string;
  latarIkon?: string;
  perubahan?: PerubahanKpi;
  sparklineData?: number[];
  subtext?: string;
  tautan?: string;
  keteranganTautan?: string;
}

export function KartuKpi({
  judul,
  nilai,
  ikon: Ikon,
  warnaIkon = "text-primary",
  latarIkon = "bg-primary-soft",
  perubahan,
  sparklineData,
  subtext,
  tautan,
  keteranganTautan = "Buka data sumber",
}: KartuKpiProps) {
  // Buat SVG Sparkline mini 7 hari jika ada data
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null;
    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData);
    const range = max - min === 0 ? 1 : max - min;
    const width = 52;
    const height = 20;

    const points = sparklineData
      .map((val, idx) => {
        const x = (idx / (sparklineData.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 6) - 3;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    const strokeColor =
      perubahan?.arah === "turun" && !perubahan.kebalikanWarna
        ? "#E53935"
        : "#2E7D32";

    return (
      <svg
        width={width}
        height={height}
        className="overflow-visible shrink-0 opacity-80"
        aria-hidden="true"
      >
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    );
  };

  const konten = (
    <Card className="group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/40 bg-bg-panel border-border shadow-card cursor-pointer h-full">
      <CardContent className="p-4 sm:p-4.5 flex flex-col justify-between h-full">
        <div>
          {/* Baris Atas: Judul dan Ikon */}
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-xs font-medium text-text-muted truncate"
              title={judul}
            >
              {judul}
            </span>
            <div
              className={`p-2 rounded-lg ${latarIkon} transition-transform group-hover:scale-105 shrink-0 flex items-center justify-center`}
            >
              <Ikon className={`size-4 ${warnaIkon}`} />
            </div>
          </div>

          {/* Baris Tengah: Nilai Utama (Lebar Penuh agar tidak terpotong) */}
          <div className="mt-2">
            <div
              className="text-xl sm:text-[22px] xl:text-2xl font-semibold text-text tabular-nums tracking-tight truncate leading-tight"
              title={String(nilai)}
            >
              {nilai}
            </div>
          </div>
        </div>

        {/* Baris Bawah: Perbandingan periode & sparkline 7 hari (PRD 12.1) */}
        <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between gap-2 text-xs">
          <div className="min-w-0 flex-1">
            {perubahan ? (
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-tight">
                {perubahan.arah === "naik" && (
                  <span
                    className={
                      perubahan.kebalikanWarna
                        ? "text-danger font-semibold"
                        : "text-success font-semibold"
                    }
                  >
                    ▲ {perubahan.persen}%
                  </span>
                )}
                {perubahan.arah === "turun" && (
                  <span
                    className={
                      perubahan.kebalikanWarna
                        ? "text-success font-semibold"
                        : "text-danger font-semibold"
                    }
                  >
                    ▼ {perubahan.persen}%
                  </span>
                )}
                {perubahan.arah === "sama" && (
                  <span className="text-text-muted font-medium">0%</span>
                )}
                <span className="text-text-muted text-[10px] whitespace-nowrap">
                  {perubahan.teks || "vs periode lalu"}
                </span>
              </div>
            ) : subtext ? (
              <span
                className="text-text-muted text-[11px] truncate block"
                title={subtext}
              >
                {subtext}
              </span>
            ) : (
              <span className="text-text-muted text-[11px]">—</span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {renderSparkline()}
            {tautan && (
              <span
                title={keteranganTautan}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-primary flex items-center text-[11px] font-medium"
              >
                <ArrowUpRight className="size-3.5" />
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (tautan) {
    return <Link href={tautan}>{konten}</Link>;
  }

  return konten;
}

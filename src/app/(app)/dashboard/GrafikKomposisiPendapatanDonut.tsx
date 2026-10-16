"use client";

import { useRouter } from "next/navigation";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowUpRight, DollarSign, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { rupiah } from "@/lib/format";

interface GrafikKomposisiPendapatanDonutProps {
  totalJasa: number;
  totalPart: number;
  judul?: string;
  deskripsi?: string;
}

export function GrafikKomposisiPendapatanDonut({
  totalJasa,
  totalPart,
  judul = "Komposisi Pendapatan",
  deskripsi = "Porsi pendapatan dari Jasa vs Spare Part",
}: GrafikKomposisiPendapatanDonutProps) {
  const router = useRouter();
  const total = totalJasa + totalPart;

  const data = [
    { nama: "Jasa Servis", nilai: totalJasa, warna: "#2196F3" }, // Biru
    { nama: "Spare Part", nilai: totalPart, warna: "#4CAF50" },  // Hijau
  ].filter((d) => d.nilai > 0);

  return (
    <Card className="bg-bg-panel border-border shadow-card flex flex-col justify-between">
      <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base font-semibold text-text flex items-center gap-2">
            <DollarSign className="size-4 text-primary" />
            {judul}
          </CardTitle>
          <CardDescription className="text-xs text-text-muted mt-0.5">
            {deskripsi}
          </CardDescription>
        </div>

        <button
          type="button"
          onClick={() => router.push("/laporan-laba")}
          className="text-xs text-primary hover:text-primary-strong flex items-center gap-1 font-medium hover:underline cursor-pointer transition-colors"
        >
          Laporan Laba <ArrowUpRight className="size-3.5" />
        </button>
      </CardHeader>

      <CardContent className="pt-4 flex-1">
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-text-muted">
            <div className="p-3 bg-muted rounded-full mb-2">
              <Inbox className="size-6 text-text-muted" />
            </div>
            <p className="text-sm font-medium text-text-body">Belum ada pendapatan</p>
            <p className="text-xs text-text-muted mt-0.5">
              Tidak ada data pembayaran invoice pada periode ini.
            </p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 h-full min-h-[260px]">
            {/* Donut Chart */}
            <div className="relative w-full sm:w-1/2 h-56 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const entry = payload[0].payload as { nama: string; nilai: number; warna: string };
                      const persen = ((entry.nilai / total) * 100).toFixed(1);
                      return (
                        <div className="bg-bg-panel border border-border shadow-md rounded-lg p-2.5 text-xs">
                          <div className="font-semibold text-text flex items-center gap-1.5 mb-1">
                            <span
                              className="size-2.5 rounded-full"
                              style={{ backgroundColor: entry.warna }}
                            />
                            {entry.nama}
                          </div>
                          <div className="flex justify-between gap-4 text-text-body">
                            <span>Nominal:</span>
                            <span className="font-semibold tabular-nums">{rupiah(entry.nilai)}</span>
                          </div>
                          <div className="flex justify-between gap-4 text-text-muted">
                            <span>Porsi:</span>
                            <span className="tabular-nums">{persen}%</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Pie
                    data={data}
                    dataKey="nilai"
                    nameKey="nama"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    cursor="pointer"
                    onClick={() => router.push("/laporan-laba")}
                  >
                    {data.map((entry) => (
                      <Cell
                        key={`cell-${entry.nama}`}
                        fill={entry.warna}
                        className="transition-opacity hover:opacity-85"
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Total di Tengah Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Total
                </span>
                <span className="text-sm font-semibold text-text tabular-nums max-w-[120px] truncate">
                  {rupiah(total)}
                </span>
              </div>
            </div>

            {/* Legenda Komposisi */}
            <div className="w-full sm:w-1/2 flex flex-col gap-3 pr-2">
              <div className="p-3 rounded-lg border border-border bg-muted/40 space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="flex items-center gap-2 text-text">
                    <span className="size-2.5 rounded-full bg-[#2196F3]" />
                    Jasa Servis
                  </span>
                  <span className="text-text-muted">
                    {total > 0 ? ((totalJasa / total) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <p className="text-base font-semibold text-text tabular-nums">
                  {rupiah(totalJasa)}
                </p>
              </div>

              <div className="p-3 rounded-lg border border-border bg-muted/40 space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="flex items-center gap-2 text-text">
                    <span className="size-2.5 rounded-full bg-[#4CAF50]" />
                    Spare Part
                  </span>
                  <span className="text-text-muted">
                    {total > 0 ? ((totalPart / total) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <p className="text-base font-semibold text-text tabular-nums">
                  {rupiah(totalPart)}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

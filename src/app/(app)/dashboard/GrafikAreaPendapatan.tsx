"use client";

import { useRouter } from "next/navigation";
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { ArrowUpRight, Inbox, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { rupiah, rupiahRingkas } from "@/lib/format";
import { tanggalPendek } from "./helper";

interface DataPendapatanItem {
  tanggal: string;
  pendapatan_jasa?: number;
  pendapatan_part?: number;
  pendapatan?: number;
  modal?: number;
  laba?: number;
}

interface GrafikAreaPendapatanProps {
  data: DataPendapatanItem[];
  tampilkanLaba?: boolean;
  judul?: string;
  deskripsi?: string;
  tautanSumber?: string;
}

export function GrafikAreaPendapatan({
  data,
  tampilkanLaba = false,
  judul = "Tren Pendapatan Harian",
  deskripsi = "Akumulasi pendapatan jasa dan suku cadang harian",
  tautanSumber = "/laporan-laba",
}: GrafikAreaPendapatanProps) {
  const router = useRouter();

  // Konfigurasi Chart shadcn/ui
  const chartConfig = {
    pendapatan_jasa: {
      label: "Jasa",
      color: "#2196F3", // Biru Primary
    },
    pendapatan_part: {
      label: "Spare Part",
      color: "#4CAF50", // Hijau
    },
    pendapatan: {
      label: "Total Pendapatan",
      color: "#2196F3",
    },
    laba: {
      label: "Laba Kotor",
      color: "#F59E0B", // Kuning / Amber
    },
  } satisfies ChartConfig;

  // Cek apakah data kosong / semua nol
  const adaData = data.some(
    (d) =>
      Number(d.pendapatan_jasa ?? 0) > 0 ||
      Number(d.pendapatan_part ?? 0) > 0 ||
      Number(d.pendapatan ?? 0) > 0 ||
      Number(d.laba ?? 0) > 0
  );

  return (
    <Card className="bg-bg-panel border-border shadow-card flex flex-col justify-between">
      <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base font-semibold text-text flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" />
            {judul}
          </CardTitle>
          <CardDescription className="text-xs text-text-muted mt-0.5">
            {deskripsi}
          </CardDescription>
        </div>

        {tautanSumber && (
          <button
            type="button"
            onClick={() => router.push(tautanSumber)}
            className="text-xs text-primary hover:text-primary-strong flex items-center gap-1 font-medium hover:underline cursor-pointer transition-colors"
          >
            Data sumber <ArrowUpRight className="size-3.5" />
          </button>
        )}
      </CardHeader>

      <CardContent className="pt-4 flex-1">
        {!adaData ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-text-muted">
            <div className="p-3 bg-muted rounded-full mb-2">
              <Inbox className="size-6 text-text-muted" />
            </div>
            <p className="text-sm font-medium text-text-body">Belum ada transaksi pendapatan</p>
            <p className="text-xs text-text-muted mt-0.5">
              Tidak ada data pembayaran atau invoice di periode yang dipilih.
            </p>
          </div>
        ) : (
          <div className="h-72 w-full cursor-pointer" onClick={() => router.push(tautanSumber)}>
            <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
              <AreaChart
                data={data}
                margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradJasa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2196F3" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2196F3" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="gradPart" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4CAF50" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="gradPendapatan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2196F3" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2196F3" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="tanggal"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={tanggalPendek}
                  fontSize={11}
                  stroke="var(--text-muted)"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(val) => rupiahRingkas(Number(val))}
                  fontSize={11}
                  stroke="var(--text-muted)"
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(val, name) => {
                        const label =
                          name === "pendapatan_jasa"
                            ? "Jasa"
                            : name === "pendapatan_part"
                            ? "Spare Part"
                            : name === "pendapatan"
                            ? "Total Pendapatan"
                            : name === "laba"
                            ? "Laba Kotor"
                            : String(name);
                        return (
                          <div className="flex items-center justify-between gap-4 w-full">
                            <span className="text-text-muted">{label}:</span>
                            <span className="font-semibold text-text tabular-nums">
                              {rupiah(Number(val))}
                            </span>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />

                {tampilkanLaba ? (
                  <>
                    <Area
                      type="monotone"
                      dataKey="pendapatan"
                      stroke="#2196F3"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#gradPendapatan)"
                    />
                    <Line
                      type="monotone"
                      dataKey="laba"
                      stroke="#F59E0B"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </>
                ) : (
                  <>
                    <Area
                      type="monotone"
                      dataKey="pendapatan_jasa"
                      stackId="1"
                      stroke="#2196F3"
                      strokeWidth={1.5}
                      fillOpacity={1}
                      fill="url(#gradJasa)"
                    />
                    <Area
                      type="monotone"
                      dataKey="pendapatan_part"
                      stackId="1"
                      stroke="#4CAF50"
                      strokeWidth={1.5}
                      fillOpacity={1}
                      fill="url(#gradPart)"
                    />
                  </>
                )}
              </AreaChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

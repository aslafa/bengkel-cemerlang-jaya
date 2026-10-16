"use client";

import { useRouter } from "next/navigation";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { ArrowUpRight, CheckCircle2, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { tanggalPendek } from "./helper";

interface WoSelesaiItem {
  tanggal: string;
  jumlah: number;
}

interface GrafikWoSelesaiHarianProps {
  data: WoSelesaiItem[];
  judul?: string;
  deskripsi?: string;
}

export function GrafikWoSelesaiHarian({
  data,
  judul = "Tren WO Selesai Harian",
  deskripsi = "Jumlah unit kendaraan yang berhasil diselesaikan per hari",
}: GrafikWoSelesaiHarianProps) {
  const router = useRouter();

  const chartConfig = {
    jumlah: {
      label: "Unit Selesai",
      color: "#4CAF50", // Hijau
    },
  } satisfies ChartConfig;

  const adaData = data.length > 0 && data.some((d) => d.jumlah > 0);

  return (
    <Card className="bg-bg-panel border-border shadow-card flex flex-col justify-between">
      <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base font-semibold text-text flex items-center gap-2">
            <CheckCircle2 className="size-4 text-success" />
            {judul}
          </CardTitle>
          <CardDescription className="text-xs text-text-muted mt-0.5">
            {deskripsi}
          </CardDescription>
        </div>

        <button
          type="button"
          onClick={() => router.push("/work-orders?status=selesai")}
          className="text-xs text-primary hover:text-primary-strong flex items-center gap-1 font-medium hover:underline cursor-pointer transition-colors"
        >
          WO Selesai <ArrowUpRight className="size-3.5" />
        </button>
      </CardHeader>

      <CardContent className="pt-4 flex-1">
        {!adaData ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-text-muted">
            <div className="p-3 bg-muted rounded-full mb-2">
              <Inbox className="size-6 text-text-muted" />
            </div>
            <p className="text-sm font-medium text-text-body">Belum ada unit yang selesai</p>
            <p className="text-xs text-text-muted mt-0.5">
              Tidak ada Work Order yang berstatus selesai pengerjaan di periode ini.
            </p>
          </div>
        ) : (
          <div
            className="h-72 w-full cursor-pointer"
            onClick={() => router.push("/work-orders?status=selesai")}
          >
            <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
              <AreaChart
                data={data}
                margin={{ top: 15, right: 10, left: -25, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradSelesai" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4CAF50" stopOpacity={0.0} />
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
                  allowDecimals={false}
                  fontSize={11}
                  stroke="var(--text-muted)"
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(val) => (
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="text-text-muted">Unit Selesai:</span>
                          <span className="font-semibold text-text tabular-nums">{Number(val)} WO</span>
                        </div>
                      )}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="jumlah"
                  stroke="#4CAF50"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#gradSelesai)"
                />
              </AreaChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

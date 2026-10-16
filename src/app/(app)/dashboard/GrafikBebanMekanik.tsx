"use client";

import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { ArrowUpRight, Inbox, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface BebanMekanikItem {
  mekanik: string;
  tim: string;
  wo_aktif: number;
  wo_selesai: number;
}

interface GrafikBebanMekanikProps {
  data: BebanMekanikItem[];
  judul?: string;
  deskripsi?: string;
}

export function GrafikBebanMekanik({
  data,
  judul = "Beban Pengerjaan Tim Mekanik",
  deskripsi = "Perbandingan WO aktif vs WO selesai per mekanik",
}: GrafikBebanMekanikProps) {
  const router = useRouter();

  const chartConfig = {
    wo_aktif: {
      label: "WO Aktif (Dikerjakan)",
      color: "#2196F3", // Biru
    },
    wo_selesai: {
      label: "WO Selesai (Periode Ini)",
      color: "#4CAF50", // Hijau
    },
  } satisfies ChartConfig;

  const adaData = data.length > 0 && data.some((d) => d.wo_aktif > 0 || d.wo_selesai > 0);

  return (
    <Card className="bg-bg-panel border-border shadow-card flex flex-col justify-between">
      <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base font-semibold text-text flex items-center gap-2">
            <Users className="size-4 text-primary" />
            {judul}
          </CardTitle>
          <CardDescription className="text-xs text-text-muted mt-0.5">
            {deskripsi}
          </CardDescription>
        </div>

        <button
          type="button"
          onClick={() => router.push("/tim-mekanik")}
          className="text-xs text-primary hover:text-primary-strong flex items-center gap-1 font-medium hover:underline cursor-pointer transition-colors"
        >
          Tim Mekanik <ArrowUpRight className="size-3.5" />
        </button>
      </CardHeader>

      <CardContent className="pt-4 flex-1">
        {!adaData ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-text-muted">
            <div className="p-3 bg-muted rounded-full mb-2">
              <Inbox className="size-6 text-text-muted" />
            </div>
            <p className="text-sm font-medium text-text-body">Belum ada aktivitas pengerjaan mekanik</p>
            <p className="text-xs text-text-muted mt-0.5">
              Tidak ada WO aktif maupun yang selesai di periode ini.
            </p>
          </div>
        ) : (
          <div className="h-72 w-full cursor-pointer" onClick={() => router.push("/tim-mekanik")}>
            <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
              <BarChart
                data={data}
                margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="mekanik"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
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
                      formatter={(val, name, item) => {
                        const label = name === "wo_aktif" ? "WO Aktif" : "WO Selesai";
                        const tim = (item.payload as BebanMekanikItem).tim;
                        return (
                          <div className="flex flex-col gap-0.5 text-xs">
                            <span className="text-[10px] text-text-muted">Tim: {tim}</span>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-text-body font-medium">{label}:</span>
                              <span className="font-semibold text-text tabular-nums">{Number(val)} WO</span>
                            </div>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="wo_aktif"
                  fill="#2196F3"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
                <Bar
                  dataKey="wo_selesai"
                  fill="#4CAF50"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

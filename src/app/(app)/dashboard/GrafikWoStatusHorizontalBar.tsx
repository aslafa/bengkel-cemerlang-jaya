"use client";

import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, ResponsiveContainer } from "recharts";
import { ArrowUpRight, Inbox, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { STATUS_WO, type StatusWO } from "@/lib/status-wo";

// Warna status WO PRD 7.1
const WARNA_STATUS: Record<string, string> = {
  menunggu: "#9E9E9E",
  dikerjakan: "#2196F3",
  tertunda: "#F59E0B",
  selesai: "#7E57C2",
  siap_diambil: "#4CAF50",
  diambil: "#2E7D32",
  dibatalkan: "#E53935",
};

interface StatusItem {
  status: string;
  jumlah: number;
}

interface GrafikWoStatusHorizontalBarProps {
  data: StatusItem[];
  judul?: string;
  deskripsi?: string;
}

export function GrafikWoStatusHorizontalBar({
  data,
  judul = "Work Order per Status",
  deskripsi = "Jumlah unit kendaraan di setiap tahapan status pengerjaan",
}: GrafikWoStatusHorizontalBarProps) {
  const router = useRouter();

  const totalWo = data.reduce((acc, d) => acc + d.jumlah, 0);

  const chartConfig = {
    jumlah: {
      label: "Jumlah WO",
      color: "#2196F3",
    },
  } satisfies ChartConfig;

  // Format data untuk label
  const dataTerformat = data.map((d) => ({
    ...d,
    labelStatus: STATUS_WO[d.status as StatusWO]?.label || d.status,
  }));

  const handleKlikStatus = (status: string) => {
    router.push(`/work-orders?status=${status}`);
  };

  return (
    <Card className="bg-bg-panel border-border shadow-card flex flex-col justify-between">
      <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base font-semibold text-text flex items-center gap-2">
            <Layers className="size-4 text-primary" />
            {judul}
          </CardTitle>
          <CardDescription className="text-xs text-text-muted mt-0.5">
            {deskripsi}
          </CardDescription>
        </div>

        <button
          type="button"
          onClick={() => router.push("/work-orders")}
          className="text-xs text-primary hover:text-primary-strong flex items-center gap-1 font-medium hover:underline cursor-pointer transition-colors"
        >
          Semua WO <ArrowUpRight className="size-3.5" />
        </button>
      </CardHeader>

      <CardContent className="pt-4 flex-1">
        {totalWo === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-text-muted">
            <div className="p-3 bg-muted rounded-full mb-2">
              <Inbox className="size-6 text-text-muted" />
            </div>
            <p className="text-sm font-medium text-text-body">Belum ada Work Order</p>
            <p className="text-xs text-text-muted mt-0.5">
              Tidak ada data pengerjaan yang tercatat saat ini.
            </p>
          </div>
        ) : (
          <div className="h-72 w-full">
            <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
              <BarChart
                data={dataTerformat}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 35, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  fontSize={11}
                  stroke="var(--text-muted)"
                />
                <YAxis
                  type="category"
                  dataKey="labelStatus"
                  tickLine={false}
                  axisLine={false}
                  width={110}
                  fontSize={11}
                  stroke="var(--text)"
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(val, _name, item) => {
                        const row = item.payload as StatusItem & { labelStatus: string };
                        const persen = totalWo > 0 ? ((row.jumlah / totalWo) * 100).toFixed(1) : "0";
                        return (
                          <div className="flex flex-col gap-1 text-xs">
                            <span className="font-semibold text-text">{row.labelStatus}</span>
                            <div className="flex justify-between gap-4 text-text-body">
                              <span>Jumlah:</span>
                              <span className="font-semibold tabular-nums">{row.jumlah} WO</span>
                            </div>
                            <div className="flex justify-between gap-4 text-text-muted">
                              <span>Persentase:</span>
                              <span className="tabular-nums">{persen}%</span>
                            </div>
                            <span className="text-[10px] text-primary pt-1 border-t border-border/50">
                              Klik batang untuk buka daftar
                            </span>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <Bar
                  dataKey="jumlah"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={22}
                >
                  {dataTerformat.map((entry) => (
                    <Cell
                      key={`bar-${entry.status}`}
                      fill={WARNA_STATUS[entry.status] || "#9E9E9E"}
                      className="transition-opacity hover:opacity-85 cursor-pointer"
                      onClick={() => handleKlikStatus(entry.status)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

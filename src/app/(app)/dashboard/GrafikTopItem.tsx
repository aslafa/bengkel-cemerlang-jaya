"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { ArrowUpRight, Inbox, Package, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { rupiah } from "@/lib/format";

interface TopItem {
  nama: string;
  jumlah: number;
  pendapatan: number;
}

interface GrafikTopItemProps {
  topPart: TopItem[];
  topJasa: TopItem[];
  judul?: string;
  deskripsi?: string;
}

export function GrafikTopItem({
  topPart,
  topJasa,
  judul = "5 Item Terlaris",
  deskripsi = "Peringkat penjualan spare part dan jasa terbanyak",
}: GrafikTopItemProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"part" | "jasa">("part");

  const dataAktif = tab === "part" ? topPart : topJasa;
  const adaData = dataAktif.length > 0 && dataAktif.some((d) => d.jumlah > 0);

  const chartConfig = {
    jumlah: {
      label: tab === "part" ? "Unit Terjual" : "Frekuensi Jasa",
      color: tab === "part" ? "#2196F3" : "#7E57C2",
    },
  } satisfies ChartConfig;

  return (
    <Card className="bg-bg-panel border-border shadow-card flex flex-col justify-between">
      <CardHeader className="pb-3 border-b border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <CardTitle className="text-base font-semibold text-text flex items-center gap-2">
            {tab === "part" ? (
              <Package className="size-4 text-primary" />
            ) : (
              <Wrench className="size-4 text-[#7E57C2]" />
            )}
            {judul}
          </CardTitle>
          <CardDescription className="text-xs text-text-muted mt-0.5">
            {deskripsi}
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Pilihan Part / Jasa */}
          <div className="flex items-center bg-muted p-0.5 rounded-lg border border-border/60">
            <Button
              type="button"
              variant={tab === "part" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab("part")}
              className={`h-7 px-2.5 text-xs font-medium rounded-md ${
                tab === "part"
                  ? "bg-primary text-white hover:bg-primary-strong"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Spare Part
            </Button>
            <Button
              type="button"
              variant={tab === "jasa" ? "default" : "ghost"}
              size="sm"
              onClick={() => setTab("jasa")}
              className={`h-7 px-2.5 text-xs font-medium rounded-md ${
                tab === "jasa"
                  ? "bg-[#7E57C2] text-white hover:bg-[#6A44B0]"
                  : "text-text-muted hover:text-text"
              }`}
            >
              Jasa
            </Button>
          </div>

          <button
            type="button"
            onClick={() => router.push("/inventory")}
            className="text-xs text-primary hover:text-primary-strong flex items-center gap-1 font-medium hover:underline cursor-pointer transition-colors ml-1"
          >
            Inventory <ArrowUpRight className="size-3.5" />
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-4 flex-1">
        {!adaData ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-text-muted">
            <div className="p-3 bg-muted rounded-full mb-2">
              <Inbox className="size-6 text-text-muted" />
            </div>
            <p className="text-sm font-medium text-text-body">
              Belum ada penjualan {tab === "part" ? "spare part" : "jasa"}
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              Tidak ada data transaksi terbit di invoice pada periode ini.
            </p>
          </div>
        ) : (
          <div className="h-72 w-full cursor-pointer" onClick={() => router.push("/inventory")}>
            <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
              <BarChart
                data={dataAktif}
                layout="vertical"
                margin={{ top: 10, right: 25, left: 35, bottom: 0 }}
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
                  dataKey="nama"
                  tickLine={false}
                  axisLine={false}
                  width={90}
                  fontSize={11}
                  stroke="var(--text)"
                  tickFormatter={(val) =>
                    val.length > 12 ? `${val.substring(0, 11)}…` : val
                  }
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(val, name, item) => {
                        const row = item.payload as TopItem;
                        return (
                          <div className="flex flex-col gap-1 text-xs">
                            <span className="font-semibold text-text">{row.nama}</span>
                            <div className="flex justify-between gap-4 text-text-body">
                              <span>Jumlah:</span>
                              <span className="font-semibold tabular-nums">
                                {row.jumlah} {tab === "part" ? "unit" : "kali"}
                              </span>
                            </div>
                            <div className="flex justify-between gap-4 text-text-muted border-t border-border/60 pt-1">
                              <span>Total Pendapatan:</span>
                              <span className="font-semibold text-primary tabular-nums">
                                {rupiah(row.pendapatan)}
                              </span>
                            </div>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <Bar
                  dataKey="jumlah"
                  fill={tab === "part" ? "#2196F3" : "#7E57C2"}
                  radius={[0, 4, 4, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

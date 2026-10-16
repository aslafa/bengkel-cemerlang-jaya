"use client";

import { useRouter } from "next/navigation";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowUpRight, Inbox, PieChart as PieIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

interface GrafikWoStatusDonutProps {
  data: StatusItem[];
  judul?: string;
  deskripsi?: string;
}

export function GrafikWoStatusDonut({
  data,
  judul = "Komposisi Status Work Order",
  deskripsi = "Sebaran WO aktif dan selesai per status",
}: GrafikWoStatusDonutProps) {
  const router = useRouter();

  // Filter hanya yang jumlah > 0 untuk diagram donat
  const itemAktif = data.filter((d) => d.jumlah > 0);
  const totalWo = data.reduce((acc, d) => acc + d.jumlah, 0);

  const handleKlikStatus = (status: string) => {
    router.push(`/work-orders?status=${status}`);
  };

  return (
    <Card className="bg-bg-panel border-border shadow-card flex flex-col justify-between">
      <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base font-semibold text-text flex items-center gap-2">
            <PieIcon className="size-4 text-primary" />
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
          Daftar WO <ArrowUpRight className="size-3.5" />
        </button>
      </CardHeader>

      <CardContent className="pt-4 flex-1">
        {totalWo === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-text-muted">
            <div className="p-3 bg-muted rounded-full mb-2">
              <Inbox className="size-6 text-text-muted" />
            </div>
            <p className="text-sm font-medium text-text-body">Belum ada Work Order</p>
            <p className="text-xs text-text-muted mt-0.5">Tidak ada data status untuk ditampilkan.</p>
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
                      const entry = payload[0].payload as StatusItem;
                      const label = STATUS_WO[entry.status as StatusWO]?.label || entry.status;
                      const persen = ((entry.jumlah / totalWo) * 100).toFixed(1);
                      return (
                        <div className="bg-bg-panel border border-border shadow-md rounded-lg p-2.5 text-xs">
                          <div className="font-semibold text-text flex items-center gap-1.5 mb-1">
                            <span
                              className="size-2.5 rounded-full"
                              style={{ backgroundColor: WARNA_STATUS[entry.status] || "#9E9E9E" }}
                            />
                            {label}
                          </div>
                          <div className="flex justify-between gap-4 text-text-body">
                            <span>Jumlah:</span>
                            <span className="font-semibold tabular-nums">{entry.jumlah} WO</span>
                          </div>
                          <div className="flex justify-between gap-4 text-text-muted">
                            <span>Porsi:</span>
                            <span className="tabular-nums">{persen}%</span>
                          </div>
                          <p className="text-[10px] text-primary mt-1 border-t border-border/50 pt-1">
                            Klik untuk buka daftar
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Pie
                    data={itemAktif}
                    dataKey="jumlah"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {itemAktif.map((entry) => (
                      <Cell
                        key={`cell-${entry.status}`}
                        fill={WARNA_STATUS[entry.status] || "#9E9E9E"}
                        className="transition-opacity hover:opacity-80 cursor-pointer"
                        onClick={() => handleKlikStatus(entry.status)}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {/* Total di Tengah Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-semibold text-text tabular-nums leading-tight">
                  {totalWo}
                </span>
                <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                  Total WO
                </span>
              </div>
            </div>

            {/* Legenda Interaktif dengan Warna Status PRD 7.1 */}
            <div className="w-full sm:w-1/2 flex flex-col gap-1.5 pr-2">
              {data.map((item) => {
                const info = STATUS_WO[item.status as StatusWO];
                const label = info?.label || item.status;
                const warna = WARNA_STATUS[item.status] || "#9E9E9E";
                const persen = totalWo > 0 ? ((item.jumlah / totalWo) * 100).toFixed(0) : "0";

                return (
                  <button
                    key={item.status}
                    type="button"
                    onClick={() => handleKlikStatus(item.status)}
                    className="flex items-center justify-between p-1.5 rounded-lg text-xs hover:bg-muted/60 transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: warna }}
                      />
                      <span className="text-text-body font-medium group-hover:text-primary transition-colors">
                        {label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 tabular-nums">
                      <span className="font-semibold text-text">{item.jumlah}</span>
                      <span className="text-[11px] text-text-muted w-8 text-right">
                        {persen}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

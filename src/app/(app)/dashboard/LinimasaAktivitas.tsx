"use client";

import Link from "next/link";
import { History, ArrowUpRight, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LogAktivitas {
  id: number;
  waktu: string;
  aksi: string;
  tabel: string;
  pelaku_peran: string | null;
  alasan: string | null;
  data_id: string | null;
}

interface LinimasaAktivitasProps {
  logs: LogAktivitas[];
}

export function LinimasaAktivitas({ logs }: LinimasaAktivitasProps) {
  const formatWaktu = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      });
    } catch {
      return iso;
    }
  };

  return (
    <Card className="bg-bg-panel border-border shadow-card flex flex-col justify-between">
      <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base font-semibold text-text flex items-center gap-2">
            <History className="size-4 text-primary" />
            Aktivitas Bengkel Terbaru
          </CardTitle>
          <CardDescription className="text-xs text-text-muted mt-0.5">
            8 log audit perubahan status, tagihan, dan stok terakhir
          </CardDescription>
        </div>

        <Link
          href="/audit-log"
          className="text-xs text-primary hover:text-primary-strong flex items-center gap-1 font-medium hover:underline transition-colors"
        >
          Lihat Semua <ArrowUpRight className="size-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="pt-4 flex-1">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-text-muted">
            <Inbox className="size-6 text-text-muted mb-2" />
            <p className="text-sm font-medium text-text-body">Belum ada aktivitas tercatat</p>
            <p className="text-xs text-text-muted mt-0.5">Audit log masih kosong.</p>
          </div>
        ) : (
          <div className="relative pl-4 border-l border-border space-y-3.5 my-1">
            {logs.map((log) => (
              <div key={log.id} className="relative group text-xs">
                {/* Titik linimasa */}
                <div className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary ring-4 ring-bg-panel" />

                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-text">
                        {log.aksi}
                      </span>
                      <span className="text-text-muted">pada</span>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                        {log.tabel}
                      </Badge>
                      {log.pelaku_peran && (
                        <span className="text-[11px] text-text-muted">
                          oleh <span className="font-medium text-text-body capitalize">{log.pelaku_peran}</span>
                        </span>
                      )}
                    </div>

                    {log.alasan && (
                      <p className="text-[11px] text-text-muted italic truncate">
                        &quot;{log.alasan}&quot;
                      </p>
                    )}
                  </div>

                  <span className="text-[11px] text-text-muted tabular-nums shrink-0 font-medium">
                    {formatWaktu(log.waktu)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

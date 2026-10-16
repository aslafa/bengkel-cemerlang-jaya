"use client";

import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Clock, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_WO, type StatusWO } from "@/lib/status-wo";
import { tanggal } from "@/lib/format";

export interface ItemAntreanWo {
  id: string;
  nomor: string;
  plat: string;
  keluhan: string;
  status: string;
  estimasi_selesai: string | null;
  isTerlambat: boolean;
}

interface AntreanTimMekanikProps {
  antrean: ItemAntreanWo[];
  menungguQc: ItemAntreanWo[];
}

export function AntreanTimMekanik({ antrean, menungguQc }: AntreanTimMekanikProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. QC Hari Ini */}
      <Card className="bg-bg-panel border-border shadow-card flex flex-col justify-between">
        <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-text flex items-center gap-2">
              <CheckCircle2 className="size-4 text-[#7E57C2]" />
              Pemeriksaan QC Hari Ini
            </CardTitle>
            <CardDescription className="text-xs text-text-muted mt-0.5">
              WO tim berstatus selesai yang menunggu pengujian fisik oleh Kepala Mekanik
            </CardDescription>
          </div>

          <Link
            href="/work-orders?status=selesai"
            className="text-xs text-primary hover:text-primary-strong flex items-center gap-1 font-medium hover:underline transition-colors"
          >
            Lihat Semua <ArrowUpRight className="size-3.5" />
          </Link>
        </CardHeader>

        <CardContent className="pt-3 flex-1">
          {menungguQc.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-36 text-center text-text-muted">
              <p className="text-sm font-medium text-text-body">Tidak Ada Antrean QC</p>
              <p className="text-xs text-text-muted mt-0.5">
                Semua unit yang selesai telah lulus atau tidak ada unit menunggu QC.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {menungguQc.map((item) => (
                <div
                  key={item.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text">{item.nomor}</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-medium">
                        {item.plat}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-text-muted truncate">
                      {item.keluhan}
                    </p>
                  </div>

                  <Button asChild size="sm" className="h-7 text-xs bg-[#7E57C2] hover:bg-[#6A44B0] text-white gap-1 shrink-0">
                    <Link href={`/work-orders/${item.id}`}>
                      Uji QC
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Antrean Tim */}
      <Card className="bg-bg-panel border-border shadow-card flex flex-col justify-between">
        <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-text flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              Antrean Pengerjaan Tim
            </CardTitle>
            <CardDescription className="text-xs text-text-muted mt-0.5">
              Unit tanggungan tim diurutkan berdasarkan estimasi selesai terdekat
            </CardDescription>
          </div>

          <Link
            href="/work-orders"
            className="text-xs text-primary hover:text-primary-strong flex items-center gap-1 font-medium hover:underline transition-colors"
          >
            Semua WO Tim <ArrowUpRight className="size-3.5" />
          </Link>
        </CardHeader>

        <CardContent className="pt-3 flex-1">
          {antrean.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-36 text-center text-text-muted">
              <p className="text-sm font-medium text-text-body">Antrean Bersih</p>
              <p className="text-xs text-text-muted mt-0.5">
                Tidak ada unit aktif yang sedang menunggu atau dikerjakan tim.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {antrean.map((item) => {
                const label = STATUS_WO[item.status as StatusWO]?.label || item.status;
                return (
                  <div
                    key={item.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-text">{item.nomor}</span>
                        <Badge variant="outline" className="text-[10px] uppercase font-medium">
                          {item.plat}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {label}
                        </Badge>
                        {item.isTerlambat && (
                          <Badge variant="destructive" className="text-[10px] font-medium">
                            Terlambat
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-text-muted truncate">
                        {item.keluhan}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      {item.estimasi_selesai ? (
                        <span className="text-[11px] text-text-muted tabular-nums">
                          Est: {tanggal(item.estimasi_selesai)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-text-muted">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

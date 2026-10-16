"use client";

import Link from "next/link";
import { ArrowUpRight, Receipt, CheckCircle, Car } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { rupiah } from "@/lib/format";

export interface ItemPerluDitagih {
  id: string;
  nomor: string;
  plat: string;
  total?: number;
  statusBayar?: string;
}

export interface ItemSiapDiserahkan {
  id: string;
  nomor: string;
  plat: string;
  pelanggan: string;
}

interface TabelTindakanAdminProps {
  perluDitagih: ItemPerluDitagih[];
  siapDiserahkan: ItemSiapDiserahkan[];
}

export function TabelTindakanAdmin({
  perluDitagih,
  siapDiserahkan,
}: TabelTindakanAdminProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Perlu Ditagih */}
      <Card className="bg-bg-panel border-border shadow-card flex flex-col justify-between">
        <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-text flex items-center gap-2">
              <Receipt className="size-4 text-warning" />
              Perlu Ditagih
            </CardTitle>
            <CardDescription className="text-xs text-text-muted mt-0.5">
              WO Siap Diambil yang invoice-nya belum terbit atau belum lunas
            </CardDescription>
          </div>

          <Link
            href="/work-orders?status=siap_diambil"
            className="text-xs text-primary hover:text-primary-strong flex items-center gap-1 font-medium hover:underline transition-colors"
          >
            Lihat Semua <ArrowUpRight className="size-3.5" />
          </Link>
        </CardHeader>

        <CardContent className="pt-3 flex-1">
          {perluDitagih.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-36 text-center text-text-muted">
              <p className="text-sm font-medium text-text-body">Semua Tagihan Beres</p>
              <p className="text-xs text-text-muted mt-0.5">
                Tidak ada mobil siap diambil yang tertunda pembayarannya.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {perluDitagih.map((item) => (
                <div
                  key={item.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text">{item.nomor}</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-medium">
                        {item.plat}
                      </Badge>
                    </div>
                    {item.total !== undefined && item.total > 0 && (
                      <p className="text-[11px] text-text-muted tabular-nums">
                        Total Tagihan: {rupiah(item.total)}
                      </p>
                    )}
                  </div>

                  <Button asChild size="sm" variant="outline" className="h-7 text-xs hover:border-primary hover:text-primary">
                    <Link href={`/work-orders/${item.id}/tagihan`}>
                      Buka Tagihan
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Siap Diserahkan */}
      <Card className="bg-bg-panel border-border shadow-card flex flex-col justify-between">
        <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-text flex items-center gap-2">
              <CheckCircle className="size-4 text-success" />
              Siap Diserahkan
            </CardTitle>
            <CardDescription className="text-xs text-text-muted mt-0.5">
              WO Lunas yang siap diambil pemilik kendaraan
            </CardDescription>
          </div>

          <Link
            href="/work-orders?status=siap_diambil"
            className="text-xs text-primary hover:text-primary-strong flex items-center gap-1 font-medium hover:underline transition-colors"
          >
            Lihat Semua <ArrowUpRight className="size-3.5" />
          </Link>
        </CardHeader>

        <CardContent className="pt-3 flex-1">
          {siapDiserahkan.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-36 text-center text-text-muted">
              <p className="text-sm font-medium text-text-body">Tidak Ada Antrean Penyerahan</p>
              <p className="text-xs text-text-muted mt-0.5">
                Semua unit lunas telah diserahkan ke pelanggan.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {siapDiserahkan.map((item) => (
                <div
                  key={item.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text">{item.nomor}</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-medium">
                        {item.plat}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-text-muted">
                      Pemilik: <span className="font-medium text-text">{item.pelanggan}</span>
                    </p>
                  </div>

                  <Button asChild size="sm" className="h-7 text-xs bg-success hover:bg-success/90 text-white gap-1">
                    <Link href={`/work-orders/${item.id}`}>
                      <Car className="size-3" />
                      Serahkan Mobil
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

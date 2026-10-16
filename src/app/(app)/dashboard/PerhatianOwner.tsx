"use client";

import Link from "next/link";
import { AlertTriangle, AlertCircle, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ItemPerhatian {
  id: string;
  tipe: "terlambat" | "stok" | "bawah_modal";
  judul: string;
  keterangan: string;
  tautan: string;
}

interface PerhatianOwnerProps {
  items: ItemPerhatian[];
}

export function PerhatianOwner({ items }: PerhatianOwnerProps) {
  return (
    <Card className="bg-bg-panel border-border shadow-card flex flex-col justify-between">
      <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base font-semibold text-text flex items-center gap-2">
            <AlertTriangle className="size-4 text-warning" />
            Perhatian & Peringatan
          </CardTitle>
          <CardDescription className="text-xs text-text-muted mt-0.5">
            WO terlambat, stok habis/menipis, dan kondisi mendesak
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="pt-4 flex-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-text-muted">
            <CheckCircle2 className="size-8 text-success mb-2" />
            <p className="text-sm font-medium text-text-body">Semua Kondisi Normal</p>
            <p className="text-xs text-text-muted mt-0.5">
              Tidak ada WO yang terlambat atau stok suku cadang yang menipis saat ini.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {items.map((item) => (
              <Link
                key={item.id}
                href={item.tautan}
                className="py-2.5 flex items-center justify-between gap-3 group hover:bg-muted/40 transition-colors px-1 rounded-md"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {item.tipe === "terlambat" && (
                    <Badge variant="destructive" className="shrink-0 text-[10px] uppercase font-medium">
                      Terlambat
                    </Badge>
                  )}
                  {item.tipe === "stok" && (
                    <Badge className="bg-warning text-white hover:bg-warning shrink-0 text-[10px] uppercase font-medium">
                      Stok Menipis
                    </Badge>
                  )}
                  {item.tipe === "bawah_modal" && (
                    <Badge variant="destructive" className="shrink-0 text-[10px] uppercase font-medium">
                      Bawah Modal
                    </Badge>
                  )}

                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text group-hover:text-primary transition-colors truncate">
                      {item.judul}
                    </p>
                    <p className="text-[11px] text-text-muted truncate">{item.keterangan}</p>
                  </div>
                </div>

                <ArrowUpRight className="size-3.5 text-text-muted group-hover:text-primary shrink-0 transition-colors" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

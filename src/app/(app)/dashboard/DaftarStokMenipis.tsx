"use client";

import Link from "next/link";
import { Package, ArrowUpRight, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface ItemStokMenipis {
  id: string;
  nama: string;
  stok: number;
  stok_minimum: number;
}

interface DaftarStokMenipisProps {
  items: ItemStokMenipis[];
}

export function DaftarStokMenipis({ items }: DaftarStokMenipisProps) {
  return (
    <Card className="bg-bg-panel border-border shadow-card flex flex-col justify-between">
      <CardHeader className="pb-3 border-b border-border/60 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base font-semibold text-text flex items-center gap-2">
            <Package className="size-4 text-warning" />
            Suku Cadang Menipis
          </CardTitle>
          <CardDescription className="text-xs text-text-muted mt-0.5">
            Spare part dengan stok saat ini di bawah atau sama dengan stok minimum
          </CardDescription>
        </div>

        <Link
          href="/inventory"
          className="text-xs text-primary hover:text-primary-strong flex items-center gap-1 font-medium hover:underline transition-colors"
        >
          Ke Inventory <ArrowUpRight className="size-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="pt-3 flex-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-36 text-center text-text-muted">
            <p className="text-sm font-medium text-text-body">Stok Gudang Aman</p>
            <p className="text-xs text-text-muted mt-0.5">
              Semua spare part berada di atas batas stok minimum.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {items.map((item) => {
              const rasio = Math.min(
                100,
                Math.round((item.stok / (item.stok_minimum || 1)) * 100)
              );
              const habis = item.stok === 0;

              return (
                <div key={item.id} className="py-2.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-text">{item.nama}</span>
                    <Badge
                      variant={habis ? "destructive" : "outline"}
                      className={`text-[10px] uppercase font-medium ${
                        !habis ? "text-warning border-warning/40 bg-amber-50" : ""
                      }`}
                    >
                      {habis ? "Habis (0)" : `Sisa ${item.stok} unit`}
                    </Badge>
                  </div>

                  {/* Progress bar stok vs minimum (PRD 12.3) */}
                  <div className="space-y-1">
                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          habis ? "bg-danger" : "bg-warning"
                        }`}
                        style={{ width: `${Math.max(5, rasio)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-text-muted">
                      <span>Stok: {item.stok}</span>
                      <span>Min: {item.stok_minimum} unit</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

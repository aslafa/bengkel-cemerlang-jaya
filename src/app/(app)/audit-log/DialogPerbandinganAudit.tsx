"use client";

import { useState } from "react";
import { Eye, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { tanggal, rupiah } from "@/lib/format";
import type { Json } from "@/types/database";

export interface ItemAuditLog {
  id: number;
  waktu: string;
  pelaku_id: string | null;
  pelaku_peran: string | null;
  aksi: string;
  tabel: string;
  data_id: string | null;
  sebelum: Json | null;
  sesudah: Json | null;
  alasan: string | null;
  pelaku_nama?: string | null;
}

function formatNilai(kunci: string, nilai: unknown): string {
  if (nilai === null || nilai === undefined) return "-";
  if (typeof nilai === "boolean") return nilai ? "Ya" : "Tidak";
  if (typeof nilai === "number") {
    if (kunci.includes("harga") || kunci.includes("total") || kunci.includes("subtotal") || kunci.includes("diskon") || kunci.includes("modal") || kunci.includes("bayar") || kunci.includes("pendapatan") || kunci.includes("laba")) {
      return rupiah(nilai);
    }
    return String(nilai);
  }
  if (typeof nilai === "string") {
    if (kunci.includes("_at") || kunci === "waktu") {
      try {
        return new Date(nilai).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
      } catch {
        return nilai;
      }
    }
    return nilai;
  }
  if (Array.isArray(nilai)) {
    return nilai.join(", ");
  }
  if (typeof nilai === "object") {
    return JSON.stringify(nilai);
  }
  return String(nilai);
}

export function DialogPerbandinganAudit({ log }: { log: ItemAuditLog }) {
  const [buka, setBuka] = useState(false);
  const [tab, setTab] = useState<"diff" | "json">("diff");

  const sebelumObj = (log.sebelum && typeof log.sebelum === "object" && !Array.isArray(log.sebelum)
    ? (log.sebelum as Record<string, unknown>)
    : null);
  const sesudahObj = (log.sesudah && typeof log.sesudah === "object" && !Array.isArray(log.sesudah)
    ? (log.sesudah as Record<string, unknown>)
    : null);

  // Ambil semua kunci unik dari sebelum dan sesudah
  const semuaKunci = Array.from(
    new Set([...Object.keys(sebelumObj ?? {}), ...Object.keys(sesudahObj ?? {})]),
  );

  const barisDiff = semuaKunci.map((kunci) => {
    const valLama = sebelumObj ? sebelumObj[kunci] : undefined;
    const valBaru = sesudahObj ? sesudahObj[kunci] : undefined;
    const sama = JSON.stringify(valLama) === JSON.stringify(valBaru);
    return {
      kunci,
      valLama,
      valBaru,
      sama,
    };
  });

  const jumlahBerubah = barisDiff.filter((b) => !b.sama).length;

  return (
    <Dialog open={buka} onOpenChange={setBuka}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs text-primary hover:text-primary-strong">
          <Eye className="size-3.5" />
          Lihat Perubahan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <DialogTitle className="text-lg font-semibold text-text">
              Rincian Perubahan Data
            </DialogTitle>
            <Badge
              variant="outline"
              className={
                log.aksi === "INSERT"
                  ? "bg-success/10 text-success border-success/30 font-semibold"
                  : log.aksi === "UPDATE"
                    ? "bg-primary/10 text-primary-strong border-primary/30 font-semibold"
                    : "bg-danger/10 text-danger border-danger/30 font-semibold"
              }
            >
              {log.aksi}
            </Badge>
          </div>
          <DialogDescription className="text-xs text-text-muted">
            Tabel <span className="font-medium text-text">{log.tabel}</span> · ID: <code className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">{log.data_id || "-"}</code>
          </DialogDescription>
        </DialogHeader>

        {/* Ringkasan Metadata Pelaku dan Waktu */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-bg-app border border-border text-xs">
          <div>
            <span className="text-text-muted block text-[11px]">Waktu</span>
            <span className="font-medium text-text">
              {new Date(log.waktu).toLocaleString("id-ID", {
                timeZone: "Asia/Jakarta",
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>
          <div>
            <span className="text-text-muted block text-[11px]">Pelaku</span>
            <span className="font-medium text-text">{log.pelaku_nama || (log.pelaku_id ? "Pengguna" : "Sistem")}</span>
          </div>
          <div>
            <span className="text-text-muted block text-[11px]">Peran</span>
            <span className="font-medium capitalize text-text">{log.pelaku_peran || "Sistem"}</span>
          </div>
          <div>
            <span className="text-text-muted block text-[11px]">Kolom Berubah</span>
            <span className="font-medium text-text">{jumlahBerubah} kolom</span>
          </div>
          {log.alasan && (
            <div className="col-span-2 sm:col-span-4 pt-1 border-t border-border/60">
              <span className="text-text-muted block text-[11px]">Alasan Perubahan:</span>
              <p className="font-medium text-text italic mt-0.5">&ldquo;{log.alasan}&rdquo;</p>
            </div>
          )}
        </div>

        {/* Pilihan Tab Tampilan */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-1 border-b border-border w-full">
            <button
              type="button"
              onClick={() => setTab("diff")}
              className={`pb-2 px-3 text-xs font-medium border-b-2 transition-colors ${
                tab === "diff"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              Tabel Perbandingan ({jumlahBerubah} berubah)
            </button>
            <button
              type="button"
              onClick={() => setTab("json")}
              className={`pb-2 px-3 text-xs font-medium border-b-2 transition-colors ${
                tab === "json"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              Data Mentah (JSON)
            </button>
          </div>
        </div>

        {/* Isi Konten */}
        <div className="flex-1 overflow-y-auto pr-1">
          {tab === "diff" ? (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-bg-app hover:bg-bg-app text-xs">
                    <TableHead className="w-1/3">Kolom / Properti</TableHead>
                    <TableHead className="w-1/3">Nilai Sebelum</TableHead>
                    <TableHead className="w-1/3">Nilai Sesudah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {barisDiff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-6 text-text-muted">
                        Tidak ada data properti yang tercatat.
                      </TableCell>
                    </TableRow>
                  ) : (
                    barisDiff.map(({ kunci, valLama, valBaru, sama }) => (
                      <TableRow
                        key={kunci}
                        className={!sama ? "bg-primary-soft/20 hover:bg-primary-soft/30 font-medium" : "hover:bg-muted/30"}
                      >
                        <TableCell className="font-mono text-[11px] text-text-body">
                          {kunci}
                        </TableCell>
                        <TableCell className={!sama && valLama !== undefined ? "text-danger bg-danger/5" : "text-text-muted"}>
                          {formatNilai(kunci, valLama)}
                        </TableCell>
                        <TableCell className={!sama && valBaru !== undefined ? "text-success bg-success/5 font-semibold" : "text-text-body"}>
                          <div className="flex items-center gap-1.5">
                            {!sama && <ArrowRight className="size-3 text-text-muted shrink-0" />}
                            <span>{formatNilai(kunci, valBaru)}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-text-muted block mb-1">Sebelum</span>
                <pre className="p-3 bg-muted/60 rounded-lg font-mono text-[11px] overflow-x-auto max-h-64 border border-border">
                  {log.sebelum ? JSON.stringify(log.sebelum, null, 2) : "null"}
                </pre>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-text-muted block mb-1">Sesudah</span>
                <pre className="p-3 bg-muted/60 rounded-lg font-mono text-[11px] overflow-x-auto max-h-64 border border-border">
                  {log.sesudah ? JSON.stringify(log.sesudah, null, 2) : "null"}
                </pre>
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-text-muted">
          <span className="flex items-center gap-1.5 text-success">
            <ShieldCheck className="size-3.5" />
            Catatan log terlindungi &amp; tidak dapat diedit
          </span>
          <Button variant="secondary" size="sm" onClick={() => setBuka(false)} className="h-7 text-xs">
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

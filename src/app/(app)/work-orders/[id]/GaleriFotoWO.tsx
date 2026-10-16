"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Eye,
  Loader2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { unggahFotoDanThumbnail } from "@/lib/kompres-foto";
import type { Peran } from "@/lib/peran";
import { createClient } from "@/lib/supabase/client";

export interface FotoItem {
  id: string;
  jenis: "stnk" | "kondisi_awal" | "kondisi_akhir" | "pengerjaan";
  path: string;
  thumbUrl: string;
  fullUrl: string;
}

interface Props {
  woId: string;
  statusWo: string;
  kepalaMekanikId: string;
  fotos: FotoItem[];
  profil: { id: string; nama: string; peran: Peran };
}

const LABEL_JENIS = {
  stnk: "STNK",
  kondisi_awal: "Kondisi Awal",
  kondisi_akhir: "Kondisi Akhir",
  pengerjaan: "Pengerjaan",
};

export function GaleriFotoWO({
  woId,
  statusWo,
  kepalaMekanikId,
  fotos,
  profil,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [fotoAktif, setFotoAktif] = useState<FotoItem | null>(null);
  const [sedangUnggahPengerjaan, setSedangUnggahPengerjaan] = useState(false);
  const [pesanError, setPesanError] = useState("");

  const isTimWO =
    profil.peran === "owner" ||
    (profil.peran === "kepala_mekanik" && kepalaMekanikId === profil.id);
  const bolehUnggahPengerjaan = isTimWO && statusWo === "dikerjakan";

  // Pengelompokan foto berdasarkan jenis
  const fotoStnk = fotos.filter((f) => f.jenis === "stnk");
  const fotoAwal = fotos.filter((f) => f.jenis === "kondisi_awal");
  const fotoPengerjaan = fotos.filter((f) => f.jenis === "pengerjaan");
  const fotoAkhir = fotos.filter((f) => f.jenis === "kondisi_akhir");

  const handleUnggahPengerjaan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setSedangUnggahPengerjaan(true);
    setPesanError("");

    try {
      for (const file of files) {
        const { path } = await unggahFotoDanThumbnail(supabase, woId, "pengerjaan", file);
        const { error } = await supabase.from("work_order_photos").insert({
          work_order_id: woId,
          jenis: "pengerjaan",
          path,
        });
        if (error) throw error;
      }

      router.refresh();
    } catch (err: unknown) {
      setPesanError(err instanceof Error ? err.message : "Gagal mengunggah foto pengerjaan");
    } finally {
      setSedangUnggahPengerjaan(false);
    }
  };

  const renderGrid = (items: FotoItem[], labelKosong: string) => {
    if (items.length === 0) {
      return <p className="text-xs text-muted-foreground italic">{labelKosong}</p>;
    }

    return (
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
        {items.map((foto) => (
          <div
            key={foto.id}
            onClick={() => setFotoAktif(foto)}
            className="group relative aspect-video cursor-pointer overflow-hidden rounded-lg border border-border bg-muted/40 transition-all hover:border-primary hover:shadow-sm"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={foto.thumbUrl || foto.fullUrl}
              alt={LABEL_JENIS[foto.jenis]}
              className="size-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Eye className="size-5 text-white" />
            </div>
            <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">
              {LABEL_JENIS[foto.jenis]}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {pesanError && (
        <div className="rounded-md border border-danger/30 bg-danger/10 p-2 text-xs text-danger">
          {pesanError}
        </div>
      )}

      {/* 1. Foto STNK & Kondisi Awal (Bagian A) */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-text">Foto STNK</h4>
          <div className="mt-2">
            {renderGrid(fotoStnk, "Tidak ada foto STNK.")}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-text">Foto Kondisi Awal</h4>
          <div className="mt-2">
            {renderGrid(fotoAwal, "Tidak ada foto kondisi awal.")}
          </div>
        </div>
      </div>

      {/* 2. Foto Pengerjaan (Bagian C) */}
      <div className="space-y-2 border-t border-border pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-text">Foto Pengerjaan (Opsional)</h4>
            <p className="text-xs text-muted-foreground">Dokumentasi pembongkaran atau penggantian suku cadang.</p>
          </div>

          {bolehUnggahPengerjaan && (
            <label className="cursor-pointer">
              <Button size="sm" variant="outline" asChild disabled={sedangUnggahPengerjaan}>
                <span>
                  {sedangUnggahPengerjaan ? (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  ) : (
                    <Upload className="mr-1.5 size-3.5" />
                  )}
                  + Foto Pengerjaan
                </span>
              </Button>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                disabled={sedangUnggahPengerjaan}
                onChange={handleUnggahPengerjaan}
              />
            </label>
          )}
        </div>

        <div className="pt-1">
          {renderGrid(fotoPengerjaan, "Belum ada foto pengerjaan yang diunggah.")}
        </div>
      </div>

      {/* 3. Foto Kondisi Akhir */}
      {fotoAkhir.length > 0 && (
        <div className="space-y-2 border-t border-border pt-4">
          <h4 className="text-sm font-semibold text-text">Foto Kondisi Akhir (Penyerahan)</h4>
          <div className="pt-1">{renderGrid(fotoAkhir, "")}</div>
        </div>
      )}

      {/* Lightbox Dialog Tampilan Penuh */}
      <Dialog open={fotoAktif !== null} onOpenChange={(open) => !open && setFotoAktif(null)}>
        <DialogContent className="max-w-3xl p-3">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-sm font-medium">
              <span>{fotoAktif ? LABEL_JENIS[fotoAktif.jenis] : "Foto Work Order"}</span>
              {fotoAktif && (
                <a
                  href={fotoAktif.fullUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="size-3" />
                  Buka Tab Baru
                </a>
              )}
            </DialogTitle>
          </DialogHeader>

          {fotoAktif && (
            <div className="mt-2 flex max-h-[75vh] items-center justify-center overflow-hidden rounded-lg bg-black/90 p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fotoAktif.fullUrl}
                alt="Foto Penuh"
                className="max-h-[70vh] w-auto max-w-full rounded object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

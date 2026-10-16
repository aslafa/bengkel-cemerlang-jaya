"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  CheckCircle,
  Clock,
  KeyRound,
  Loader2,
  PauseCircle,
  PlayCircle,
  Upload,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { unggahFotoDanThumbnail } from "@/lib/kompres-foto";
import type { Peran } from "@/lib/peran";
import type { StatusWO } from "@/lib/status-wo";
import { createClient } from "@/lib/supabase/client";

interface Props {
  woId: string;
  nomorWo: string;
  status: StatusWO;
  kepalaMekanikId: string;
  profil: { id: string; nama: string; peran: Peran };
  jumlahItem: number;
  statusBayarInvoice?: string;
  hasKondisiAkhir: boolean;
}

export function AksiStatusWO({
  woId,
  nomorWo,
  status,
  kepalaMekanikId,
  profil,
  jumlahItem,
  statusBayarInvoice,
  hasKondisiAkhir,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  // Dialog states
  const [dialogBatalBuka, setDialogBatalBuka] = useState(false);
  const [alasanBatal, setAlasanBatal] = useState("");

  const [dialogTundaBuka, setDialogTundaBuka] = useState(false);
  const [catatanTunda, setCatatanTunda] = useState("");

  const [dialogQcGagalBuka, setDialogQcGagalBuka] = useState(false);
  const [catatanQcGagal, setCatatanQcGagal] = useState("");

  const [dialogSerahkanBuka, setDialogSerahkanBuka] = useState(false);
  const [fotoKondisiAkhir, setFotoKondisiAkhir] = useState<File[]>([]);
  const [previewKondisiAkhir, setPreviewKondisiAkhir] = useState<string[]>([]);

  const [sedangProses, setSedangProses] = useState(false);
  const [pesanError, setPesanError] = useState("");
  const [statusTeks, setStatusTeks] = useState("");

  const isTimWO =
    profil.peran === "owner" ||
    (profil.peran === "kepala_mekanik" && kepalaMekanikId === profil.id);
  const isAdminOrOwner = profil.peran === "admin" || profil.peran === "owner";

  // Fungsi pemanggil RPC ubah_status_wo
  const eksekusiUbahStatus = async (statusTarget: StatusWO, catatan?: string) => {
    setSedangProses(true);
    setPesanError("");
    try {
      const { error } = await supabase.rpc("ubah_status_wo", {
        p_wo: woId,
        p_status: statusTarget,
        p_catatan: catatan?.trim() || undefined,
      });

      if (error) throw error;

      router.refresh();
      // Tutup semua dialog
      setDialogBatalBuka(false);
      setDialogTundaBuka(false);
      setDialogQcGagalBuka(false);
      setDialogSerahkanBuka(false);
    } catch (err: unknown) {
      setPesanError(err instanceof Error ? err.message : "Gagal mengubah status Work Order");
    } finally {
      setSedangProses(false);
      setStatusTeks("");
    }
  };

  // Handler Serahkan Mobil
  const handleSerahkanMobil = async () => {
    if (statusBayarInvoice !== "lunas") {
      setPesanError("Mobil hanya bisa diserahkan jika tagihan/invoice sudah lunas.");
      return;
    }
    if (!hasKondisiAkhir && fotoKondisiAkhir.length === 0) {
      setPesanError("Wajib mengunggah minimal 1 foto kondisi akhir sebelum penyerahan mobil.");
      return;
    }

    setSedangProses(true);
    setPesanError("");
    try {
      // Unggah foto kondisi akhir jika ada
      for (let i = 0; i < fotoKondisiAkhir.length; i++) {
        setStatusTeks(`Mengunggah foto kondisi akhir (${i + 1}/${fotoKondisiAkhir.length})...`);
        const { path } = await unggahFotoDanThumbnail(
          supabase,
          woId,
          "kondisi_akhir",
          fotoKondisiAkhir[i],
        );

        const { error: errPhoto } = await supabase.from("work_order_photos").insert({
          work_order_id: woId,
          jenis: "kondisi_akhir",
          path,
        });
        if (errPhoto) throw errPhoto;
      }

      setStatusTeks("Menyelesaikan penyerahan mobil...");
      const { error } = await supabase.rpc("ubah_status_wo", {
        p_wo: woId,
        p_status: "diambil",
        p_catatan: "Kendaraan diserahkan kepada pelanggan",
      });

      if (error) throw error;

      router.refresh();
      setDialogSerahkanBuka(false);
    } catch (err: unknown) {
      setPesanError(err instanceof Error ? err.message : "Gagal memproses penyerahan mobil");
    } finally {
      setSedangProses(false);
      setStatusTeks("");
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {pesanError && (
        <div className="w-full rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {pesanError}
        </div>
      )}

      {/* 1. Status Menunggu */}
      {status === "menunggu" && (
        <>
          {isAdminOrOwner && (
            <Button
              variant="outline"
              size="sm"
              className="text-danger hover:border-danger hover:text-danger"
              onClick={() => setDialogBatalBuka(true)}
              disabled={sedangProses}
            >
              <Ban className="mr-1.5 size-4" />
              Batalkan WO
            </Button>
          )}
        </>
      )}

      {/* 2. Status Dikerjakan */}
      {status === "dikerjakan" && (
        <>
          {isTimWO && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialogTundaBuka(true)}
                disabled={sedangProses}
              >
                <PauseCircle className="mr-1.5 size-4 text-warning" />
                Tunda Pengerjaan
              </Button>

              <Button
                size="sm"
                className="bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600"
                onClick={() => eksekusiUbahStatus("selesai")}
                disabled={sedangProses || jumlahItem < 1}
                title={
                  jumlahItem < 1
                    ? "Catat minimal 1 jasa atau spare part sebelum menyelesaikan pengerjaan"
                    : "Pengerjaan selesai, siap diperiksa QC"
                }
              >
                <CheckCircle className="mr-1.5 size-4" />
                Selesai Dikerjakan
              </Button>
            </>
          )}

          {isAdminOrOwner && (
            <Button
              variant="outline"
              size="sm"
              className="text-danger hover:border-danger hover:text-danger"
              onClick={() => setDialogBatalBuka(true)}
              disabled={sedangProses}
            >
              <Ban className="mr-1.5 size-4" />
              Batalkan WO
            </Button>
          )}
        </>
      )}

      {/* 3. Status Tertunda */}
      {status === "tertunda" && (
        <>
          {isTimWO && (
            <Button
              size="sm"
              onClick={() => eksekusiUbahStatus("dikerjakan")}
              disabled={sedangProses}
            >
              <PlayCircle className="mr-1.5 size-4" />
              Lanjutkan Pengerjaan
            </Button>
          )}

          {isAdminOrOwner && (
            <Button
              variant="outline"
              size="sm"
              className="text-danger hover:border-danger hover:text-danger"
              onClick={() => setDialogBatalBuka(true)}
              disabled={sedangProses}
            >
              <Ban className="mr-1.5 size-4" />
              Batalkan WO
            </Button>
          )}
        </>
      )}

      {/* 4. Status Selesai (Pemeriksaan QC) */}
      {status === "selesai" && isTimWO && (
        <>
          <Button
            variant="outline"
            size="sm"
            className="text-danger hover:border-danger hover:text-danger"
            onClick={() => setDialogQcGagalBuka(true)}
            disabled={sedangProses}
          >
            <XCircle className="mr-1.5 size-4" />
            QC Gagal
          </Button>

          <Button
            size="sm"
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => eksekusiUbahStatus("siap_diambil")}
            disabled={sedangProses}
          >
            <CheckCircle className="mr-1.5 size-4" />
            QC Lulus (Siap Diambil)
          </Button>
        </>
      )}

      {/* 5. Status Siap Diambil (Penyerahan Mobil) */}
      {status === "siap_diambil" && isAdminOrOwner && (
        <Button
          size="sm"
          className="bg-emerald-700 text-white hover:bg-emerald-800"
          onClick={() => setDialogSerahkanBuka(true)}
          disabled={sedangProses}
        >
          <KeyRound className="mr-1.5 size-4" />
          Serahkan Mobil
        </Button>
      )}

      {/* ================= DIALOG BATALKAN WO ================= */}
      <Dialog open={dialogBatalBuka} onOpenChange={setDialogBatalBuka}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger">
              <AlertTriangle className="size-5" />
              Batalkan Work Order {nomorWo}
            </DialogTitle>
            <DialogDescription>
              Pembatalan WO akan mengembalikan semua stok spare part yang sudah tercatat ke inventory bengkel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="alasanBatal">Alasan Pembatalan *</Label>
            <Textarea
              id="alasanBatal"
              rows={3}
              placeholder="Contoh: Pelanggan membatalkan servis karena spare part khusus inden lama."
              value={alasanBatal}
              onChange={(e) => setAlasanBatal(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogBatalBuka(false)} disabled={sedangProses}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => eksekusiUbahStatus("dibatalkan", alasanBatal)}
              disabled={!alasanBatal.trim() || sedangProses}
            >
              {sedangProses ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Konfirmasi Batal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= DIALOG TUNDA PENGERJAAN ================= */}
      <Dialog open={dialogTundaBuka} onOpenChange={setDialogTundaBuka}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning">
              <Clock className="size-5" />
              Tunda Pengerjaan Work Order
            </DialogTitle>
            <DialogDescription>
              Tuliskan alasan penundaan pengerjaan (misalnya menunggu suku cadang dikirim atau persetujuan biaya tambahan).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="catatanTunda">Catatan Penundaan *</Label>
            <Textarea
              id="catatanTunda"
              rows={3}
              placeholder="Contoh: Menunggu stok kampas rem dikirim dari supplier."
              value={catatanTunda}
              onChange={(e) => setCatatanTunda(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogTundaBuka(false)} disabled={sedangProses}>
              Batal
            </Button>
            <Button
              onClick={() => eksekusiUbahStatus("tertunda", catatanTunda)}
              disabled={!catatanTunda.trim() || sedangProses}
            >
              {sedangProses ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Simpan Penundaan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= DIALOG QC GAGAL ================= */}
      <Dialog open={dialogQcGagalBuka} onOpenChange={setDialogQcGagalBuka}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger">
              <XCircle className="size-5" />
              Pemeriksaan QC Tidak Lulus
            </DialogTitle>
            <DialogDescription>
              Mobil akan dikembalikan ke status &quot;Dikerjakan&quot;. Wajib cantumkan catatan kekurangan yang harus diperbaiki mekanik.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label htmlFor="catatanQc">Catatan Temuan QC *</Label>
            <Textarea
              id="catatanQc"
              rows={3}
              placeholder="Contoh: Rem masih berdecit halus saat kecepatan rendah, perlu dibersihkan kembali."
              value={catatanQcGagal}
              onChange={(e) => setCatatanQcGagal(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogQcGagalBuka(false)} disabled={sedangProses}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={() => eksekusiUbahStatus("dikerjakan", catatanQcGagal)}
              disabled={!catatanQcGagal.trim() || sedangProses}
            >
              {sedangProses ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Kembalikan ke Mekanik
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= DIALOG SERAHKAN MOBIL ================= */}
      <Dialog open={dialogSerahkanBuka} onOpenChange={setDialogSerahkanBuka}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <KeyRound className="size-5" />
              Penyerahan Mobil ke Pelanggan
            </DialogTitle>
            <DialogDescription>
              Syarat penyerahan mobil: invoice berstatus lunas dan minimal 1 foto kondisi akhir mobil terunggah (PRD 7.2).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            {/* Status Pembayaran */}
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status Pembayaran Invoice:</span>
                <span
                  className={`font-semibold uppercase ${
                    statusBayarInvoice === "lunas" ? "text-emerald-600" : "text-danger"
                  }`}
                >
                  {statusBayarInvoice || "Belum Terbit"}
                </span>
              </div>
              {statusBayarInvoice !== "lunas" && (
                <p className="mt-1 text-xs text-danger">
                  Invoice belum lunas. Catat pembayaran di tab Tagihan terlebih dahulu.
                </p>
              )}
            </div>

            {/* Unggah Foto Kondisi Akhir */}
            <div className="space-y-2">
              <Label className="font-semibold">Foto Kondisi Akhir Mobil (1 sampai 4 foto) *</Label>
              <p className="text-xs text-muted-foreground">
                Foto mobil yang bersih dan rapi saat siap diserahkan kepada pelanggan.
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                {previewKondisiAkhir.map((src, i) => (
                  <div key={i} className="relative size-20 overflow-hidden rounded-md border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="Kondisi Akhir" className="size-full object-cover" />
                  </div>
                ))}

                {fotoKondisiAkhir.length < 4 && (
                  <label className="flex size-20 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border hover:bg-muted/50">
                    <Upload className="size-5 text-muted-foreground" />
                    <span className="mt-1 text-[10px] text-muted-foreground">+ Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        const sisa = 4 - fotoKondisiAkhir.length;
                        const dipilih = files.slice(0, sisa);
                        setFotoKondisiAkhir((prev) => [...prev, ...dipilih]);
                        setPreviewKondisiAkhir((prev) => [
                          ...prev,
                          ...dipilih.map((f) => URL.createObjectURL(f)),
                        ]);
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogSerahkanBuka(false)} disabled={sedangProses}>
              Batal
            </Button>
            <Button
              className="bg-emerald-700 text-white hover:bg-emerald-800"
              onClick={handleSerahkanMobil}
              disabled={
                sedangProses ||
                statusBayarInvoice !== "lunas" ||
                (!hasKondisiAkhir && fotoKondisiAkhir.length === 0)
              }
            >
              {sedangProses ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {statusTeks || "Memproses..."}
                </>
              ) : (
                "Konfirmasi Serahkan Mobil"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

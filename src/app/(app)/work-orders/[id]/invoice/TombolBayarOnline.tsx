"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  Mail,
  Pencil,
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
import { formatTanggalWaktu } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface TombolBayarOnlineProps {
  invoiceId: string;
  initialStatusBayar: string;
  initialDibayarAt?: string | null;
  customerId?: string | null;
  customerNama?: string;
  customerEmail?: string | null;
}

export function TombolBayarOnline({
  invoiceId,
  initialStatusBayar,
  initialDibayarAt,
  customerId,
  customerNama = "Pelanggan",
  customerEmail,
}: TombolBayarOnlineProps) {
  const router = useRouter();
  const [statusBayar, setStatusBayar] = useState(initialStatusBayar);
  const [waktuDibayar, setWaktuDibayar] = useState<string | null>(initialDibayarAt ?? null);
  const [sedangMembuat, setSedangMembuat] = useState(false);
  const [sedangPolling, setSedangPolling] = useState(false);
  const [detikBerjalan, setDetikBerjalan] = useState(0);
  const [dialogEmailTerbuka, setDialogEmailTerbuka] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Bersihkan timer saat unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const mulaiPolling = () => {
    // Bersihkan timer lama jika ada
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setSedangPolling(true);
    setDetikBerjalan(0);

    const supabase = createClient();
    const intervalWaktuMulai = Date.now();

    // Jalankan pemeriksaan status invoice setiap 5 detik
    intervalRef.current = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from("invoices")
          .select("status_bayar, dibayar_online_at")
          .eq("id", invoiceId)
          .maybeSingle();

        if (error) {
          return;
        }

        if (data && data.status_bayar === "lunas") {
          // Berhasil lunas!
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          setSedangPolling(false);
          setStatusBayar("lunas");
          const waktuSelesai = data.dibayar_online_at || new Date().toISOString();
          setWaktuDibayar(waktuSelesai);
          toast.success("Pembayaran berhasil diverifikasi! Invoice telah Lunas.");
          router.refresh();
        } else {
          const selisihDetik = Math.floor((Date.now() - intervalWaktuMulai) / 1000);
          setDetikBerjalan(selisihDetik);
        }
      } catch {
        // Abaikan error jaringan sementara saat polling
      }
    }, 5000);

    // Hentikan otomatis setelah 5 menit (300.000 ms)
    timeoutRef.current = setTimeout(() => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setSedangPolling(false);
      toast.info(
        "Pemeriksaan status otomatis telah selesai (5 menit). Silakan klik Bayar Online lagi jika perlu memeriksa ulang."
      );
    }, 300000);
  };

  const tanganiBayarOnline = async () => {
    // 1. Validasi awal di client: apakah email pelanggan kosong?
    if (!customerEmail || !customerEmail.trim()) {
      setDialogEmailTerbuka(true);
      toast.warning("Email pelanggan belum diisi. Pembayaran online Mayar memerlukan alamat email.");
      return;
    }

    try {
      setSedangMembuat(true);
      const res = await fetch("/api/pembayaran/buat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: invoiceId }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Jika server menolak karena email kosong, buka dialog panduan
        if (data.code === "EMAIL_KOSONG") {
          setDialogEmailTerbuka(true);
          return;
        }
        throw new Error(data.error || "Gagal membuat tautan pembayaran Mayar.");
      }

      if (data.link) {
        window.open(data.link, "_blank", "noopener,noreferrer");
        toast.success("Tautan pembayaran Mayar dibuka di tab baru.");
        mulaiPolling();
      } else {
        throw new Error("Tautan pembayaran tidak ditemukan di respon server.");
      }
    } catch (err: unknown) {
      toast.error(
        (err as Error).message || "Terjadi kesalahan saat memproses pembayaran online."
      );
    } finally {
      setSedangMembuat(false);
    }
  };

  // Saat sudah lunas, tampilkan label Lunas dan waktu dibayar
  if (statusBayar === "lunas") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-success/10 border border-success/30 px-3 py-1.5 text-success">
        <CheckCircle2 className="size-4 shrink-0 text-success" />
        <div className="text-xs">
          <span className="font-bold">LUNAS</span>
          {waktuDibayar && (
            <span className="ml-1.5 opacity-90">
              ({formatTanggalWaktu(waktuDibayar)})
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {sedangPolling ? (
          <Button
            variant="outline"
            size="sm"
            disabled
            className="gap-2 border-primary/40 bg-primary/5 text-primary text-xs"
          >
            <Loader2 className="size-3.5 animate-spin" />
            <span>Memeriksa status ({detikBerjalan}s / 300s)...</span>
          </Button>
        ) : (
          <Button
            onClick={tanganiBayarOnline}
            disabled={sedangMembuat}
            size="sm"
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            {sedangMembuat ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Membuat Tautan...
              </>
            ) : (
              <>
                <CreditCard className="size-4" />
                Bayar Online
                <ExternalLink className="size-3.5 opacity-70" />
              </>
            )}
          </Button>
        )}
      </div>

      {/* Dialog Panduan Lengkapi Email Pelanggan */}
      <Dialog open={dialogEmailTerbuka} onOpenChange={setDialogEmailTerbuka}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Mail className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">
                  Email Pelanggan Belum Terdaftar
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Pembayaran online Mayar memerlukan alamat email yang valid.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs text-text-muted leading-relaxed">
            <p>
              Gateway pembayaran Mayar mewajibkan alamat email pelanggan untuk pengiriman
              invoice digital, notifikasi tagihan, serta tanda terima pembayaran.
            </p>
            <div className="rounded-lg border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300">
                <AlertCircle className="size-3.5" />
                <span>Pelanggan: {customerNama}</span>
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                Saat ini data email untuk pelanggan ini masih kosong di database.
              </p>
            </div>
            <p>
              Silakan lengkapi data email pelanggan di menu <strong>Pelanggan</strong> melalui tombol di bawah ini. Setelah diperbarui, Anda dapat langsung kembali ke invoice ini dan menekan <strong>Bayar Online</strong>.
            </p>
          </div>

          <DialogFooter className="flex flex-row justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDialogEmailTerbuka(false)}
            >
              Tutup
            </Button>
            {customerId && (
              <Link
                href={`/pelanggan/${customerId}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setDialogEmailTerbuka(false)}
              >
                <Button size="sm" className="gap-2 bg-primary text-primary-foreground">
                  <Pencil className="size-4" />
                  Lengkapi Data Pelanggan
                  <ExternalLink className="size-3.5 opacity-70" />
                </Button>
              </Link>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

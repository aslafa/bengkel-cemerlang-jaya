"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Loader2, PlayCircle, Star, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tanggal } from "@/lib/format";
import type { Peran } from "@/lib/peran";
import { createClient } from "@/lib/supabase/client";

interface MekanikItem {
  id: string;
  nama: string;
  bebanAktif: number;
}

interface Props {
  woId: string;
  statusWo: string;
  kepalaMekanikId: string;
  estimasiSelesai: string | null;
  mekanikDitugaskan: { id: string; nama: string }[];
  mekanikTim: MekanikItem[];
  profil: { id: string; nama: string; peran: Peran };
}

export function FormPenugasanWO({
  woId,
  statusWo,
  kepalaMekanikId,
  estimasiSelesai,
  mekanikDitugaskan,
  mekanikTim,
  profil,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const isTimWO =
    profil.peran === "owner" ||
    (profil.peran === "kepala_mekanik" && kepalaMekanikId === profil.id);

  const [mekanikDipilih, setMekanikDipilih] = useState<string[]>(
    mekanikDitugaskan.map((m) => m.id),
  );
  const [estimasi, setEstimasi] = useState<string>(
    estimasiSelesai ?? new Date().toISOString().slice(0, 10),
  );
  const [sedangSimpan, setSedangSimpan] = useState(false);
  const [pesanError, setPesanError] = useState("");

  const toggleMekanik = (id: string) => {
    if (mekanikDipilih.includes(id)) {
      setMekanikDipilih((prev) => prev.filter((m) => m !== id));
    } else {
      if (mekanikDipilih.length >= 3) {
        setPesanError("Maksimal 3 mekanik yang dapat ditugaskan untuk satu Work Order");
        return;
      }
      setPesanError("");
      setMekanikDipilih((prev) => [...prev, id]);
    }
  };

  const handleMulaiKerjakan = async () => {
    if (mekanikDipilih.length === 0) {
      setPesanError("Pilih minimal 1 mekanik untuk pengerjaan");
      return;
    }
    if (!estimasi) {
      setPesanError("Tanggal estimasi selesai wajib diisi");
      return;
    }

    setSedangSimpan(true);
    setPesanError("");

    try {
      // 1. Simpan penugasan mekanik & estimasi
      const { error: errTugas } = await supabase.rpc("tugaskan_mekanik", {
        p_wo: woId,
        p_mekanik: mekanikDipilih,
        p_estimasi: estimasi,
      });
      if (errTugas) throw errTugas;

      // 2. Ubah status menjadi dikerjakan
      const { error: errStatus } = await supabase.rpc("ubah_status_wo", {
        p_wo: woId,
        p_status: "dikerjakan",
        p_catatan: "Pengerjaan dimulai",
      });
      if (errStatus) throw errStatus;

      router.refresh();
    } catch (err: unknown) {
      setPesanError(err instanceof Error ? err.message : "Gagal memulai pengerjaan");
    } finally {
      setSedangSimpan(false);
    }
  };

  const hariIni = new Date().toISOString().slice(0, 10);

  // Jika WO sudah bukan menunggu, tampilkan daftar penugasan (read-only)
  if (statusWo !== "menunggu") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            Bagian B. Penugasan Mekanik
          </CardTitle>
          <CardDescription>Tim mekanik yang menangani pengerjaan mobil ini.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Mekanik Bertugas:
              </p>
              {mekanikDitugaskan.length === 0 ? (
                <p className="mt-1 text-sm text-muted-foreground italic">Belum ada mekanik yang ditugaskan.</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {mekanikDitugaskan.map((m) => (
                    <Badge key={m.id} variant="secondary" className="px-3 py-1 font-medium">
                      {m.nama}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Estimasi Selesai:
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium">
                <Calendar className="size-4 text-muted-foreground" />
                <span>{estimasiSelesai ? tanggal(estimasiSelesai) : "Belum ditentukan"}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Jika WO menunggu dan pengguna adalah Kepala Mekanik tim atau Owner
  if (isTimWO) {
    // Urutkan mekanik tim dari beban teringan (PRD 6.8: "Daftar diurutkan dari beban paling ringan")
    const urutkanMekanik = [...mekanikTim].sort((a, b) => a.bebanAktif - b.bebanAktif);
    const bebanTerkecil = urutkanMekanik[0]?.bebanAktif ?? 0;

    return (
      <Card className="border-primary/40 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Users className="size-5" />
            Bagian B. Penugasan & Mulai Pengerjaan
          </CardTitle>
          <CardDescription>
            Pilih 1 sampai 3 mekanik dari timmu dan tentukan tanggal estimasi selesai pengerjaan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {pesanError && (
            <div className="rounded-md border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
              {pesanError}
            </div>
          )}

          {/* Pemilihan Mekanik */}
          <div className="space-y-3">
            <Label className="font-semibold">Pilih Mekanik (1 - 3 orang) *</Label>
            {urutkanMekanik.length === 0 ? (
              <p className="text-xs text-muted-foreground">Tidak ada mekanik aktif di tim ini.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {urutkanMekanik.map((m) => {
                  const terpilih = mekanikDipilih.includes(m.id);
                  const disarankan = m.bebanAktif === bebanTerkecil;

                  return (
                    <div
                      key={m.id}
                      onClick={() => toggleMekanik(m.id)}
                      className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-colors ${
                        terpilih
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Checkbox checked={terpilih} onCheckedChange={() => toggleMekanik(m.id)} />
                        <div>
                          <p className="text-sm font-medium leading-none text-text">{m.nama}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {m.bebanAktif} WO aktif
                          </p>
                        </div>
                      </div>

                      {disarankan && (
                        <Badge
                          variant="secondary"
                          className="gap-1 border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-600 dark:text-amber-400"
                        >
                          <Star className="size-3 fill-amber-500 text-amber-500" />
                          Disarankan
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Estimasi Selesai */}
          <div className="max-w-xs space-y-2">
            <Label htmlFor="estimasi">Tanggal Estimasi Selesai *</Label>
            <Input
              id="estimasi"
              type="date"
              min={hariIni}
              value={estimasi}
              onChange={(e) => setEstimasi(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end">
            <Button
              onClick={handleMulaiKerjakan}
              disabled={sedangSimpan || mekanikDipilih.length === 0 || !estimasi}
              className="bg-primary font-semibold"
            >
              {sedangSimpan ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Menyimpan & Memulai...
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 size-4" />
                  Mulai Kerjakan
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Jika pengguna adalah Admin, Admin melihat status menunggu penugasan tim
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-5 text-primary" />
          Bagian B. Penugasan Mekanik
        </CardTitle>
        <CardDescription>
          Menunggu Kepala Mekanik tim menunjuk mekanik pelaksana dan tanggal estimasi selesai.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Penugasan mekanik akan dilakukan oleh Kepala Mekanik tim yang ditunjuk saat pengerjaan dimulai.
        </p>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Car,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { unggahFotoDanThumbnail } from "@/lib/kompres-foto";
import { createClient } from "@/lib/supabase/client";

interface TimInfo {
  id: string;
  nama: string;
  beban: number;
}

interface PelangganData {
  id?: string;
  tipe: "perorangan" | "perusahaan";
  nama: string;
  telepon: string;
  email?: string;
  alamat?: string;
}

interface KendaraanData {
  id?: string;
  plat: string;
  merek_model: string;
  tahun: number;
  warna: string;
  transmisi: "AT" | "MT";
  customer_id?: string;
}

export function FormWorkOrderBaru({ daftarTim }: { daftarTim: TimInfo[] }) {
  const router = useRouter();
  const supabase = createClient();

  // Step 1: Kendaraan & Pelanggan
  const [platInput, setPlatInput] = useState("");
  const [sedangCariPlat, setSedangCariPlat] = useState(false);
  const [statusPlat, setStatusPlat] = useState<"belum_cek" | "ditemukan" | "baru">("belum_cek");

  const [kendaraan, setKendaraan] = useState<KendaraanData>({
    plat: "",
    merek_model: "",
    tahun: new Date().getFullYear(),
    warna: "",
    transmisi: "AT",
  });

  const [pelanggan, setPelanggan] = useState<PelangganData>({
    tipe: "perorangan",
    nama: "",
    telepon: "",
    email: "",
    alamat: "",
  });

  // Opsi cari pelanggan lama berdasarkan telepon jika plat baru
  const [cariTelepon, setCariTelepon] = useState("");
  const [sedangCariTelepon, setSedangCariTelepon] = useState(false);
  const [pesanTelepon, setPesanTelepon] = useState("");

  // Step 2: Data Masuk WO
  const [odometer, setOdometer] = useState<string>("");
  const [keluhan, setKeluhan] = useState("");
  const [kepalaMekanikId, setKepalaMekanikId] = useState(daftarTim[0]?.id ?? "");

  // Foto (File asli yang akan dikompresi sebelum unggah)
  const [fotoStnk, setFotoStnk] = useState<File | null>(null);
  const [previewStnk, setPreviewStnk] = useState<string | null>(null);

  const [fotoKondisiAwal, setFotoKondisiAwal] = useState<File[]>([]);
  const [previewKondisiAwal, setPreviewKondisiAwal] = useState<string[]>([]);

  // Status proses simpan
  const [sedangSimpan, setSedangSimpan] = useState(false);
  const [statusTeks, setStatusTeks] = useState("");
  const [pesanError, setPesanError] = useState("");

  // Format plat rapi otomatis
  const rapikanPlat = (raw: string) => raw.toUpperCase().replace(/\s+/g, " ").trim();

  // Cari plat di database
  const handleCariPlat = async () => {
    const platBersih = rapikanPlat(platInput);
    if (!platBersih) return;

    setSedangCariPlat(true);
    setPesanError("");
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, plat, merek_model, tahun, warna, transmisi, customer_id, customers(*)")
        .ilike("plat", platBersih)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setStatusPlat("ditemukan");
        setKendaraan({
          id: data.id,
          plat: data.plat,
          merek_model: data.merek_model,
          tahun: data.tahun ?? new Date().getFullYear(),
          warna: data.warna ?? "",
          transmisi: (data.transmisi as "AT" | "MT") ?? "AT",
          customer_id: data.customer_id,
        });

        const cust = data.customers as unknown as PelangganData | null;
        if (cust) {
          setPelanggan({
            id: cust.id,
            tipe: cust.tipe ?? "perorangan",
            nama: cust.nama,
            telepon: cust.telepon,
            email: cust.email ?? "",
            alamat: cust.alamat ?? "",
          });
        }
      } else {
        setStatusPlat("baru");
        setKendaraan((prev) => ({ ...prev, plat: platBersih }));
      }
    } catch (err: unknown) {
      setPesanError(err instanceof Error ? err.message : "Gagal mencari data plat");
    } finally {
      setSedangCariPlat(false);
    }
  };

  // Cari pelanggan berdasarkan telepon
  const handleCariTelepon = async () => {
    const telpBersih = cariTelepon.replace(/\D/g, "");
    if (telpBersih.length < 10) {
      setPesanTelepon("Nomor telepon minimal 10 digit.");
      return;
    }

    setSedangCariTelepon(true);
    setPesanTelepon("");
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, tipe, nama, telepon, email, alamat")
        .eq("telepon", telpBersih)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPelanggan({
          id: data.id,
          tipe: data.tipe as "perorangan" | "perusahaan",
          nama: data.nama,
          telepon: data.telepon,
          email: data.email ?? "",
          alamat: data.alamat ?? "",
        });
        setPesanTelepon(`Ditemukan: ${data.nama}`);
      } else {
        setPesanTelepon("Pelanggan tidak ditemukan, silakan isi data baru.");
        setPelanggan((prev) => ({ ...prev, id: undefined, telepon: telpBersih }));
      }
    } catch (err: unknown) {
      setPesanTelepon(err instanceof Error ? err.message : "Gagal mencari pelanggan");
    } finally {
      setSedangCariTelepon(false);
    }
  };

  // Handler Foto STNK
  const handlePilihStnk = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoStnk(file);
    setPreviewStnk(URL.createObjectURL(file));
  };

  // Handler Foto Kondisi Awal (1 - 6 foto)
  const handlePilihKondisiAwal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const sisaSlot = 6 - fotoKondisiAwal.length;
    const fileDipilih = files.slice(0, sisaSlot);

    const newFiles = [...fotoKondisiAwal, ...fileDipilih];
    setFotoKondisiAwal(newFiles);

    const newPreviews = fileDipilih.map((f) => URL.createObjectURL(f));
    setPreviewKondisiAwal((prev) => [...prev, ...newPreviews]);
  };

  const hapusKondisiAwal = (index: number) => {
    setFotoKondisiAwal((prev) => prev.filter((_, i) => i !== index));
    setPreviewKondisiAwal((prev) => prev.filter((_, i) => i !== index));
  };

  // Validasi form lengkap (PRD 6.7)
  const platValid = kendaraan.plat.trim().length > 0;
  const pelangganValid = pelanggan.nama.trim().length > 0 && pelanggan.telepon.trim().length >= 10;
  const kendaraanValid = kendaraan.merek_model.trim().length > 0 && kendaraan.tahun >= 1980;
  const odometerAngka = Number(odometer);
  const odometerValid = odometer.trim() !== "" && !isNaN(odometerAngka) && odometerAngka >= 0;
  const keluhanValid = keluhan.trim().length > 0;
  const timValid = kepalaMekanikId.trim().length > 0;
  const stnkValid = fotoStnk !== null;
  const kondisiAwalValid = fotoKondisiAwal.length >= 1 && fotoKondisiAwal.length <= 6;

  const formSiapKirim =
    platValid &&
    pelangganValid &&
    kendaraanValid &&
    odometerValid &&
    keluhanValid &&
    timValid &&
    stnkValid &&
    kondisiAwalValid;

  // Rincian bagian yang belum lengkap
  const pesanBelumLengkap: string[] = [];
  if (statusPlat === "belum_cek") pesanBelumLengkap.push("Cek plat nomor");
  if (!platValid) pesanBelumLengkap.push("Plat nomor kendaraan");
  if (!pelangganValid) pesanBelumLengkap.push("Data pelanggan (nama dan telepon valid)");
  if (!kendaraanValid) pesanBelumLengkap.push("Data kendaraan (merek/model)");
  if (!odometerValid) pesanBelumLengkap.push("Odometer (angka ≥ 0)");
  if (!keluhanValid) pesanBelumLengkap.push("Keluhan kendaraan");
  if (!timValid) pesanBelumLengkap.push("Pilih Tim Kepala Mekanik");
  if (!stnkValid) pesanBelumLengkap.push("Foto STNK (1 foto wajib)");
  if (!kondisiAwalValid) pesanBelumLengkap.push("Foto kondisi awal (minimal 1 foto)");

  // Proses Simpan WO
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSiapKirim || sedangSimpan) return;

    setSedangSimpan(true);
    setPesanError("");

    try {
      let customerId = pelanggan.id;
      let vehicleId = kendaraan.id;

      // 1. Simpan Pelanggan baru jika belum ada
      if (!customerId) {
        setStatusTeks("Menyimpan data pelanggan...");
        const { data: newCust, error: errCust } = await supabase
          .from("customers")
          .insert({
            tipe: pelanggan.tipe,
            nama: pelanggan.nama.trim(),
            telepon: pelanggan.telepon.replace(/\D/g, ""),
            email: pelanggan.email?.trim() || null,
            alamat: pelanggan.alamat?.trim() || null,
          })
          .select("id")
          .single();

        if (errCust) throw new Error(`Gagal menyimpan pelanggan: ${errCust.message}`);
        customerId = newCust.id;
      }

      // 2. Simpan Kendaraan baru jika belum ada
      if (!vehicleId) {
        setStatusTeks("Menyimpan data kendaraan...");
        const { data: newVeh, error: errVeh } = await supabase
          .from("vehicles")
          .insert({
            customer_id: customerId,
            plat: rapikanPlat(kendaraan.plat),
            merek_model: kendaraan.merek_model.trim(),
            tahun: kendaraan.tahun,
            warna: kendaraan.warna?.trim() || null,
            transmisi: kendaraan.transmisi,
          })
          .select("id")
          .single();

        if (errVeh) throw new Error(`Gagal menyimpan kendaraan: ${errVeh.message}`);
        vehicleId = newVeh.id;
      }

      // 3. Panggil RPC buat_work_order
      setStatusTeks("Membuat Work Order...");
      const { data: woId, error: errWo } = await supabase.rpc("buat_work_order", {
        p_vehicle_id: vehicleId,
        p_kepala_mekanik_id: kepalaMekanikId,
        p_odometer: odometerAngka,
        p_keluhan: keluhan.trim(),
      });

      if (errWo) throw new Error(`Gagal membuat Work Order: ${errWo.message}`);
      if (!woId) throw new Error("ID Work Order tidak diterima dari sistem");

      // 4. Kompresi dan Unggah Foto STNK (WebP 1600 px + thumb 320 px)
      setStatusTeks("Mengompresi dan mengunggah foto STNK...");
      const { path: pathStnk } = await unggahFotoDanThumbnail(supabase, woId, "stnk", fotoStnk!);

      const { error: errPhotoStnk } = await supabase.from("work_order_photos").insert({
        work_order_id: woId,
        jenis: "stnk",
        path: pathStnk,
      });
      if (errPhotoStnk) throw new Error(`Gagal mencatat foto STNK: ${errPhotoStnk.message}`);

      // 5. Kompresi dan Unggah Foto Kondisi Awal
      for (let i = 0; i < fotoKondisiAwal.length; i++) {
        setStatusTeks(`Mengunggah foto kondisi awal (${i + 1}/${fotoKondisiAwal.length})...`);
        const { path: pathKondisi } = await unggahFotoDanThumbnail(
          supabase,
          woId,
          "kondisi_awal",
          fotoKondisiAwal[i],
        );

        const { error: errPhotoKondisi } = await supabase.from("work_order_photos").insert({
          work_order_id: woId,
          jenis: "kondisi_awal",
          path: pathKondisi,
        });
        if (errPhotoKondisi) {
          throw new Error(`Gagal mencatat foto kondisi awal ke-${i + 1}: ${errPhotoKondisi.message}`);
        }
      }

      // 6. Sukses, alihkan ke halaman rincian WO
      setStatusTeks("Selesai! Mengalihkan ke rincian WO...");
      router.push(`/work-orders/${woId}`);
      router.refresh();
    } catch (err: unknown) {
      setPesanError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan Work Order");
      setSedangSimpan(false);
      setStatusTeks("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {pesanError && (
        <div className="rounded-lg border border-danger/50 bg-danger/10 p-4 text-sm text-danger">
          {pesanError}
        </div>
      )}

      {/* Bagian 1: Cari Plat & Data Pelanggan / Kendaraan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="size-5 text-primary" />
            1. Data Kendaraan dan Pelanggan
          </CardTitle>
          <CardDescription>
            Masukkan plat nomor mobil. Jika sudah pernah servis, data mobil dan pelanggan otomatis terisi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Plat Nomor */}
          <div className="flex max-w-md items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="platInput">Plat Nomor *</Label>
              <Input
                id="platInput"
                placeholder="Contoh: B 1234 ABC"
                value={platInput}
                onChange={(e) => setPlatInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCariPlat();
                  }
                }}
                disabled={statusPlat === "ditemukan"}
                className="font-mono text-base uppercase font-semibold"
              />
            </div>
            {statusPlat !== "ditemukan" ? (
              <Button
                type="button"
                onClick={handleCariPlat}
                disabled={!platInput.trim() || sedangCariPlat}
              >
                {sedangCariPlat ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
                Cek Plat
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStatusPlat("belum_cek");
                  setKendaraan({
                    plat: "",
                    merek_model: "",
                    tahun: new Date().getFullYear(),
                    warna: "",
                    transmisi: "AT",
                  });
                  setPelanggan({
                    tipe: "perorangan",
                    nama: "",
                    telepon: "",
                    email: "",
                    alamat: "",
                  });
                }}
              >
                Ubah Plat
              </Button>
            )}
          </div>

          {/* Kondisi 1: Plat Ditemukan (Dikunci) */}
          {statusPlat === "ditemukan" && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
              <div className="flex items-center gap-2 font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-5" />
                Plat terdaftar: {kendaraan.plat} ({kendaraan.merek_model}) atas nama {pelanggan.nama}
              </div>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-text">Data Kendaraan:</p>
                  <p>Merek/Model: {kendaraan.merek_model}</p>
                  <p>Tahun: {kendaraan.tahun} · Warna: {kendaraan.warna || "-"} · Transmisi: {kendaraan.transmisi}</p>
                </div>
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-text">Data Pelanggan:</p>
                  <p>Nama: {pelanggan.nama} ({pelanggan.tipe})</p>
                  <p>Telepon: {pelanggan.telepon} {pelanggan.email ? `· ${pelanggan.email}` : ""}</p>
                  <p>Alamat: {pelanggan.alamat || "-"}</p>
                </div>
              </div>
            </div>
          )}

          {/* Kondisi 2: Plat Belum Terdaftar */}
          {statusPlat === "baru" && (
            <div className="space-y-6 rounded-lg border border-warning/40 bg-warning/5 p-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="border-warning text-warning">
                  Plat Baru: {kendaraan.plat}
                </Badge>
                <p className="text-xs text-muted-foreground">Isi data mobil dan pelanggan di bawah</p>
              </div>

              {/* Form Kendaraan Baru */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Merek dan Model *</Label>
                  <Input
                    placeholder="Contoh: Toyota Avanza 1.3 G"
                    value={kendaraan.merek_model}
                    onChange={(e) => setKendaraan({ ...kendaraan, merek_model: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tahun</Label>
                  <Input
                    type="number"
                    min={1980}
                    max={new Date().getFullYear() + 1}
                    value={kendaraan.tahun}
                    onChange={(e) => setKendaraan({ ...kendaraan, tahun: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Warna</Label>
                  <Input
                    placeholder="Hitam / Putih / Silver"
                    value={kendaraan.warna}
                    onChange={(e) => setKendaraan({ ...kendaraan, warna: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Transmisi</Label>
                  <Select
                    value={kendaraan.transmisi}
                    onValueChange={(val: string) =>
                      setKendaraan({ ...kendaraan, transmisi: val as "AT" | "MT" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AT">Otomatis (AT)</SelectItem>
                      <SelectItem value="MT">Manual (MT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Form Pelanggan */}
              <div className="border-t border-border pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
                  <h4 className="font-semibold text-text">Data Pemilik Mobil</h4>
                  {/* Opsi pencarian pelanggan lama via telepon */}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Cari telepon pelanggan lama..."
                      value={cariTelepon}
                      onChange={(e) => setCariTelepon(e.target.value)}
                      className="h-8 w-56 text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleCariTelepon}
                      disabled={sedangCariTelepon}
                    >
                      {sedangCariTelepon ? <Loader2 className="size-3 animate-spin" /> : "Cari"}
                    </Button>
                  </div>
                </div>
                {pesanTelepon && <p className="mb-3 text-xs text-primary">{pesanTelepon}</p>}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nama Pelanggan *</Label>
                    <Input
                      placeholder="Nama lengkap"
                      value={pelanggan.nama}
                      onChange={(e) => setPelanggan({ ...pelanggan, nama: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nomor Telepon (WhatsApp) *</Label>
                    <Input
                      placeholder="Contoh: 081234567890 (10-14 digit)"
                      value={pelanggan.telepon}
                      onChange={(e) => setPelanggan({ ...pelanggan, telepon: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipe Pelanggan</Label>
                    <Select
                      value={pelanggan.tipe}
                      onValueChange={(val: string) =>
                        setPelanggan({
                          ...pelanggan,
                          tipe: val as "perorangan" | "perusahaan",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="perorangan">Perorangan</SelectItem>
                        <SelectItem value="perusahaan">Perusahaan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="nama@email.com (opsional)"
                      value={pelanggan.email}
                      onChange={(e) => setPelanggan({ ...pelanggan, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Alamat</Label>
                    <Input
                      placeholder="Alamat domisili pelanggan"
                      value={pelanggan.alamat}
                      onChange={(e) => setPelanggan({ ...pelanggan, alamat: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bagian 2: Data Masuk Work Order */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            2. Data Masuk Work Order
          </CardTitle>
          <CardDescription>
            Isi keluhan kendaraan, kilometer odometer, dan tentukan tim kepala mekanik yang menangani.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="odometer">Kilometer Odometer *</Label>
              <Input
                id="odometer"
                type="number"
                min={0}
                placeholder="Contoh: 45000"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Catat angka km yang tertera di speedometer mobil saat datang.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tim">Tim Kepala Mekanik *</Label>
              <Select value={kepalaMekanikId} onValueChange={setKepalaMekanikId}>
                <SelectTrigger id="tim">
                  <SelectValue placeholder="Pilih Tim Mekanik" />
                </SelectTrigger>
                <SelectContent>
                  {daftarTim.map((tim) => (
                    <SelectItem key={tim.id} value={tim.id}>
                      Tim {tim.nama} ({tim.beban} WO aktif)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Pilih tim yang akan menangani pengerjaan mobil ini.</p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="keluhan">Keluhan Mobil *</Label>
              <Textarea
                id="keluhan"
                rows={3}
                placeholder="Contoh: Rem bunyi berdecit saat diinjak, tarikan mesin agak tersendat saat tanjakan."
                value={keluhan}
                onChange={(e) => setKeluhan(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bagian 3: Foto STNK & Foto Kondisi Awal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="size-5 text-primary" />
            3. Dokumentasi Foto Masuk (Wajib)
          </CardTitle>
          <CardDescription>
            Foto akan diperkecil otomatis (maks 1600 px WebP) dan disimpan di bucket privat.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Foto STNK (1 Foto Wajib) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Foto STNK * (1 Foto)</Label>
              {fotoStnk && (
                <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                  Foto STNK Terlampir
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {previewStnk ? (
                <div className="group relative size-36 overflow-hidden rounded-lg border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewStnk} alt="Preview STNK" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setFotoStnk(null);
                      setPreviewStnk(null);
                    }}
                    className="absolute right-1 top-1 rounded-md bg-black/70 p-1 text-white hover:bg-black"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ) : (
                <label className="flex size-36 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border hover:bg-muted/50">
                  <Upload className="size-6 text-muted-foreground" />
                  <span className="mt-2 text-xs font-medium text-muted-foreground">Pilih STNK</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePilihStnk}
                  />
                </label>
              )}
              <p className="max-w-xs text-xs text-muted-foreground">
                Foto STNK sebagai verifikasi identitas pemilik dan masa berlaku pajak kendaraan.
              </p>
            </div>
          </div>

          {/* Foto Kondisi Awal (1 - 6 Foto Wajib) */}
          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-semibold">Foto Kondisi Awal Mobil * (1 sampai 6 foto)</Label>
                <p className="text-xs text-muted-foreground">
                  Foto bodi sekeliling, interior, atau bagian lecet sebelum dikerjakan.
                </p>
              </div>
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                {fotoKondisiAwal.length} / 6 foto
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
              {previewKondisiAwal.map((src, idx) => (
                <div key={idx} className="group relative aspect-square overflow-hidden rounded-lg border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Kondisi Awal ${idx + 1}`} className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => hapusKondisiAwal(idx)}
                    className="absolute right-1 top-1 rounded-md bg-black/70 p-1 text-white hover:bg-black"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}

              {fotoKondisiAwal.length < 6 && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border hover:bg-muted/50">
                  <Plus className="size-6 text-muted-foreground" />
                  <span className="mt-1 text-[11px] font-medium text-muted-foreground">+ Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePilihKondisiAwal}
                  />
                </label>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rangkuman Validasi dan Tombol Simpan */}
      <div className="flex flex-col items-end gap-3">
        {!formSiapKirim && (
          <p className="text-right text-xs text-muted-foreground">
            Lengkapi sebelum menyimpan:{" "}
            <span className="font-medium text-danger">{pesanBelumLengkap.join(", ")}</span>
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={sedangSimpan}
          >
            Batal
          </Button>
          <Button
            type="submit"
            size="lg"
            disabled={!formSiapKirim || sedangSimpan}
            className="min-w-44 font-semibold"
          >
            {sedangSimpan ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {statusTeks || "Menyimpan..."}
              </>
            ) : (
              "Simpan Work Order"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

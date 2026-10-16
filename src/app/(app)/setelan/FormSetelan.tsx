"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ImagePlus, Trash2, Upload, Building2, Store } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { kompresGambar } from "@/lib/kompresi";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

const skemaBengkel = z.object({
  nama: z.string().trim().min(1, "Nama bengkel wajib diisi"),
  telepon: z.string().trim().min(1, "Nomor telepon wajib diisi"),
  alamat: z.string().trim().min(1, "Alamat bengkel wajib diisi"),
  jam_buka: z.string().trim().optional(),
});

type FormBengkelValues = z.infer<typeof skemaBengkel>;

type WorkshopSettings = Tables<"workshop_settings">;

export function FormSetelan({ settings }: { settings: WorkshopSettings }) {
  const router = useRouter();
  const supabase = createClient();

  const [loadingData, setLoadingData] = useState(false);
  const [loadingLogo, setLoadingLogo] = useState(false);
  const [loadingGaleri, setLoadingGaleri] = useState(false);

  const [logoPath, setLogoPath] = useState<string | null>(settings.logo_path);
  const [galeriPaths, setGaleriPaths] = useState<string[]>(settings.galeri_paths ?? []);

  const form = useForm<FormBengkelValues>({
    resolver: zodResolver(skemaBengkel),
    defaultValues: {
      nama: settings.nama ?? "",
      telepon: settings.telepon ?? "",
      alamat: settings.alamat ?? "",
      jam_buka: settings.jam_buka ?? "",
    },
  });

  function getPublicUrl(path: string | null) {
    if (!path) return null;
    return supabase.storage.from("publik").getPublicUrl(path).data.publicUrl;
  }

  // 1. Simpan Informasi Umum Bengkel
  async function simpanInformasi(data: FormBengkelValues) {
    setLoadingData(true);
    try {
      const { error } = await supabase
        .from("workshop_settings")
        .update({
          nama: data.nama,
          telepon: data.telepon,
          alamat: data.alamat,
          jam_buka: data.jam_buka || null,
        })
        .eq("id", 1);

      if (error) throw error;
      toast.success("Informasi bengkel berhasil disimpan");
      router.refresh();
    } catch (err: unknown) {
      const pesan = err instanceof Error ? err.message : "Gagal menyimpan informasi bengkel";
      toast.error(pesan);
    } finally {
      setLoadingData(false);
    }
  }

  // 2. Unggah Logo Baru
  async function unggahLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadingLogo(true);
    try {
      toast.info("Mengompresi logo...");
      const fileTerkompresi = await kompresGambar(file);

      const path = `logo/logo-${Date.now()}.webp`;
      const { error: errUpload } = await supabase.storage
        .from("publik")
        .upload(path, fileTerkompresi, {
          cacheControl: "31536000",
          upsert: true,
          contentType: "image/webp",
        });

      if (errUpload) throw errUpload;

      const { error: errDb } = await supabase
        .from("workshop_settings")
        .update({ logo_path: path })
        .eq("id", 1);

      if (errDb) throw errDb;

      setLogoPath(path);
      toast.success("Logo bengkel berhasil diperbarui");
      router.refresh();
    } catch (err: unknown) {
      const pesan = err instanceof Error ? err.message : "Gagal mengunggah logo bengkel";
      toast.error(pesan);
    } finally {
      setLoadingLogo(false);
      e.target.value = "";
    }
  }

  // 3. Hapus Logo
  async function hapusLogo() {
    setLoadingLogo(true);
    try {
      const { error } = await supabase
        .from("workshop_settings")
        .update({ logo_path: null })
        .eq("id", 1);

      if (error) throw error;

      setLogoPath(null);
      toast.success("Logo berhasil dihapus");
      router.refresh();
    } catch (err: unknown) {
      const pesan = err instanceof Error ? err.message : "Gagal menghapus logo";
      toast.error(pesan);
    } finally {
      setLoadingLogo(false);
    }
  }

  // 4. Tambah Foto Galeri
  async function tambahFotoGaleri(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (galeriPaths.length >= 6) {
      toast.error("Maksimal 6 foto galeri telah tercapai");
      e.target.value = "";
      return;
    }

    setLoadingGaleri(true);
    try {
      toast.info("Mengompresi foto...");
      const fileTerkompresi = await kompresGambar(file);

      const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 15);
      const path = `galeri/galeri-${Date.now()}-${cleanName}.webp`;

      const { error: errUpload } = await supabase.storage
        .from("publik")
        .upload(path, fileTerkompresi, {
          cacheControl: "31536000",
          upsert: true,
          contentType: "image/webp",
        });

      if (errUpload) throw errUpload;

      const baru = [...galeriPaths, path];
      const { error: errDb } = await supabase
        .from("workshop_settings")
        .update({ galeri_paths: baru })
        .eq("id", 1);

      if (errDb) throw errDb;

      setGaleriPaths(baru);
      toast.success("Foto galeri berhasil ditambahkan");
      router.refresh();
    } catch (err: unknown) {
      const pesan = err instanceof Error ? err.message : "Gagal menambahkan foto galeri";
      toast.error(pesan);
    } finally {
      setLoadingGaleri(false);
      e.target.value = "";
    }
  }

  // 5. Hapus Foto Galeri
  async function hapusFotoGaleri(index: number) {
    setLoadingGaleri(true);
    try {
      const baru = galeriPaths.filter((_, i) => i !== index);
      const { error } = await supabase
        .from("workshop_settings")
        .update({ galeri_paths: baru })
        .eq("id", 1);

      if (error) throw error;

      setGaleriPaths(baru);
      toast.success("Foto galeri berhasil dihapus");
      router.refresh();
    } catch (err: unknown) {
      const pesan = err instanceof Error ? err.message : "Gagal menghapus foto galeri";
      toast.error(pesan);
    } finally {
      setLoadingGaleri(false);
    }
  }

  const logoUrl = getPublicUrl(logoPath);

  return (
    <div className="space-y-6">
      {/* 1. Informasi Bengkel */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="size-5 text-primary" />
            <CardTitle>Informasi Bengkel</CardTitle>
          </div>
          <CardDescription>
            Nama, alamat, telepon, dan jam operasional bengkel yang ditampilkan pada kop invoice dan halaman publik.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(simpanInformasi)} className="space-y-4">
            <FieldGroup>
              <div className="grid gap-4 md:grid-cols-2">
                <Controller
                  name="nama"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="setelan-nama">Nama Bengkel *</FieldLabel>
                      <Input {...field} id="setelan-nama" placeholder="contoh: Cemerlang Jaya Motor" />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  name="telepon"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="setelan-telepon">Nomor Telepon *</FieldLabel>
                      <Input {...field} id="setelan-telepon" placeholder="contoh: 021-8770 1234" />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </div>

              <Controller
                name="jam_buka"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="setelan-jam">Jam Operasional</FieldLabel>
                    <Input
                      {...field}
                      id="setelan-jam"
                      placeholder="contoh: Senin sampai Sabtu, 08.00 sampai 17.00"
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                name="alamat"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="setelan-alamat">Alamat Lengkap *</FieldLabel>
                    <Textarea
                      {...field}
                      id="setelan-alamat"
                      placeholder="contoh: Jl. Raya Cibubur No. 88, Jakarta Timur"
                      rows={3}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </FieldGroup>

            <Button type="submit" disabled={loadingData}>
              {loadingData ? "Menyimpan..." : "Simpan Informasi"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 2. Logo Bengkel */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Store className="size-5 text-primary" />
            <CardTitle>Logo Bengkel</CardTitle>
          </div>
          <CardDescription>
            Logo disimpan di bucket publik Supabase (`publik/logo/`) dan ditampilkan pada sidebar, halaman depan, dan cetak invoice.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="size-24 rounded-lg border border-border bg-muted/40 flex items-center justify-center overflow-hidden relative shadow-sm">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt="Logo Bengkel"
                  className="size-full object-contain p-2"
                />
              ) : (
                <Store className="size-10 text-muted-foreground/60" />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loadingLogo}
                  asChild
                >
                  <label className="cursor-pointer gap-1.5 flex items-center">
                    <Upload className="size-4" />
                    <span>{logoPath ? "Ganti Logo" : "Unggah Logo"}</span>
                    <input
                      type="file"
                      accept="image/webp,image/jpeg,image/png"
                      className="hidden"
                      onChange={unggahLogo}
                      disabled={loadingLogo}
                    />
                  </label>
                </Button>

                {logoPath && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:text-danger hover:bg-danger/10"
                    onClick={hapusLogo}
                    disabled={loadingLogo}
                  >
                    <Trash2 className="size-4" />
                    Hapus Logo
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Format: WebP, JPEG, PNG. Otomatis dikompresi ke WebP sebelum diunggah.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Galeri Halaman Depan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ImagePlus className="size-5 text-primary" />
                <CardTitle>Galeri Halaman Depan</CardTitle>
              </div>
              <CardDescription className="mt-1">
                Koleksi 3 sampai 6 foto fasilitas bengkel untuk halaman depan publik (`publik/galeri/`).
              </CardDescription>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loadingGaleri || galeriPaths.length >= 6}
              asChild
            >
              <label
                className={`gap-1.5 flex items-center ${
                  galeriPaths.length >= 6 ? "pointer-events-none opacity-50" : "cursor-pointer"
                }`}
              >
                <Upload className="size-4" />
                <span>+ Foto Galeri ({galeriPaths.length}/6)</span>
                <input
                  type="file"
                  accept="image/webp,image/jpeg,image/png"
                  className="hidden"
                  onChange={tambahFotoGaleri}
                  disabled={loadingGaleri || galeriPaths.length >= 6}
                />
              </label>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {galeriPaths.length === 0 ? (
            <div className="py-8 text-center border border-dashed rounded-lg text-muted-foreground text-sm">
              Belum ada foto galeri yang diunggah. Tambahkan 3 sampai 6 foto bengkel.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {galeriPaths.map((path, idx) => {
                const url = getPublicUrl(path);
                return (
                  <div
                    key={path}
                    className="group relative rounded-lg border border-border overflow-hidden bg-muted aspect-video shadow-sm"
                  >
                    {url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={`Galeri ${idx + 1}`}
                        className="size-full object-cover transition-transform group-hover:scale-105 duration-300"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="gap-1 shadow-md"
                        onClick={() => hapusFotoGaleri(idx)}
                        disabled={loadingGaleri}
                      >
                        <Trash2 className="size-4" />
                        Hapus
                      </Button>
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

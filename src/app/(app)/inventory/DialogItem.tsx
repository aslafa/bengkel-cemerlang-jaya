"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

const skemaPart = z.object({
  nama: z.string().trim().min(1, "Nama spare part wajib diisi"),
  kode: z.string().trim().optional(),
  harga_jual: z.number().min(0, "Harga jual minimal 0"),
  harga_modal: z.number().min(0, "Harga modal minimal 0").optional(),
  stok_minimum: z.number().min(0, "Stok minimum minimal 0"),
  aktif: z.boolean(),
});

const skemaJasa = z.object({
  nama: z.string().trim().min(1, "Nama jasa wajib diisi"),
  kode: z.string().trim().optional(),
  harga_jual: z.number().min(0, "Tarif minimal 0"),
  aktif: z.boolean(),
});

type FormPartValues = z.infer<typeof skemaPart>;
type FormJasaValues = z.infer<typeof skemaJasa>;

interface ItemData {
  id: string;
  kode: string;
  nama: string;
  harga_jual: number;
  stok?: number;
  stok_minimum?: number;
  aktif: boolean;
  harga_modal?: number | null;
}

export function DialogItem({
  jenis,
  item,
  isOwner,
}: {
  jenis: "part" | "jasa";
  item?: ItemData;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [loading, setLoading] = useState(false);

  const formPart = useForm<FormPartValues>({
    resolver: zodResolver(skemaPart),
    defaultValues: {
      nama: item?.nama ?? "",
      kode: item?.kode ?? "",
      harga_jual: item?.harga_jual ?? 0,
      harga_modal: item?.harga_modal ?? 0,
      stok_minimum: item?.stok_minimum ?? 5,
      aktif: item?.aktif ?? true,
    },
  });

  const formJasa = useForm<FormJasaValues>({
    resolver: zodResolver(skemaJasa),
    defaultValues: {
      nama: item?.nama ?? "",
      kode: item?.kode ?? "",
      harga_jual: item?.harga_jual ?? 0,
      aktif: item?.aktif ?? true,
    },
  });

  async function simpanPart(data: FormPartValues) {
    setLoading(true);
    const supabase = createClient();
    try {
      if (item) {
        // Edit part
        const updateData: {
          nama: string;
          harga_jual: number;
          stok_minimum: number;
          aktif: boolean;
          kode?: string;
        } = {
          nama: data.nama,
          harga_jual: data.harga_jual,
          stok_minimum: data.stok_minimum,
          aktif: data.aktif,
        };
        if (data.kode && data.kode.trim() !== "") updateData.kode = data.kode.trim();

        const { error: errUpdate } = await supabase
          .from("inventory_items")
          .update(updateData)
          .eq("id", item.id);

        if (errUpdate) throw errUpdate;

        if (isOwner && data.harga_modal !== undefined) {
          const { error: errCost } = await supabase
            .from("inventory_costs")
            .upsert({ item_id: item.id, harga_modal: data.harga_modal });
          if (errCost) throw errCost;
        }

        toast.success("Spare part berhasil diperbarui");
      } else {
        // Tambah part baru
        const insertData = {
          jenis: "part",
          nama: data.nama,
          harga_jual: data.harga_jual,
          stok_minimum: data.stok_minimum,
          aktif: true,
          kode: data.kode?.trim() || "",
        };

        const { data: partBaru, error: errInsert } = await supabase
          .from("inventory_items")
          .insert(insertData)
          .select("id")
          .single();

        if (errInsert) throw errInsert;

        if (isOwner && data.harga_modal !== undefined && partBaru) {
          const { error: errCost } = await supabase
            .from("inventory_costs")
            .insert({ item_id: partBaru.id, harga_modal: data.harga_modal });
          if (errCost) throw errCost;
        }

        toast.success("Spare part berhasil ditambahkan");
      }

      setBuka(false);
      router.refresh();
    } catch (err: unknown) {
      const pesan = err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan spare part";
      toast.error(pesan);
    } finally {
      setLoading(false);
    }
  }

  async function simpanJasa(data: FormJasaValues) {
    setLoading(true);
    const supabase = createClient();
    try {
      if (item) {
        // Edit jasa
        const updateData: {
          nama: string;
          harga_jual: number;
          aktif: boolean;
          kode?: string;
        } = {
          nama: data.nama,
          harga_jual: data.harga_jual,
          aktif: data.aktif,
        };
        if (data.kode && data.kode.trim() !== "") updateData.kode = data.kode.trim();

        const { error: errUpdate } = await supabase
          .from("inventory_items")
          .update(updateData)
          .eq("id", item.id);

        if (errUpdate) throw errUpdate;

        toast.success("Jasa berhasil diperbarui");
      } else {
        // Tambah jasa baru
        const insertData = {
          jenis: "jasa",
          nama: data.nama,
          harga_jual: data.harga_jual,
          stok: 0,
          stok_minimum: 0,
          aktif: true,
          kode: data.kode?.trim() || "",
        };

        const { error: errInsert } = await supabase
          .from("inventory_items")
          .insert(insertData);

        if (errInsert) throw errInsert;

        toast.success("Jasa berhasil ditambahkan");
      }

      setBuka(false);
      router.refresh();
    } catch (err: unknown) {
      const pesan = err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan jasa";
      toast.error(pesan);
    } finally {
      setLoading(false);
    }
  }

  const judul = item
    ? `Ubah ${jenis === "part" ? "Spare Part" : "Jasa"}`
    : `Tambah ${jenis === "part" ? "Spare Part" : "Jasa"}`;

  return (
    <Dialog
      open={buka}
      onOpenChange={(v) => {
        setBuka(v);
        if (!v) {
          formPart.reset();
          formJasa.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        {item ? (
          <Button variant="outline" size="sm">
            <Pencil className="size-4" />
            Ubah
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" />
            {jenis === "part" ? "Spare Part" : "Jasa"}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{judul}</DialogTitle>
        </DialogHeader>

        {jenis === "part" ? (
          <form onSubmit={formPart.handleSubmit(simpanPart)} className="space-y-4">
            <FieldGroup>
              <Controller
                name="nama"
                control={formPart.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="part-nama">Nama Spare Part *</FieldLabel>
                    <Input {...field} id="part-nama" placeholder="contoh: Kampas Rem Depan" />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                name="kode"
                control={formPart.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="part-kode">Kode / SKU (Opsional)</FieldLabel>
                    <Input
                      {...field}
                      id="part-kode"
                      placeholder="Dibuat otomatis bila kosong (SP-xxxx)"
                      disabled={!!item}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <Controller
                  name="harga_jual"
                  control={formPart.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="part-harga-jual">Harga Jual (Rp) *</FieldLabel>
                      <Input
                        id="part-harga-jual"
                        type="number"
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        placeholder="contoh: 350000"
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />

                <Controller
                  name="stok_minimum"
                  control={formPart.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="part-stok-min">Stok Minimum *</FieldLabel>
                      <Input
                        id="part-stok-min"
                        type="number"
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        placeholder="contoh: 5"
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </div>

              {isOwner && (
                <Controller
                  name="harga_modal"
                  control={formPart.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="part-harga-modal">Harga Modal (Rp) * (Khusus Owner)</FieldLabel>
                      <Input
                        id="part-harga-modal"
                        type="number"
                        value={field.value ?? 0}
                        onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        placeholder="contoh: 260000"
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              )}

              {item && (
                <Controller
                  name="aktif"
                  control={formPart.control}
                  render={({ field }) => (
                    <div className="flex items-center gap-2 pt-2">
                      <Checkbox
                        id="part-aktif"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <label htmlFor="part-aktif" className="text-sm font-medium cursor-pointer">
                        Item aktif (dapat dipilih di WO)
                      </label>
                    </div>
                  )}
                />
              )}
            </FieldGroup>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBuka(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={formJasa.handleSubmit(simpanJasa)} className="space-y-4">
            <FieldGroup>
              <Controller
                name="nama"
                control={formJasa.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="jasa-nama">Nama Jasa *</FieldLabel>
                    <Input {...field} id="jasa-nama" placeholder="contoh: Tune-up Mesin" />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                name="kode"
                control={formJasa.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="jasa-kode">Kode Jasa (Opsional)</FieldLabel>
                    <Input
                      {...field}
                      id="jasa-kode"
                      placeholder="Dibuat otomatis bila kosong (JS-xxxx)"
                      disabled={!!item}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                name="harga_jual"
                control={formJasa.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="jasa-tarif">Tarif Jasa (Rp) *</FieldLabel>
                    <Input
                      id="jasa-tarif"
                      type="number"
                      value={field.value}
                      onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                      placeholder="contoh: 150000"
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              {item && (
                <Controller
                  name="aktif"
                  control={formJasa.control}
                  render={({ field }) => (
                    <div className="flex items-center gap-2 pt-2">
                      <Checkbox
                        id="jasa-aktif"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <label htmlFor="jasa-aktif" className="text-sm font-medium cursor-pointer">
                        Jasa aktif (dapat dipilih di WO)
                      </label>
                    </div>
                  )}
                />
              )}
            </FieldGroup>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBuka(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

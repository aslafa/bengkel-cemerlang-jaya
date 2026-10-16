"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { LABEL_PERAN, type Peran } from "@/lib/peran";

const skema = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi"),
  role: z.enum(["owner", "admin", "kepala_mekanik"]),
  aktif: z.boolean(),
});

type FormValues = z.infer<typeof skema>;

export interface ProfilItem {
  id: string;
  nama: string;
  email: string;
  role: string;
  aktif: boolean;
  created_at: string;
}

export function DialogPengguna({
  profil,
  isOwnerTerakhir,
}: {
  profil: ProfilItem;
  isOwnerTerakhir: boolean;
}) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(skema),
    defaultValues: {
      nama: profil.nama,
      role: (profil.role as Peran) ?? "kepala_mekanik",
      aktif: profil.aktif,
    },
  });

  async function simpan(data: FormValues) {
    if (isOwnerTerakhir && profil.role === "owner" && (!data.aktif || data.role !== "owner")) {
      toast.error("Owner terakhir tidak boleh diturunkan atau dinonaktifkan");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          nama: data.nama,
          role: data.role,
          aktif: data.aktif,
        })
        .eq("id", profil.id);

      if (error) throw error;

      toast.success("Profil pengguna berhasil diperbarui");
      setBuka(false);
      router.refresh();
    } catch (err: unknown) {
      const pesan = err instanceof Error ? err.message : "Gagal memperbarui profil pengguna";
      toast.error(pesan);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={buka}
      onOpenChange={(v) => {
        setBuka(v);
        if (!v) form.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="size-3.5" />
          Ubah
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ubah Pengguna</DialogTitle>
          <DialogDescription>{profil.email}</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(simpan)} className="space-y-4">
          <FieldGroup>
            <Controller
              name="nama"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`nama-${profil.id}`}>Nama Pengguna *</FieldLabel>
                  <Input {...field} id={`nama-${profil.id}`} placeholder="Nama lengkap" />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              name="role"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`role-${profil.id}`}>Peran Akun *</FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isOwnerTerakhir && profil.role === "owner"}
                  >
                    <SelectTrigger id={`role-${profil.id}`}>
                      <SelectValue placeholder="Pilih peran" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">{LABEL_PERAN.owner}</SelectItem>
                      <SelectItem value="admin">{LABEL_PERAN.admin}</SelectItem>
                      <SelectItem value="kepala_mekanik">{LABEL_PERAN.kepala_mekanik}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              name="aktif"
              control={form.control}
              render={({ field }) => (
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox
                    id={`aktif-${profil.id}`}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isOwnerTerakhir && profil.role === "owner"}
                  />
                  <label
                    htmlFor={`aktif-${profil.id}`}
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    Akun Aktif (Dapat login ke aplikasi)
                  </label>
                </div>
              )}
            />

            {isOwnerTerakhir && profil.role === "owner" && (
              <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                Akun ini adalah satu-satunya Owner aktif dan tidak dapat dinonaktifkan atau diubah perannya.
              </p>
            )}
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBuka(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

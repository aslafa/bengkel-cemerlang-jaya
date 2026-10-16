"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";

const skema = z.object({
  stok_fisik: z.number().min(0, "Stok hasil hitung fisik tidak boleh kurang dari 0"),
  alasan: z.string().trim().min(1, "Alasan penyesuaian stok wajib diisi"),
});

type FormValues = z.infer<typeof skema>;

export function DialogSesuaikanStok({
  itemId,
  namaItem,
  kodeItem,
  stokSekarang,
}: {
  itemId: string;
  namaItem: string;
  kodeItem: string;
  stokSekarang: number;
}) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(skema),
    defaultValues: {
      stok_fisik: stokSekarang,
      alasan: "",
    },
  });

  const stokFisikInput = form.watch("stok_fisik");
  const selisih = (stokFisikInput !== undefined && !isNaN(stokFisikInput))
    ? Number(stokFisikInput) - stokSekarang
    : 0;

  async function simpan(data: FormValues) {
    setLoading(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.rpc("sesuaikan_stok", {
        p_item: itemId,
        p_stok_fisik: data.stok_fisik,
        p_alasan: data.alasan,
      });

      if (error) throw error;

      toast.success(
        `Stok berhasil disesuaikan menjadi ${data.stok_fisik} (${selisih >= 0 ? "+" : ""}${selisih})`
      );
      setBuka(false);
      form.reset();
      router.refresh();
    } catch (err: unknown) {
      const pesan = err instanceof Error ? err.message : "Gagal menyesuaikan stok";
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
        if (v) form.setValue("stok_fisik", stokSekarang);
        else form.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 text-warning hover:text-warning">
          <SlidersHorizontal className="size-3.5" />
          Sesuaikan Stok
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Penyesuaian Stok (Stock Opname)</DialogTitle>
          <DialogDescription>
            {kodeItem} · <span className="font-semibold text-text">{namaItem}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(simpan)} className="space-y-4">
          <div className="rounded-lg bg-muted/60 p-3 text-sm flex justify-between items-center">
            <div>
              <p className="text-muted-foreground text-xs">Stok di Sistem</p>
              <p className="text-base font-semibold tabular-nums">{stokSekarang}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-xs">Selisih Penyesuaian</p>
              <p
                className={`text-base font-semibold tabular-nums ${
                  selisih > 0
                    ? "text-success"
                    : selisih < 0
                    ? "text-danger"
                    : "text-muted-foreground"
                }`}
              >
                {selisih > 0 ? `+${selisih}` : selisih}
              </p>
            </div>
          </div>

          <FieldGroup>
            <Controller
              name="stok_fisik"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="stok-penyesuaian-fisik">Stok Hasil Hitung Fisik *</FieldLabel>
                  <Input
                    id="stok-penyesuaian-fisik"
                    type="number"
                    min="0"
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                    autoFocus
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              name="alasan"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="stok-penyesuaian-alasan">Alasan Penyesuaian *</FieldLabel>
                  <Textarea
                    {...field}
                    id="stok-penyesuaian-alasan"
                    placeholder="contoh: Hasil stock opname bulanan, selisih fisik rusak/hilang"
                    rows={2}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBuka(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan Penyesuaian"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

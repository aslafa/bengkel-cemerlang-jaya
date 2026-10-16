"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowDownToLine } from "lucide-react";
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
  jumlah: z.number().min(1, "Jumlah stok masuk minimal 1"),
  keterangan: z.string().trim().optional(),
});

type FormValues = z.infer<typeof skema>;

export function DialogStokMasuk({
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
      jumlah: 1,
      keterangan: "",
    },
  });

  const jumlahInput = form.watch("jumlah") || 0;
  const estimasiStokBaru = stokSekarang + (jumlahInput > 0 ? Number(jumlahInput) : 0);

  async function simpan(data: FormValues) {
    setLoading(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.rpc("catat_stok_masuk", {
        p_item: itemId,
        p_jumlah: data.jumlah,
        p_keterangan: data.keterangan || undefined,
      });

      if (error) throw error;

      toast.success(`Stok masuk berhasil dicatat (+${data.jumlah} ${namaItem})`);
      setBuka(false);
      form.reset();
      router.refresh();
    } catch (err: unknown) {
      const pesan = err instanceof Error ? err.message : "Gagal mencatat stok masuk";
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
        <Button variant="outline" size="sm" className="gap-1 text-primary hover:text-primary">
          <ArrowDownToLine className="size-3.5" />
          Stok Masuk
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Catat Stok Masuk</DialogTitle>
          <DialogDescription>
            {kodeItem} · <span className="font-semibold text-text">{namaItem}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(simpan)} className="space-y-4">
          <div className="rounded-lg bg-muted/60 p-3 text-sm flex justify-between items-center">
            <div>
              <p className="text-muted-foreground text-xs">Stok Saat Ini</p>
              <p className="text-base font-semibold tabular-nums">{stokSekarang}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-xs">Estimasi Stok Baru</p>
              <p className="text-base font-semibold text-success tabular-nums">{estimasiStokBaru}</p>
            </div>
          </div>

          <FieldGroup>
            <Controller
              name="jumlah"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="stok-masuk-jumlah">Jumlah Tambahan (≥ 1) *</FieldLabel>
                  <Input
                    id="stok-masuk-jumlah"
                    type="number"
                    min="1"
                    value={field.value}
                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                    autoFocus
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              name="keterangan"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="stok-masuk-keterangan">Keterangan (Opsional)</FieldLabel>
                  <Textarea
                    {...field}
                    id="stok-masuk-keterangan"
                    placeholder="contoh: Pembelian dari Toko Sinar atau Faktur #1234"
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
              {loading ? "Menyimpan..." : "Simpan Stok Masuk"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

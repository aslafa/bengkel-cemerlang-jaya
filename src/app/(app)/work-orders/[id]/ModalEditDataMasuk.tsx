"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { createClient } from "@/lib/supabase/client";

interface Props {
  woId: string;
  odometerAwal: number;
  keluhanAwal: string;
  kepalaMekanikIdAwal: string;
  daftarTim: { id: string; nama: string }[];
}

export function ModalEditDataMasuk({
  woId,
  odometerAwal,
  keluhanAwal,
  kepalaMekanikIdAwal,
  daftarTim,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [buka, setBuka] = useState(false);
  const [odometer, setOdometer] = useState(odometerAwal.toString());
  const [keluhan, setKeluhan] = useState(keluhanAwal);
  const [kepalaMekanikId, setKepalaMekanikId] = useState(kepalaMekanikIdAwal);

  const [sedangSimpan, setSedangSimpan] = useState(false);
  const [pesanError, setPesanError] = useState("");

  const handleSimpan = async () => {
    const odoNum = Number(odometer);
    if (isNaN(odoNum) || odoNum < 0) {
      setPesanError("Odometer harus berupa angka 0 atau lebih");
      return;
    }
    if (!keluhan.trim()) {
      setPesanError("Keluhan mobil wajib diisi");
      return;
    }

    setSedangSimpan(true);
    setPesanError("");

    try {
      const { error } = await supabase
        .from("work_orders")
        .update({
          odometer: odoNum,
          keluhan: keluhan.trim(),
          kepala_mekanik_id: kepalaMekanikId,
        })
        .eq("id", woId);

      if (error) throw error;

      setBuka(false);
      router.refresh();
    } catch (err: unknown) {
      setPesanError(err instanceof Error ? err.message : "Gagal menyimpan perubahan data masuk");
    } finally {
      setSedangSimpan(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setBuka(true)}>
        <Edit3 className="mr-1.5 size-3.5" />
        Ubah Data Masuk
      </Button>

      <Dialog open={buka} onOpenChange={setBuka}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ubah Data Masuk Work Order</DialogTitle>
            <DialogDescription>
              Admin dan Owner dapat mengubah odometer, keluhan, dan memindahkan tim selama status masih &quot;Menunggu&quot;.
            </DialogDescription>
          </DialogHeader>

          {pesanError && (
            <div className="rounded-md border border-danger/30 bg-danger/10 p-2 text-xs text-danger">
              {pesanError}
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="odoEdit">Odometer (km) *</Label>
              <Input
                id="odoEdit"
                type="number"
                min={0}
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timEdit">Tim Kepala Mekanik *</Label>
              <Select value={kepalaMekanikId} onValueChange={setKepalaMekanikId}>
                <SelectTrigger id="timEdit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {daftarTim.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      Tim {t.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keluhanEdit">Keluhan Mobil *</Label>
              <Textarea
                id="keluhanEdit"
                rows={3}
                value={keluhan}
                onChange={(e) => setKeluhan(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBuka(false)} disabled={sedangSimpan}>
              Batal
            </Button>
            <Button onClick={handleSimpan} disabled={sedangSimpan}>
              {sedangSimpan ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

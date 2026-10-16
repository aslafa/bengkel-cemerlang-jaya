"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Edit3, Loader2, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { Peran } from "@/lib/peran";
import { createClient } from "@/lib/supabase/client";

interface Props {
  woId: string;
  statusWo: string;
  kepalaMekanikId: string;
  diagnosisAwal: string | null;
  profil: { id: string; nama: string; peran: Peran };
}

export function FormDiagnosisWO({
  woId,
  statusWo,
  kepalaMekanikId,
  diagnosisAwal,
  profil,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [modeEdit, setModeEdit] = useState(false);
  const [diagnosis, setDiagnosis] = useState(diagnosisAwal ?? "");
  const [sedangSimpan, setSedangSimpan] = useState(false);
  const [pesanError, setPesanError] = useState("");

  const isTimWO =
    profil.peran === "owner" ||
    (profil.peran === "kepala_mekanik" && kepalaMekanikId === profil.id);
  const bolehUbahDiagnosis = isTimWO && (statusWo === "dikerjakan" || statusWo === "tertunda");

  const handleSimpan = async () => {
    setSedangSimpan(true);
    setPesanError("");
    try {
      const { error } = await supabase
        .from("work_orders")
        .update({
          diagnosis: diagnosis.trim() || null,
        })
        .eq("id", woId);

      if (error) throw error;

      setModeEdit(false);
      router.refresh();
    } catch (err: unknown) {
      setPesanError(err instanceof Error ? err.message : "Gagal menyimpan diagnosis");
    } finally {
      setSedangSimpan(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Stethoscope className="size-4 text-primary" />
            Diagnosis Mekanik
          </CardTitle>
          <CardDescription>Hasil analisa teknis kerusakan atau temuan saat pengecekan.</CardDescription>
        </div>

        {bolehUbahDiagnosis && !modeEdit && (
          <Button variant="outline" size="sm" onClick={() => setModeEdit(true)}>
            <Edit3 className="mr-1.5 size-3.5" />
            {diagnosis ? "Ubah Diagnosis" : "+ Isi Diagnosis"}
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {pesanError && (
          <div className="mb-3 rounded-md border border-danger/30 bg-danger/10 p-2 text-xs text-danger">
            {pesanError}
          </div>
        )}

        {modeEdit ? (
          <div className="space-y-3">
            <Textarea
              rows={3}
              placeholder="Contoh: Kampas rem depan sudah tipis sisa 1 mm. Piringan cakram sedikit bergelombang."
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDiagnosis(diagnosisAwal ?? "");
                  setModeEdit(false);
                }}
                disabled={sedangSimpan}
              >
                Batal
              </Button>
              <Button size="sm" onClick={handleSimpan} disabled={sedangSimpan}>
                {sedangSimpan ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Check className="mr-1.5 size-3.5" />}
                Simpan
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap text-text">
            {diagnosis || <span className="italic text-muted-foreground">Belum ada catatan diagnosis teknis.</span>}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

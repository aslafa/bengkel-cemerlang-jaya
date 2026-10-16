import { redirect } from "next/navigation";
import { ambilProfilSaya } from "@/lib/profil";
import { createClient } from "@/lib/supabase/server";
import { FormWorkOrderBaru } from "./FormWorkOrderBaru";

const STATUS_AKTIF = ["dikerjakan", "tertunda", "selesai"];

export default async function HalamanWorkOrderBaru() {
  const profil = await ambilProfilSaya();

  // Hanya Admin dan Owner yang berhak membuat Work Order (PRD 6.6 & 6.7)
  if (profil.peran !== "admin" && profil.peran !== "owner") {
    redirect("/work-orders");
  }

  const supabase = await createClient();

  // Ambil daftar kepala mekanik yang aktif dan hitung beban WO aktif per tim
  const [{ data: kepalaMekanik }, { data: woAktifList }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nama")
      .eq("role", "kepala_mekanik")
      .eq("aktif", true)
      .order("nama"),
    supabase
      .from("work_orders")
      .select("kepala_mekanik_id")
      .in("status", STATUS_AKTIF),
  ]);

  const timBeban = new Map<string, number>();
  woAktifList?.forEach((w) => {
    timBeban.set(w.kepala_mekanik_id, (timBeban.get(w.kepala_mekanik_id) ?? 0) + 1);
  });

  const daftarTim = (kepalaMekanik ?? []).map((k) => ({
    id: k.id,
    nama: k.nama,
    beban: timBeban.get(k.id) ?? 0,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Buat Work Order Baru</h1>
        <p className="text-sm text-muted-foreground">
          Penerimaan kendaraan datang, keluhan, dan penentuan tim pengerjaan.
        </p>
      </div>

      <FormWorkOrderBaru daftarTim={daftarTim} />
    </div>
  );
}

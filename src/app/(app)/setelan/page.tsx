import { redirect } from "next/navigation";
import { ambilProfilSaya } from "@/lib/profil";
import { createClient } from "@/lib/supabase/server";
import { FormSetelan } from "./FormSetelan";

export default async function HalamanSetelan() {
  const profil = await ambilProfilSaya();
  if (profil.peran !== "owner") {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: settings, error } = await supabase
    .from("workshop_settings")
    .select("id, nama, alamat, telepon, jam_buka, logo_path, galeri_paths, updated_at")
    .eq("id", 1)
    .single();

  if (error || !settings) {
    return (
      <div className="p-6 text-center text-danger">
        Setelan bengkel gagal dimuat. Pastikan tabel workshop_settings telah terisi.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-text">Setelan Bengkel</h1>
        <p className="text-sm text-muted-foreground">
          Kelola profil bengkel, identitas visual (logo), dan galeri halaman depan.
        </p>
      </div>

      <FormSetelan settings={settings} />
    </div>
  );
}

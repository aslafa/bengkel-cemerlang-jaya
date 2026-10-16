import { redirect } from "next/navigation";
import { Search, UserCheck } from "lucide-react";
import { Paginasi } from "@/components/Paginasi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { tanggal } from "@/lib/format";
import { LABEL_PERAN, type Peran } from "@/lib/peran";
import { ambilProfilSaya } from "@/lib/profil";
import { createClient } from "@/lib/supabase/server";
import { DialogPengguna } from "./DialogPengguna";

const PER_HALAMAN = 20;

export default async function HalamanPengguna({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; hal?: string }>;
}) {
  const { q = "", hal } = await searchParams;
  const halaman = Math.max(1, Number(hal) || 1);
  const cari = q.replace(/[,()*%\\]/g, " ").trim();

  const profilSaya = await ambilProfilSaya();
  if (profilSaya.peran !== "owner") {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // Hitung berapa owner aktif saat ini untuk pengaman
  const { count: totalOwnerAktif } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "owner")
    .eq("aktif", true);

  let kueri = supabase
    .from("profiles")
    .select("id, nama, email, role, aktif, created_at", { count: "exact" });

  if (cari) {
    kueri = kueri.or(`nama.ilike.%${cari}%,email.ilike.%${cari}%`);
  }

  const { data: pengguna, count, error } = await kueri
    .order("created_at", { ascending: true })
    .range((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN - 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Pengguna</h1>
          <p className="text-sm text-muted-foreground">
            Kelola hak akses dan status keaktifan akun pengguna bengkel.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-primary-soft bg-primary-soft/30 p-4 text-sm text-text-body flex gap-3 items-start">
        <UserCheck className="size-5 text-primary-strong shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-text">Penambahan Pengguna Baru</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Akun baru dibuat di Supabase Dashboard (Authentication › Users › Add User). Akun yang baru terdaftar otomatis muncul di tabel ini dan dapat diaktifkan serta diatur perannya oleh Owner.
          </p>
        </div>
      </div>

      <form className="flex max-w-md gap-2" role="search">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Cari nama atau email pengguna..."
          aria-label="Cari pengguna"
        />
        <Button type="submit" variant="outline">
          <Search className="size-4" />
          Cari
        </Button>
      </form>

      <Card className="py-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Peran</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead>Terdaftar</TableHead>
              <TableHead className="pr-4 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {error && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-danger">
                  Data pengguna gagal dimuat. Muat ulang halaman ini.
                </TableCell>
              </TableRow>
            )}
            {!error && pengguna?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  {cari ? `Tidak ada pengguna yang cocok dengan "${cari}".` : "Belum ada data pengguna."}
                </TableCell>
              </TableRow>
            )}
            {pengguna?.map((p) => {
              const isOwnerTerakhir = (totalOwnerAktif ?? 1) <= 1 && p.role === "owner" && p.aktif;
              const peranLabel = LABEL_PERAN[p.role as Peran] ?? p.role;

              const roleBadgeVariant =
                p.role === "owner"
                  ? "bg-purple-100 text-purple-700 border-purple-200"
                  : p.role === "admin"
                  ? "bg-blue-100 text-blue-700 border-blue-200"
                  : "bg-amber-100 text-amber-700 border-amber-200";

              return (
                <TableRow key={p.id}>
                  <TableCell className="pl-4 font-medium text-text">
                    {p.nama}
                    {p.id === profilSaya.id && (
                      <span className="ml-1.5 text-xs text-primary font-normal">(Anda)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs ${roleBadgeVariant}`}>
                      {peranLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={p.aktif ? "secondary" : "outline"}
                      className={
                        p.aktif
                          ? "bg-success/10 text-success border-success/20"
                          : "text-muted-foreground"
                      }
                    >
                      {p.aktif ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {tanggal(p.created_at)}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <DialogPengguna profil={p} isOwnerTerakhir={isOwnerTerakhir} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Paginasi
        halaman={halaman}
        totalBaris={count ?? 0}
        perHalaman={PER_HALAMAN}
        params={{ q: cari }}
      />
    </div>
  );
}

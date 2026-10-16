import Link from "next/link";
import { Search } from "lucide-react";
import { Paginasi } from "@/components/Paginasi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { rupiah, tanggal } from "@/lib/format";
import { ambilProfilSaya } from "@/lib/profil";
import { createClient } from "@/lib/supabase/server";
import { DialogItem } from "./DialogItem";
import { DialogStokMasuk } from "./DialogStokMasuk";
import { DialogSesuaikanStok } from "./DialogSesuaikanStok";

const PER_HALAMAN = 20;

type TabKey = "part" | "jasa" | "riwayat";

export default async function HalamanInventory({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    status?: string;
    jenis_mutasi?: string;
    hal?: string;
  }>;
}) {
  const { tab = "part", q = "", status = "semua", jenis_mutasi = "semua", hal } = await searchParams;
  const tabAktif: TabKey = tab === "jasa" || tab === "riwayat" ? tab : "part";
  const halaman = Math.max(1, Number(hal) || 1);
  const cari = q.replace(/[,()*%\\]/g, " ").trim();

  const profil = await ambilProfilSaya();
  const supabase = await createClient();

  const isOwner = profil.peran === "owner";
  const isAdminOrOwner = profil.peran === "admin" || profil.peran === "owner";

  // 1. Data Tab Spare Part
  let totalPart = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let daftarPart: any[] = [];
  let errorPart = false;

  // 2. Data Tab Jasa
  let totalJasa = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let daftarJasa: any[] = [];
  let errorJasa = false;

  // 3. Data Tab Riwayat Stok
  let totalRiwayat = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let daftarRiwayat: any[] = [];
  let errorRiwayat = false;

  if (tabAktif === "part") {
    // Hemat egress: kolom harga_modal hanya diambil untuk Owner
    const selectCols = isOwner
      ? "id, kode, nama, jenis, harga_jual, stok, stok_minimum, aktif, inventory_costs(harga_modal)"
      : "id, kode, nama, jenis, harga_jual, stok, stok_minimum, aktif";

    let kueri = supabase
      .from("inventory_items")
      .select(selectCols, { count: "exact" })
      .eq("jenis", "part");

    if (cari) {
      kueri = kueri.or(`nama.ilike.%${cari}%,kode.ilike.%${cari}%`);
    }

    if (status === "habis") {
      kueri = kueri.eq("stok", 0);
    } else if (status === "menipis") {
      // Menipis: stok > 0 tapi <= stok_minimum
      kueri = kueri.gt("stok", 0);
    }

    const res = await kueri
      .order("nama")
      .range((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN - 1);

    errorPart = !!res.error;
    totalPart = res.count ?? 0;
    daftarPart = res.data ?? [];

    // Filter sisi memori untuk kondisi stok <= stok_minimum jika status = menipis
    if (status === "menipis") {
      daftarPart = daftarPart.filter((p) => p.stok <= p.stok_minimum);
    } else if (status === "aman") {
      daftarPart = daftarPart.filter((p) => p.stok > p.stok_minimum);
    }
  } else if (tabAktif === "jasa") {
    let kueri = supabase
      .from("inventory_items")
      .select("id, kode, nama, jenis, harga_jual, aktif", { count: "exact" })
      .eq("jenis", "jasa");

    if (cari) {
      kueri = kueri.or(`nama.ilike.%${cari}%,kode.ilike.%${cari}%`);
    }

    const res = await kueri
      .order("nama")
      .range((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN - 1);

    errorJasa = !!res.error;
    totalJasa = res.count ?? 0;
    daftarJasa = res.data ?? [];
  } else if (tabAktif === "riwayat") {
    let kueri = supabase
      .from("stock_movements")
      .select(
        "id, created_at, jenis, jumlah, stok_sesudah, keterangan, inventory_items(id, kode, nama), work_orders(id, nomor), profiles(id, nama)",
        { count: "exact" }
      );

    if (jenis_mutasi !== "semua") {
      kueri = kueri.eq("jenis", jenis_mutasi);
    }

    const res = await kueri
      .order("created_at", { ascending: false })
      .range((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN - 1);

    errorRiwayat = !!res.error;
    totalRiwayat = res.count ?? 0;
    daftarRiwayat = res.data ?? [];
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">Inventory</h1>
          <p className="text-sm text-muted-foreground">
            Kelola katalog spare part, layanan jasa, dan riwayat mutasi stok bengkel.
          </p>
        </div>

        {isAdminOrOwner && tabAktif === "part" && (
          <DialogItem jenis="part" isOwner={isOwner} />
        )}
        {isAdminOrOwner && tabAktif === "jasa" && (
          <DialogItem jenis="jasa" isOwner={isOwner} />
        )}
      </div>

      {/* Navigasi Tab */}
      <div className="flex border-b border-border">
        <Link
          href="/inventory?tab=part"
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tabAktif === "part"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-text"
          }`}
        >
          Spare Part
        </Link>
        <Link
          href="/inventory?tab=jasa"
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tabAktif === "jasa"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-text"
          }`}
        >
          Jasa
        </Link>
        <Link
          href="/inventory?tab=riwayat"
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tabAktif === "riwayat"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-text"
          }`}
        >
          Riwayat Stok
        </Link>
      </div>

      {/* TAB 1: SPARE PART */}
      {tabAktif === "part" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <form className="flex max-w-md gap-2 flex-1" role="search">
              <input type="hidden" name="tab" value="part" />
              {status !== "semua" && <input type="hidden" name="status" value={status} />}
              <Input
                name="q"
                defaultValue={q}
                placeholder="Cari nama atau SKU spare part..."
                aria-label="Cari spare part"
              />
              <Button type="submit" variant="outline">
                <Search className="size-4" />
                Cari
              </Button>
            </form>

            {/* Penyaring Status */}
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground mr-1">Status:</span>
              {(["semua", "aman", "menipis", "habis"] as const).map((st) => (
                <Link
                  key={st}
                  href={`/inventory?tab=part&status=${st}${cari ? `&q=${encodeURIComponent(cari)}` : ""}`}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                    status === st
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground hover:text-text"
                  }`}
                >
                  {st}
                </Link>
              ))}
            </div>
          </div>

          <Card className="py-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">SKU</TableHead>
                  <TableHead>Nama Spare Part</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="text-right">Stok Min</TableHead>
                  <TableHead className="text-right">Harga Jual</TableHead>
                  {isOwner && <TableHead className="text-right">Harga Modal</TableHead>}
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="pr-4 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errorPart && (
                  <TableRow>
                    <TableCell
                      colSpan={isOwner ? 8 : 7}
                      className="py-10 text-center text-danger"
                    >
                      Data spare part gagal dimuat. Muat ulang halaman ini.
                    </TableCell>
                  </TableRow>
                )}
                {!errorPart && daftarPart.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={isOwner ? 8 : 7}
                      className="py-10 text-center text-muted-foreground"
                    >
                      {cari
                        ? `Tidak ada spare part yang cocok dengan "${cari}".`
                        : "Belum ada data spare part."}
                    </TableCell>
                  </TableRow>
                )}
                {daftarPart.map((p) => {
                  const statusPart =
                    p.stok === 0
                      ? { label: "Habis", badgeClass: "bg-danger/10 text-danger border-danger/20" }
                      : p.stok <= p.stok_minimum
                      ? { label: "Menipis", badgeClass: "bg-warning/10 text-warning border-warning/20" }
                      : { label: "Aman", badgeClass: "bg-success/10 text-success border-success/20" };

                  const hargaModal = p.inventory_costs?.[0]?.harga_modal ?? p.inventory_costs?.harga_modal;

                  return (
                    <TableRow key={p.id} className={!p.aktif ? "opacity-60" : undefined}>
                      <TableCell className="pl-4 font-mono text-xs">{p.kode}</TableCell>
                      <TableCell className="font-medium">
                        {p.nama}
                        {!p.aktif && (
                          <span className="ml-2 text-xs text-muted-foreground font-normal">
                            (Nonaktif)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        {p.stok}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {p.stok_minimum}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {rupiah(p.harga_jual)}
                      </TableCell>
                      {isOwner && (
                        <TableCell className="text-right tabular-nums">
                          {hargaModal !== undefined && hargaModal !== null ? (
                            rupiah(hargaModal)
                          ) : (
                            <span className="text-xs text-warning font-normal">Modal belum diisi</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`text-xs ${statusPart.badgeClass}`}>
                          {statusPart.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isAdminOrOwner && (
                            <DialogStokMasuk
                              itemId={p.id}
                              namaItem={p.nama}
                              kodeItem={p.kode}
                              stokSekarang={p.stok}
                            />
                          )}
                          {isOwner && (
                            <DialogSesuaikanStok
                              itemId={p.id}
                              namaItem={p.nama}
                              kodeItem={p.kode}
                              stokSekarang={p.stok}
                            />
                          )}
                          {isOwner && (
                            <DialogItem
                              jenis="part"
                              item={{
                                id: p.id,
                                kode: p.kode,
                                nama: p.nama,
                                harga_jual: p.harga_jual,
                                stok: p.stok,
                                stok_minimum: p.stok_minimum,
                                aktif: p.aktif,
                                harga_modal: hargaModal,
                              }}
                              isOwner={isOwner}
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          <Paginasi
            halaman={halaman}
            totalBaris={totalPart}
            perHalaman={PER_HALAMAN}
            params={{ tab: "part", q: cari, status: status !== "semua" ? status : undefined }}
          />
        </div>
      )}

      {/* TAB 2: JASA */}
      {tabAktif === "jasa" && (
        <div className="space-y-4">
          <form className="flex max-w-md gap-2" role="search">
            <input type="hidden" name="tab" value="jasa" />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Cari nama atau kode jasa..."
              aria-label="Cari jasa"
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
                  <TableHead className="pl-4">Kode</TableHead>
                  <TableHead>Nama Layanan Jasa</TableHead>
                  <TableHead className="text-right">Tarif</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  {isOwner && <TableHead className="pr-4 text-right">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {errorJasa && (
                  <TableRow>
                    <TableCell colSpan={isOwner ? 5 : 4} className="py-10 text-center text-danger">
                      Data jasa gagal dimuat. Muat ulang halaman ini.
                    </TableCell>
                  </TableRow>
                )}
                {!errorJasa && daftarJasa.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isOwner ? 5 : 4} className="py-10 text-center text-muted-foreground">
                      {cari ? `Tidak ada jasa yang cocok dengan "${cari}".` : "Belum ada data jasa."}
                    </TableCell>
                  </TableRow>
                )}
                {daftarJasa.map((j) => (
                  <TableRow key={j.id} className={!j.aktif ? "opacity-60" : undefined}>
                    <TableCell className="pl-4 font-mono text-xs">{j.kode}</TableCell>
                    <TableCell className="font-medium">
                      {j.nama}
                      {!j.aktif && (
                        <span className="ml-2 text-xs text-muted-foreground font-normal">
                          (Nonaktif)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">
                      {rupiah(j.harga_jual)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={j.aktif ? "secondary" : "outline"} className="text-xs">
                        {j.aktif ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>
                    {isOwner && (
                      <TableCell className="pr-4 text-right">
                        <DialogItem
                          jenis="jasa"
                          item={{
                            id: j.id,
                            kode: j.kode,
                            nama: j.nama,
                            harga_jual: j.harga_jual,
                            aktif: j.aktif,
                          }}
                          isOwner={isOwner}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <Paginasi
            halaman={halaman}
            totalBaris={totalJasa}
            perHalaman={PER_HALAMAN}
            params={{ tab: "jasa", q: cari }}
          />
        </div>
      )}

      {/* TAB 3: RIWAYAT STOK */}
      {tabAktif === "riwayat" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground mr-1">Jenis Pergerakan:</span>
              {(["semua", "masuk", "keluar", "penyesuaian", "kembali"] as const).map((jm) => (
                <Link
                  key={jm}
                  href={`/inventory?tab=riwayat&jenis_mutasi=${jm}`}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                    jenis_mutasi === jm
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground hover:text-text"
                  }`}
                >
                  {jm}
                </Link>
              ))}
            </div>
          </div>

          <Card className="py-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Waktu</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-center">Jenis</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead className="text-right">Stok Sesudah</TableHead>
                  <TableHead>Keterangan / Rujukan</TableHead>
                  <TableHead className="pr-4">Dicatat Oleh</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errorRiwayat && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-danger">
                      Data riwayat stok gagal dimuat. Muat ulang halaman ini.
                    </TableCell>
                  </TableRow>
                )}
                {!errorRiwayat && daftarRiwayat.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Belum ada catatan pergerakan stok.
                    </TableCell>
                  </TableRow>
                )}
                {daftarRiwayat.map((m) => {
                  const jenisBadge =
                    m.jenis === "masuk"
                      ? { label: "Masuk", variant: "bg-success/10 text-success border-success/20" }
                      : m.jenis === "keluar"
                      ? { label: "Keluar", variant: "bg-primary/10 text-primary border-primary/20" }
                      : m.jenis === "penyesuaian"
                      ? { label: "Penyesuaian", variant: "bg-warning/10 text-warning border-warning/20" }
                      : { label: "Kembali", variant: "bg-purple-100 text-purple-700 border-purple-200" };

                  return (
                    <TableRow key={m.id}>
                      <TableCell className="pl-4 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                        {tanggal(m.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{m.inventory_items?.nama ?? "-"}</div>
                        <div className="text-xs font-mono text-muted-foreground">
                          {m.inventory_items?.kode ?? ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={`text-xs ${jenisBadge.variant}`}>
                          {jenisBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums font-semibold ${
                          m.jumlah > 0 ? "text-success" : m.jumlah < 0 ? "text-danger" : ""
                        }`}
                      >
                        {m.jumlah > 0 ? `+${m.jumlah}` : m.jumlah}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {m.stok_sesudah}
                      </TableCell>
                      <TableCell className="text-sm max-w-xs truncate">
                        {m.keterangan || "-"}
                        {m.work_orders?.nomor && (
                          <span className="ml-1 text-xs text-primary font-mono font-medium">
                            ({m.work_orders.nomor})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="pr-4 text-sm text-muted-foreground">
                        {m.profiles?.nama ?? "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          <Paginasi
            halaman={halaman}
            totalBaris={totalRiwayat}
            perHalaman={PER_HALAMAN}
            params={{
              tab: "riwayat",
              jenis_mutasi: jenis_mutasi !== "semua" ? jenis_mutasi : undefined,
            }}
          />
        </div>
      )}
    </div>
  );
}

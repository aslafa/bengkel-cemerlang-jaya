import { redirect } from "next/navigation";
import { ShieldCheck, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Paginasi } from "@/components/Paginasi";
import { ambilProfilSaya } from "@/lib/profil";
import { createClient } from "@/lib/supabase/server";
import { PenyaringAuditLog } from "./PenyaringAuditLog";
import { DialogPerbandinganAudit, type ItemAuditLog } from "./DialogPerbandinganAudit";

export const dynamic = "force-dynamic";

const PER_HALAMAN = 20;

export default async function HalamanAuditLog({
  searchParams,
}: {
  searchParams: Promise<{ hal?: string; tabel?: string; pelaku?: string; aksi?: string }>;
}) {
  const profil = await ambilProfilSaya();
  // Hanya Owner yang boleh melihat Audit Log sesuai PRD 2.3 & 6.13
  if (profil.peran !== "owner") {
    redirect("/dashboard");
  }

  const { hal, tabel, pelaku, aksi } = await searchParams;
  const halaman = Math.max(1, Number(hal) || 1);

  const supabase = await createClient();

  // Ambil daftar profil untuk dropdown pilihan pelaku
  const { data: daftarProfil } = await supabase
    .from("profiles")
    .select("id, nama, role")
    .order("nama");

  const petaPelaku = new Map<string, { nama: string; role: string }>();
  (daftarProfil ?? []).forEach((p) => {
    petaPelaku.set(p.id, { nama: p.nama, role: p.role });
  });

  // Query audit_logs dengan filter
  let kueri = supabase
    .from("audit_logs")
    .select("id, waktu, pelaku_id, pelaku_peran, aksi, tabel, data_id, sebelum, sesudah, alasan", { count: "exact" });

  if (tabel && tabel !== "semua") {
    kueri = kueri.eq("tabel", tabel);
  }
  if (pelaku && pelaku !== "semua") {
    kueri = kueri.eq("pelaku_id", pelaku);
  }
  if (aksi && aksi !== "semua") {
    kueri = kueri.eq("aksi", aksi);
  }

  const { data: logs, count, error } = await kueri
    .order("waktu", { ascending: false })
    .order("id", { ascending: false })
    .range((halaman - 1) * PER_HALAMAN, halaman * PER_HALAMAN - 1);

  const daftarLog: ItemAuditLog[] = (logs ?? []).map((row) => ({
    ...row,
    pelaku_nama: row.pelaku_id ? petaPelaku.get(row.pelaku_id)?.nama ?? null : null,
  }));

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-text">Audit Log</h1>
            <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1 text-xs py-0.5">
              <ShieldCheck className="size-3.5" />
              Permanen &amp; Read-Only
            </Badge>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Riwayat otomatis setiap perubahan data bengkel (status, harga, stok, invoice, pembayaran).
          </p>
        </div>
      </div>

      {/* Komponen Penyaring */}
      <PenyaringAuditLog daftarPelaku={daftarProfil ?? []} />

      {/* Tabel Data Audit Log */}
      <Card className="rounded-xl border border-border shadow-card overflow-hidden bg-bg-panel">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-bg-app hover:bg-bg-app text-xs font-semibold text-text-muted">
                <TableHead className="w-44">Waktu</TableHead>
                <TableHead className="w-48">Pelaku &amp; Peran</TableHead>
                <TableHead className="w-28">Aksi</TableHead>
                <TableHead className="w-56">Tabel &amp; Data ID</TableHead>
                <TableHead>Alasan / Keterangan</TableHead>
                <TableHead className="text-right w-36">Perubahan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs divide-y divide-border/60">
              {daftarLog.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-text-muted">
                    <History className="size-8 text-text-muted/40 mx-auto mb-2" />
                    <p className="font-medium text-text">Belum ada catatan audit log</p>
                    <p className="text-xs text-text-muted mt-1">
                      Catatan akan otomatis bertambah ketika ada aktivitas penambahan, perubahan, atau penghapusan data.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                daftarLog.map((log) => {
                  const waktuLocal = new Date(log.waktu).toLocaleString("id-ID", {
                    timeZone: "Asia/Jakarta",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <TableRow key={log.id} className="hover:bg-bg-app/50 transition-colors">
                      <TableCell className="font-mono text-[11px] text-text-body whitespace-nowrap">
                        {waktuLocal}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-text">
                            {log.pelaku_nama || (log.pelaku_id ? "Pengguna" : "Sistem Bengkel")}
                          </span>
                          <span className="text-[11px] text-text-muted capitalize">
                            {log.pelaku_peran ? `Peran: ${log.pelaku_peran}` : "Aktivitas Sistem"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            log.aksi === "INSERT"
                              ? "bg-success/10 text-success border-success/30 font-semibold text-[10px]"
                              : log.aksi === "UPDATE"
                                ? "bg-primary/10 text-primary-strong border-primary/30 font-semibold text-[10px]"
                                : "bg-danger/10 text-danger border-danger/30 font-semibold text-[10px]"
                          }
                        >
                          {log.aksi}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-text font-mono text-[11px]">{log.tabel}</span>
                          <span className="text-[10px] text-text-muted font-mono truncate max-w-[200px]" title={log.data_id ?? ""}>
                            {log.data_id || "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-text-body">
                        {log.alasan ? (
                          <span className="italic">&ldquo;{log.alasan}&rdquo;</span>
                        ) : (
                          <span className="text-text-muted/60">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DialogPerbandinganAudit log={log} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginasi 20 baris per halaman */}
        {daftarLog.length > 0 && (
          <div className="p-4 border-t border-border">
            <Paginasi
              halaman={halaman}
              totalBaris={count ?? 0}
              perHalaman={PER_HALAMAN}
              params={{
                tabel: tabel && tabel !== "semua" ? tabel : undefined,
                pelaku: pelaku && pelaku !== "semua" ? pelaku : undefined,
                aksi: aksi && aksi !== "semua" ? aksi : undefined,
              }}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

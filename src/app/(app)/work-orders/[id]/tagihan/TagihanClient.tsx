"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Coins,
  Info,
  Pencil,
  Plus,
  Receipt,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { BadgeStatus } from "@/components/BadgeStatus";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { rupiah, tanggal } from "@/lib/format";
import type { Peran } from "@/lib/peran";
import { createClient } from "@/lib/supabase/client";

export type BillingItemRow = {
  id: string;
  work_order_id: string;
  item_id: string;
  nama_item: string;
  jenis: string;
  jumlah: number;
  harga_master: number;
  harga_dipakai: number;
  alasan_penyesuaian: string | null;
  disesuaikan_at: string | null;
  disesuaikan_oleh: { nama: string } | null;
  ditambah_oleh: { nama: string } | null;
  billing_item_costs?: { harga_modal: number } | null;
};

export type InventoryItemOption = {
  id: string;
  kode: string;
  nama: string;
  jenis: string;
  harga_jual: number;
  stok: number;
};

export type PaymentRow = {
  id: string;
  invoice_id: string;
  metode: string;
  jumlah: number;
  created_at: string;
  dicatat_oleh: { nama: string } | null;
};

export type WorkOrderHeader = {
  id: string;
  nomor: string;
  status: string;
  diskon: number;
  alasan_diskon: string | null;
  kepala_mekanik_id: string;
  customers: { id: string; nama: string; telepon: string } | null;
  vehicles: { plat: string; merek_model: string; tahun: number | null; transmisi: string | null } | null;
  invoices: {
    id: string;
    nomor: string;
    subtotal: number;
    diskon: number;
    total: number;
    terbayar: number;
    status_bayar: string;
    diterbitkan_at: string;
  } | null;
};

const PILIHAN_ALASAN = [
  "Harga khusus pelanggan",
  "Negosiasi",
  "Harga paket",
  "Koreksi harga master",
  "Lainnya",
];

export function TagihanClient({
  wo,
  items,
  inventory,
  payments,
  profil,
}: {
  wo: WorkOrderHeader;
  items: BillingItemRow[];
  inventory: InventoryItemOption[];
  payments: PaymentRow[];
  profil: { id: string; nama: string; peran: Peran };
}) {
  const router = useRouter();
  const supabase = createClient();

  // Dialog states
  const [bukaTambah, setBukaTambah] = useState(false);
  const [bukaEditHarga, setBukaEditHarga] = useState<BillingItemRow | null>(null);
  const [bukaHapus, setBukaHapus] = useState<BillingItemRow | null>(null);
  const [bukaDiskon, setBukaDiskon] = useState(false);
  const [bukaInvoice, setBukaInvoice] = useState(false);
  const [bukaBayar, setBukaBayar] = useState(false);
  const [sedangKirim, setSedangKirim] = useState(false);

  // Form states Tambah Item
  const [tabJenisItem, setTabJenisItem] = useState<"part" | "jasa">("part");
  const [pilihanItemId, setPilihanItemId] = useState<string>("");
  const [jumlahItem, setJumlahItem] = useState<number>(1);

  // Form states Sesuaikan Harga
  const [hargaDipakaiBaru, setHargaDipakaiBaru] = useState<string>("");
  const [kategoriAlasan, setKategoriAlasan] = useState<string>(PILIHAN_ALASAN[0]);
  const [alasanKustom, setAlasanKustom] = useState<string>("");

  // Form states Diskon
  const [diskonBaru, setDiskonBaru] = useState<string>(wo.diskon ? String(wo.diskon) : "0");
  const [alasanDiskon, setAlasanDiskon] = useState<string>(wo.alasan_diskon ?? "");

  // Form states Bayar
  const invoice = wo.invoices;
  const sisaBayar = invoice ? Math.max(0, invoice.total - invoice.terbayar) : 0;
  const [metodeBayar, setMetodeBayar] = useState<string>("tunai");
  const [jumlahBayar, setJumlahBayar] = useState<string>(sisaBayar > 0 ? String(sisaBayar) : "");

  // Perhitungan
  const subtotal = items.reduce((acc, it) => acc + it.jumlah * it.harga_dipakai, 0);
  const diskonAktif = invoice ? invoice.diskon : wo.diskon;
  const total = Math.max(0, subtotal - diskonAktif);

  const isOwner = profil.peran === "owner";
  const isAdmin = profil.peran === "admin";
  const isKepalaMekanik = profil.peran === "kepala_mekanik";
  const invoiceSudahTerbit = !!invoice;

  // Izin aksi
  const bolehKelolaItem =
    !invoiceSudahTerbit &&
    wo.status === "dikerjakan" &&
    (isOwner || (isKepalaMekanik && profil.id === wo.kepala_mekanik_id));

  const bolehSesuaikanHargaDanDiskon = !invoiceSudahTerbit && (isAdmin || isOwner);

  const bolehTerbitkanInvoice =
    !invoiceSudahTerbit && wo.status === "siap_diambil" && (isAdmin || isOwner);

  const bolehCatatPembayaran =
    invoiceSudahTerbit && invoice.status_bayar !== "lunas" && (isAdmin || isOwner);

  // Hitung total modal jika owner
  const totalModal = isOwner
    ? items.reduce((acc, it) => acc + (it.billing_item_costs?.harga_modal ?? 0) * it.jumlah, 0)
    : 0;
  const labaKotor = isOwner ? total - totalModal : 0;

  // Handler: Tambah Item
  async function handleTambahItem(e: React.FormEvent) {
    e.preventDefault();
    if (!pilihanItemId) {
      toast.error("Pilih item terlebih dahulu");
      return;
    }
    if (jumlahItem < 1) {
      toast.error("Jumlah minimal 1");
      return;
    }

    const itemDipilih = inventory.find((i) => i.id === pilihanItemId);
    if (itemDipilih?.jenis === "part" && itemDipilih.stok < jumlahItem) {
      toast.error(`Stok ${itemDipilih.nama} tidak mencukupi (sisa ${itemDipilih.stok})`);
      return;
    }

    setSedangKirim(true);
    try {
      const { error } = await supabase.rpc("tambah_item_tagihan", {
        p_wo: wo.id,
        p_item: pilihanItemId,
        p_jumlah: jumlahItem,
      });

      if (error) {
        toast.error(error.message || "Gagal menambah item tagihan");
        return;
      }

      toast.success("Item berhasil ditambahkan ke tagihan");
      setBukaTambah(false);
      setPilihanItemId("");
      setJumlahItem(1);
      router.refresh();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Terjadi kesalahan");
    } finally {
      setSedangKirim(false);
    }
  }

  // Handler: Hapus Item
  async function handleHapusItem() {
    if (!bukaHapus) return;
    setSedangKirim(true);
    try {
      const { error } = await supabase.rpc("hapus_item_tagihan", {
        p_billing_item: bukaHapus.id,
      });

      if (error) {
        toast.error(error.message || "Gagal menghapus item tagihan");
        return;
      }

      toast.success(`${bukaHapus.nama_item} berhasil dihapus dari tagihan`);
      setBukaHapus(null);
      router.refresh();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Terjadi kesalahan");
    } finally {
      setSedangKirim(false);
    }
  }

  // Handler: Sesuaikan Harga
  async function handleSesuaikanHarga(e: React.FormEvent) {
    e.preventDefault();
    if (!bukaEditHarga) return;

    const hargaBaru = parseInt(hargaDipakaiBaru, 10);
    if (isNaN(hargaBaru) || hargaBaru < 0) {
      toast.error("Harga tidak valid (minimal Rp0)");
      return;
    }

    const alasanFinal =
      kategoriAlasan === "Lainnya" ? alasanKustom.trim() : kategoriAlasan.trim();
    if (!alasanFinal) {
      toast.error("Alasan penyesuaian harga wajib diisi");
      return;
    }

    setSedangKirim(true);
    try {
      const { data: diBawahModal, error } = await supabase.rpc("sesuaikan_harga_item", {
        p_billing_item: bukaEditHarga.id,
        p_harga: hargaBaru,
        p_alasan: alasanFinal,
      });

      if (error) {
        toast.error(error.message || "Gagal menyesuaikan harga");
        return;
      }

      if (diBawahModal) {
        toast.warning("Peringatan: Harga yang dimasukkan berada di bawah harga modal!");
      } else {
        toast.success("Harga berhasil disesuaikan");
      }

      setBukaEditHarga(null);
      router.refresh();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Terjadi kesalahan");
    } finally {
      setSedangKirim(false);
    }
  }

  // Handler: Atur Diskon
  async function handleAturDiskon(e: React.FormEvent) {
    e.preventDefault();
    const diskonNominal = parseInt(diskonBaru, 10);
    if (isNaN(diskonNominal) || diskonNominal < 0) {
      toast.error("Diskon tidak valid (minimal Rp0)");
      return;
    }
    if (diskonNominal > subtotal) {
      toast.error(`Diskon tidak boleh melebihi subtotal (${rupiah(subtotal)})`);
      return;
    }
    if (diskonNominal > 0 && !alasanDiskon.trim()) {
      toast.error("Alasan diskon wajib diisi jika diskon lebih dari Rp0");
      return;
    }

    setSedangKirim(true);
    try {
      const { error } = await supabase.rpc("atur_diskon", {
        p_wo: wo.id,
        p_diskon: diskonNominal,
        p_alasan: alasanDiskon.trim(),
      });

      if (error) {
        toast.error(error.message || "Gagal mengatur diskon");
        return;
      }

      toast.success("Diskon tagihan berhasil disimpan");
      setBukaDiskon(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Terjadi kesalahan");
    } finally {
      setSedangKirim(false);
    }
  }

  // Handler: Terbitkan Invoice
  async function handleTerbitkanInvoice() {
    setSedangKirim(true);
    try {
      const { error } = await supabase.rpc("terbitkan_invoice", {
        p_wo: wo.id,
      });

      if (error) {
        toast.error(error.message || "Gagal menerbitkan invoice");
        return;
      }

      toast.success("Invoice resmi berhasil diterbitkan!");
      setBukaInvoice(false);
      router.push(`/work-orders/${wo.id}/invoice`);
      router.refresh();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Terjadi kesalahan");
    } finally {
      setSedangKirim(false);
    }
  }

  // Handler: Catat Pembayaran
  async function handleCatatPembayaran(e: React.FormEvent) {
    e.preventDefault();
    if (!invoice) return;

    const nominal = parseInt(jumlahBayar, 10);
    if (isNaN(nominal) || nominal <= 0) {
      toast.error("Jumlah pembayaran harus lebih dari Rp0");
      return;
    }
    if (nominal > sisaBayar) {
      toast.error(`Jumlah pembayaran melebihi sisa tagihan (${rupiah(sisaBayar)})`);
      return;
    }

    setSedangKirim(true);
    try {
      const { error } = await supabase.rpc("catat_pembayaran", {
        p_invoice: invoice.id,
        p_metode: metodeBayar,
        p_jumlah: nominal,
      });

      if (error) {
        toast.error(error.message || "Gagal mencatat pembayaran");
        return;
      }

      toast.success("Pembayaran berhasil dicatat");
      setBukaBayar(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Terjadi kesalahan");
    } finally {
      setSedangKirim(false);
    }
  }

  const inventoryTersaring = inventory.filter((i) => i.jenis === tabJenisItem);

  return (
    <div className="space-y-6">
      {/* Header Ringkasan WO */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-text">
              Tagihan · {wo.nomor}
            </h1>
            <BadgeStatus status={wo.status} />
            {invoice && (
              <Badge
                variant={
                  invoice.status_bayar === "lunas"
                    ? "default"
                    : invoice.status_bayar === "sebagian"
                      ? "secondary"
                      : "outline"
                }
                className={
                  invoice.status_bayar === "lunas"
                    ? "bg-success text-white"
                    : invoice.status_bayar === "sebagian"
                      ? "bg-warning text-black"
                      : ""
                }
              >
                {invoice.status_bayar === "lunas"
                  ? "LUNAS"
                  : invoice.status_bayar === "sebagian"
                    ? "SEBAGIAN"
                    : "BELUM BAYAR"}
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {wo.vehicles?.plat} · {wo.vehicles?.merek_model} — Pelanggan:{" "}
            <span className="font-medium text-text">{wo.customers?.nama}</span> ({wo.customers?.telepon})
          </p>
        </div>

        {/* Tombol Aksi Utama */}
        <div className="flex flex-wrap items-center gap-2">
          {invoiceSudahTerbit ? (
            <>
              <Link href={`/work-orders/${wo.id}/invoice`}>
                <Button variant="outline" className="gap-2">
                  <Receipt className="size-4" />
                  Lihat Invoice ({invoice.nomor})
                </Button>
              </Link>
              {bolehCatatPembayaran && (
                <Button
                  onClick={() => {
                    setJumlahBayar(String(sisaBayar));
                    setBukaBayar(true);
                  }}
                  className="gap-2 bg-primary text-primary-foreground"
                >
                  <Coins className="size-4" />
                  + Catat Pembayaran
                </Button>
              )}
            </>
          ) : (
            <>
              {bolehKelolaItem && (
                <Button
                  onClick={() => {
                    setPilihanItemId("");
                    setJumlahItem(1);
                    setBukaTambah(true);
                  }}
                  className="gap-2 bg-primary text-primary-foreground"
                >
                  <Plus className="size-4" />
                  Tambah Item
                </Button>
              )}
              {bolehSesuaikanHargaDanDiskon && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setDiskonBaru(wo.diskon ? String(wo.diskon) : "0");
                    setAlasanDiskon(wo.alasan_diskon ?? "");
                    setBukaDiskon(true);
                  }}
                  className="gap-2"
                >
                  <Pencil className="size-4" />
                  Atur Diskon
                </Button>
              )}
              {bolehTerbitkanInvoice && (
                <Button
                  onClick={() => setBukaInvoice(true)}
                  className="gap-2 bg-success text-white hover:bg-success/90"
                >
                  <CheckCircle2 className="size-4" />
                  Terbitkan Invoice
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Informasi status kunci tagihan */}
      {invoiceSudahTerbit && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
          <Info className="size-4 shrink-0" />
          <span>
            Invoice resmi <strong>{invoice.nomor}</strong> telah diterbitkan pada{" "}
            {tanggal(invoice.diterbitkan_at)}. Rincian tagihan sudah terkunci dan tidak dapat diubah lagi.
          </span>
        </div>
      )}

      {/* Grid: Tabel Tagihan (kiri) & Ringkasan Biaya (kanan) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Tabel Rincian Item Tagihan */}
        <div className="space-y-4 lg:col-span-2">
          <Card className="py-0">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
              <CardTitle className="text-base font-semibold">
                Rincian Tagihan ({items.length} item)
              </CardTitle>
              {bolehKelolaItem && (
                <span className="text-xs text-text-muted">
                  Status WO dikerjakan · Item dapat ditambah/dihapus
                </span>
              )}
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Item</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead className="text-right">Harga Master</TableHead>
                  <TableHead className="text-right">Harga Dipakai</TableHead>
                  {isOwner && <TableHead className="text-right">Modal</TableHead>}
                  {isOwner && <TableHead className="text-right">Laba</TableHead>}
                  <TableHead className="text-right pr-4">Subtotal</TableHead>
                  {!invoiceSudahTerbit && (bolehKelolaItem || bolehSesuaikanHargaDanDiskon) && (
                    <TableHead className="w-[80px] text-center">Aksi</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={!invoiceSudahTerbit ? (isOwner ? 9 : 7) : isOwner ? 8 : 6}
                      className="py-12 text-center text-text-muted"
                    >
                      Belum ada spare part atau jasa yang dicatat pada Work Order ini.
                      {bolehKelolaItem && (
                        <div className="mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setPilihanItemId("");
                              setJumlahItem(1);
                              setBukaTambah(true);
                            }}
                          >
                            <Plus className="mr-1.5 size-3.5" />
                            Tambah Sekarang
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((it) => {
                    const sub = it.jumlah * it.harga_dipakai;
                    const disesuaikan = it.harga_dipakai !== it.harga_master;
                    const modal = it.billing_item_costs?.harga_modal ?? 0;
                    const labaItem = (it.harga_dipakai - modal) * it.jumlah;

                    return (
                      <TableRow key={it.id}>
                        <TableCell className="pl-4 font-medium">
                          <div className="flex items-center gap-1.5">
                            <span>{it.nama_item}</span>
                            {disesuaikan && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex items-center text-warning hover:opacity-80"
                                    aria-label="Rincian penyesuaian harga"
                                  >
                                    <Info className="size-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs space-y-1 text-xs">
                                  <p className="font-semibold text-warning">Harga Disesuaikan</p>
                                  <p>Alasan: {it.alasan_penyesuaian}</p>
                                  {it.disesuaikan_oleh?.nama && (
                                    <p>Oleh: {it.disesuaikan_oleh.nama}</p>
                                  )}
                                  {it.disesuaikan_at && (
                                    <p className="text-[10px] opacity-75">
                                      {tanggal(it.disesuaikan_at)}
                                    </p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={it.jenis === "part" ? "secondary" : "outline"}
                            className="text-xs"
                          >
                            {it.jenis === "part" ? "Spare Part" : "Jasa"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{it.jumlah}</TableCell>
                        <TableCell className="text-right tabular-nums text-text-muted">
                          {rupiah(it.harga_master)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          <span className={disesuaikan ? "text-primary font-semibold" : ""}>
                            {rupiah(it.harga_dipakai)}
                          </span>
                        </TableCell>
                        {isOwner && (
                          <TableCell className="text-right tabular-nums text-text-muted">
                            {rupiah(modal)}
                          </TableCell>
                        )}
                        {isOwner && (
                          <TableCell
                            className={`text-right tabular-nums font-medium ${
                              labaItem < 0 ? "text-danger" : "text-success"
                            }`}
                          >
                            {rupiah(labaItem)}
                          </TableCell>
                        )}
                        <TableCell className="pr-4 text-right tabular-nums font-semibold">
                          {rupiah(sub)}
                        </TableCell>
                        {!invoiceSudahTerbit && (bolehKelolaItem || bolehSesuaikanHargaDanDiskon) && (
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {bolehSesuaikanHargaDanDiskon && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon-sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setBukaEditHarga(it);
                                        setHargaDipakaiBaru(String(it.harga_dipakai));
                                        if (PILIHAN_ALASAN.includes(it.alasan_penyesuaian ?? "")) {
                                          setKategoriAlasan(it.alasan_penyesuaian!);
                                          setAlasanKustom("");
                                        } else if (it.alasan_penyesuaian) {
                                          setKategoriAlasan("Lainnya");
                                          setAlasanKustom(it.alasan_penyesuaian);
                                        } else {
                                          setKategoriAlasan(PILIHAN_ALASAN[0]);
                                          setAlasanKustom("");
                                        }
                                      }}
                                    >
                                      <Pencil className="size-3.5 text-text-muted hover:text-text" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Sesuaikan Harga</TooltipContent>
                                </Tooltip>
                              )}
                              {bolehKelolaItem && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon-sm"
                                      variant="ghost"
                                      onClick={() => setBukaHapus(it)}
                                    >
                                      <Trash2 className="size-3.5 text-danger hover:opacity-80" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Hapus Item</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Riwayat Pembayaran jika ada */}
          {payments.length > 0 && (
            <Card className="py-0">
              <CardHeader className="border-b pb-3">
                <CardTitle className="text-base font-semibold">
                  Riwayat Pembayaran ({payments.length})
                </CardTitle>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Tanggal</TableHead>
                    <TableHead>Metode</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="pr-4">Dicatat Oleh</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="pl-4 text-sm text-text-muted">
                        {tanggal(p.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {p.metode}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-success">
                        {rupiah(p.jumlah)}
                      </TableCell>
                      <TableCell className="pr-4 text-sm">
                        {p.dicatat_oleh?.nama ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </div>

        {/* Ringkasan Biaya & Status Pembayaran (Kolom Kanan) */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Ringkasan Biaya</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Subtotal Tagihan</span>
                <span className="tabular-nums font-medium text-text">{rupiah(subtotal)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <div className="space-y-0.5">
                  <span className="text-text-muted">Diskon</span>
                  {wo.alasan_diskon && (
                    <p className="text-[11px] text-text-muted italic">
                      Ket: {wo.alasan_diskon}
                    </p>
                  )}
                </div>
                <span className="tabular-nums font-medium text-danger">
                  {diskonAktif > 0 ? `-${rupiah(diskonAktif)}` : "Rp0"}
                </span>
              </div>

              <div className="border-t pt-3 flex justify-between text-base font-bold text-text">
                <span>Total</span>
                <span className="tabular-nums text-primary text-lg">{rupiah(total)}</span>
              </div>

              {invoice && (
                <>
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Sudah Dibayar</span>
                      <span className="tabular-nums font-medium text-success">
                        {rupiah(invoice.terbayar)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-text">Sisa Tagihan</span>
                      <span
                        className={`tabular-nums ${
                          sisaBayar > 0 ? "text-danger" : "text-success"
                        }`}
                      >
                        {rupiah(sisaBayar)}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {isOwner && (
                <div className="rounded-lg bg-muted/60 p-3 mt-4 space-y-1.5 text-xs">
                  <div className="flex justify-between font-medium text-text-muted">
                    <span>Total Modal (Rahasia)</span>
                    <span className="tabular-nums">{rupiah(totalModal)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-text">
                    <span>Estimasi Laba Kotor</span>
                    <span
                      className={`tabular-nums ${
                        labaKotor < 0 ? "text-danger" : "text-success"
                      }`}
                    >
                      {rupiah(labaKotor)}
                    </span>
                  </div>
                </div>
              )}

              {/* Tombol Terbitkan / Bayar di card kanan */}
              <div className="pt-2">
                {bolehTerbitkanInvoice && (
                  <Button
                    onClick={() => setBukaInvoice(true)}
                    className="w-full gap-2 bg-success text-white hover:bg-success/90"
                  >
                    <CheckCircle2 className="size-4" />
                    Terbitkan Invoice Resmi
                  </Button>
                )}
                {bolehCatatPembayaran && (
                  <Button
                    onClick={() => {
                      setJumlahBayar(String(sisaBayar));
                      setBukaBayar(true);
                    }}
                    className="w-full gap-2 bg-primary text-primary-foreground"
                  >
                    <Coins className="size-4" />
                    + Catat Pembayaran ({rupiah(sisaBayar)})
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ========================================================== */}
      {/* DIALOG 1: Tambah Item Tagihan */}
      {/* ========================================================== */}
      <Dialog open={bukaTambah} onOpenChange={setBukaTambah}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Item ke Tagihan</DialogTitle>
            <DialogDescription>
              Pilih spare part atau jasa untuk ditambahkan pada pengerjaan WO ini.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTambahItem} className="space-y-4">
            <Tabs
              value={tabJenisItem}
              onValueChange={(v) => {
                setTabJenisItem(v as "part" | "jasa");
                setPilihanItemId("");
              }}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="part">Spare Part</TabsTrigger>
                <TabsTrigger value="jasa">Jasa Servis</TabsTrigger>
              </TabsList>
            </Tabs>

            <FieldGroup>
              <Field>
                <FieldLabel>
                  {tabJenisItem === "part" ? "Pilih Spare Part *" : "Pilih Jasa *"}
                </FieldLabel>
                <Select value={pilihanItemId} onValueChange={setPilihanItemId}>
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={
                        tabJenisItem === "part"
                          ? "-- Pilih Spare Part --"
                          : "-- Pilih Jasa Servis --"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryTersaring.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.nama} — {rupiah(i.harga_jual)}{" "}
                        {i.jenis === "part" && `(Stok: ${i.stok})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel>Jumlah *</FieldLabel>
                <Input
                  type="number"
                  min="1"
                  value={jumlahItem}
                  onChange={(e) => setJumlahItem(parseInt(e.target.value, 10) || 1)}
                  required
                />
              </Field>
            </FieldGroup>

            {pilihanItemId && (
              <div className="rounded-md bg-muted p-2.5 text-xs text-text-muted">
                {(() => {
                  const it = inventory.find((i) => i.id === pilihanItemId);
                  if (!it) return null;
                  const totalEst = it.harga_jual * jumlahItem;
                  return (
                    <div className="flex justify-between">
                      <span>Perkiraan Biaya:</span>
                      <span className="font-semibold text-text">{rupiah(totalEst)}</span>
                    </div>
                  );
                })()}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setBukaTambah(false)}
                disabled={sedangKirim}
              >
                Batal
              </Button>
              <Button type="submit" disabled={sedangKirim || !pilihanItemId}>
                {sedangKirim ? "Menyimpan..." : "Tambah ke Tagihan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================== */}
      {/* DIALOG 2: Hapus Item Tagihan */}
      {/* ========================================================== */}
      <AlertDialog open={!!bukaHapus} onOpenChange={(open) => !open && setBukaHapus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Item Tagihan?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus <strong>{bukaHapus?.nama_item}</strong> (
              {bukaHapus?.jumlah}x) dari tagihan?
              {bukaHapus?.jenis === "part" && (
                <span className="mt-1 block text-primary">
                  Stok spare part akan dikembalikan otomatis ke inventaris.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sedangKirim}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleHapusItem}
              disabled={sedangKirim}
              className="bg-danger text-white hover:bg-danger/90"
            >
              {sedangKirim ? "Menghapus..." : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ========================================================== */}
      {/* DIALOG 3: Sesuaikan Harga Item */}
      {/* ========================================================== */}
      <Dialog open={!!bukaEditHarga} onOpenChange={(open) => !open && setBukaEditHarga(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Sesuaikan Harga Item</DialogTitle>
            <DialogDescription>
              Ubah harga yang dipakai untuk <strong>{bukaEditHarga?.nama_item}</strong>. Harga
              master di inventaris tidak akan berubah.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSesuaikanHarga} className="space-y-4">
            <div className="rounded-md bg-muted p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-text-muted">Harga Master Baku:</span>
                <span className="font-semibold text-text">
                  {rupiah(bukaEditHarga?.harga_master ?? 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Jumlah:</span>
                <span className="font-semibold text-text">{bukaEditHarga?.jumlah}</span>
              </div>
            </div>

            <FieldGroup>
              <Field>
                <FieldLabel>Harga Satuan Dipakai (Rp) *</FieldLabel>
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  value={hargaDipakaiBaru}
                  onChange={(e) => setHargaDipakaiBaru(e.target.value)}
                  placeholder="Contoh: 150000"
                  required
                />
              </Field>

              <Field>
                <FieldLabel>Pilih Alasan Penyesuaian *</FieldLabel>
                <Select value={kategoriAlasan} onValueChange={setKategoriAlasan}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih alasan..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PILIHAN_ALASAN.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {kategoriAlasan === "Lainnya" && (
                <Field>
                  <FieldLabel>Tuliskan Alasan Lengkap *</FieldLabel>
                  <Textarea
                    value={alasanKustom}
                    onChange={(e) => setAlasanKustom(e.target.value)}
                    placeholder="Contoh: Diskon promosi pembukaan atau permintaan khusus..."
                    required
                  />
                </Field>
              )}
            </FieldGroup>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setBukaEditHarga(null)}
                disabled={sedangKirim}
              >
                Batal
              </Button>
              <Button type="submit" disabled={sedangKirim}>
                {sedangKirim ? "Menyimpan..." : "Simpan Penyesuaian"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================== */}
      {/* DIALOG 4: Atur Diskon */}
      {/* ========================================================== */}
      <Dialog open={bukaDiskon} onOpenChange={setBukaDiskon}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Atur Diskon Work Order</DialogTitle>
            <DialogDescription>
              Berikan potongan harga global untuk Work Order ini sebelum invoice resmi diterbitkan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAturDiskon} className="space-y-4">
            <div className="rounded-md bg-muted p-3 text-xs flex justify-between">
              <span className="text-text-muted">Subtotal Tagihan Saat Ini:</span>
              <span className="font-semibold text-text">{rupiah(subtotal)}</span>
            </div>

            <FieldGroup>
              <Field>
                <FieldLabel>Nominal Diskon (Rp) *</FieldLabel>
                <Input
                  type="number"
                  min="0"
                  max={subtotal}
                  step="1000"
                  value={diskonBaru}
                  onChange={(e) => setDiskonBaru(e.target.value)}
                  placeholder="0"
                  required
                />
              </Field>

              <Field>
                <FieldLabel>
                  Alasan Diskon {parseInt(diskonBaru, 10) > 0 ? "*" : "(Opsional)"}
                </FieldLabel>
                <Input
                  type="text"
                  value={alasanDiskon}
                  onChange={(e) => setAlasanDiskon(e.target.value)}
                  placeholder="Contoh: Voucher pelanggan setia, promo bulanan..."
                  required={parseInt(diskonBaru, 10) > 0}
                />
              </Field>
            </FieldGroup>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setBukaDiskon(false)}
                disabled={sedangKirim}
              >
                Batal
              </Button>
              <Button type="submit" disabled={sedangKirim}>
                {sedangKirim ? "Menyimpan..." : "Simpan Diskon"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================== */}
      {/* DIALOG 5: Konfirmasi Terbitkan Invoice */}
      {/* ========================================================== */}
      <AlertDialog open={bukaInvoice} onOpenChange={setBukaInvoice}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terbitkan Invoice Resmi?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Status Work Order adalah <strong>siap diambil</strong>. Setelah invoice
                  diterbitkan:
                </p>
                <ul className="list-disc pl-5 text-xs text-text-muted space-y-1">
                  <li>Nomor invoice resmi otomatis bernomor format <code>INV-YYYYMM-XXXX</code>.</li>
                  <li>Rincian item tagihan dan diskon akan <strong>terkunci secara permanen</strong>.</li>
                  <li>Invoice siap dicetak dan pembayaran dapat dicatat.</li>
                </ul>
                <div className="rounded-md bg-muted p-2.5 text-xs font-medium text-text mt-2">
                  Total Tagihan: <span className="font-bold text-primary">{rupiah(total)}</span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sedangKirim}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTerbitkanInvoice}
              disabled={sedangKirim}
              className="bg-success text-white hover:bg-success/90"
            >
              {sedangKirim ? "Menerbitkan..." : "Ya, Terbitkan Invoice"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ========================================================== */}
      {/* DIALOG 6: Catat Pembayaran */}
      {/* ========================================================== */}
      <Dialog open={bukaBayar} onOpenChange={setBukaBayar}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Catat Pembayaran Invoice</DialogTitle>
            <DialogDescription>
              Catat penerimaan pembayaran dari pelanggan untuk invoice{" "}
              <strong>{invoice?.nomor}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCatatPembayaran} className="space-y-4">
            <div className="rounded-md bg-muted p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-text-muted">Total Invoice:</span>
                <span className="font-semibold text-text">{rupiah(invoice?.total ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Sudah Dibayar:</span>
                <span className="font-semibold text-success">
                  {rupiah(invoice?.terbayar ?? 0)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-1 font-bold">
                <span>Sisa Tagihan:</span>
                <span className="text-danger">{rupiah(sisaBayar)}</span>
              </div>
            </div>

            <FieldGroup>
              <Field>
                <FieldLabel>Metode Pembayaran *</FieldLabel>
                <Select value={metodeBayar} onValueChange={setMetodeBayar}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih metode..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tunai">Tunai / Cash</SelectItem>
                    <SelectItem value="transfer">Transfer Bank</SelectItem>
                    <SelectItem value="qris">QRIS</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel>Jumlah Pembayaran (Rp) *</FieldLabel>
                  <button
                    type="button"
                    onClick={() => setJumlahBayar(String(sisaBayar))}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    Bayar Lunas ({rupiah(sisaBayar)})
                  </button>
                </div>
                <Input
                  type="number"
                  min="1"
                  max={sisaBayar}
                  value={jumlahBayar}
                  onChange={(e) => setJumlahBayar(e.target.value)}
                  placeholder={`Maksimal ${sisaBayar}`}
                  required
                />
              </Field>
            </FieldGroup>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setBukaBayar(false)}
                disabled={sedangKirim}
              >
                Batal
              </Button>
              <Button type="submit" disabled={sedangKirim || !jumlahBayar}>
                {sedangKirim ? "Menyimpan..." : "Catat Pembayaran"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

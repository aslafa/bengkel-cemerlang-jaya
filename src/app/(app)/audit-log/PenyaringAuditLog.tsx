"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface OpsiPelaku {
  id: string;
  nama: string;
  role: string;
}

const DAFTAR_TABEL = [
  { value: "work_orders", label: "Work Orders (work_orders)" },
  { value: "billing_items", label: "Item Tagihan (billing_items)" },
  { value: "billing_item_costs", label: "Modal Tagihan (billing_item_costs)" },
  { value: "inventory_items", label: "Inventory Item (inventory_items)" },
  { value: "inventory_costs", label: "Modal Inventory (inventory_costs)" },
  { value: "invoices", label: "Invoice (invoices)" },
  { value: "payments", label: "Pembayaran (payments)" },
  { value: "stock_movements", label: "Riwayat Stok (stock_movements)" },
  { value: "profiles", label: "Profil Akun (profiles)" },
];

export function PenyaringAuditLog({ daftarPelaku }: { daftarPelaku: OpsiPelaku[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabelSaatIni = searchParams.get("tabel") || "semua";
  const pelakuSaatIni = searchParams.get("pelaku") || "semua";
  const aksiSaatIni = searchParams.get("aksi") || "semua";

  const perbaruiFilter = (kunci: string, nilai: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    if (nilai === "semua" || !nilai) {
      sp.delete(kunci);
    } else {
      sp.set(kunci, nilai);
    }
    sp.delete("hal"); // Reset ke halaman 1 saat filter diubah
    router.push(`?${sp.toString()}`);
  };

  const resetFilter = () => {
    router.push("/audit-log");
  };

  const adaFilterAktif = tabelSaatIni !== "semua" || pelakuSaatIni !== "semua" || aksiSaatIni !== "semua";

  return (
    <div className="flex flex-wrap items-center gap-3 bg-bg-panel p-4 rounded-xl border border-border shadow-card">
      <div className="flex items-center gap-2 text-sm font-medium text-text mr-1">
        <Filter className="size-4 text-primary" />
        <span>Penyaring:</span>
      </div>

      {/* Filter Tabel */}
      <div className="w-full sm:w-56">
        <Select
          value={tabelSaatIni}
          onValueChange={(val) => perbaruiFilter("tabel", val)}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Pilih Tabel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Tabel</SelectItem>
            {DAFTAR_TABEL.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filter Pelaku */}
      <div className="w-full sm:w-52">
        <Select
          value={pelakuSaatIni}
          onValueChange={(val) => perbaruiFilter("pelaku", val)}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Pilih Pelaku" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Pelaku</SelectItem>
            {daftarPelaku.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nama} ({p.role})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filter Aksi */}
      <div className="w-full sm:w-36">
        <Select
          value={aksiSaatIni}
          onValueChange={(val) => perbaruiFilter("aksi", val)}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Semua Aksi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua Aksi</SelectItem>
            <SelectItem value="INSERT">INSERT (Tambah)</SelectItem>
            <SelectItem value="UPDATE">UPDATE (Ubah)</SelectItem>
            <SelectItem value="DELETE">DELETE (Hapus)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {adaFilterAktif && (
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFilter}
          className="h-9 gap-1.5 text-xs text-text-muted hover:text-danger hover:bg-danger/10"
        >
          <RotateCcw className="size-3.5" />
          Reset Filter
        </Button>
      )}
    </div>
  );
}

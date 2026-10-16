"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Calendar, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PenyaringPeriodeLaba({
  dariAwal,
  sampaiAwal,
}: {
  dariAwal: string;
  sampaiAwal: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [dari, setDari] = useState(dariAwal);
  const [sampai, setSampai] = useState(sampaiAwal);

  const terapkanFilter = (d: string, s: string) => {
    const sp = new URLSearchParams(searchParams.toString());
    sp.set("dari", d);
    sp.set("sampai", s);
    router.push(`?${sp.toString()}`);
  };

  const pilihPreset = (jenis: "bulan_ini" | "30_hari" | "bulan_lalu" | "tahun_ini") => {
    const sekarang = new Date();
    const tahun = sekarang.getFullYear();
    const bulan = sekarang.getMonth(); // 0-indexed

    let d = "";
    let s = "";

    if (jenis === "bulan_ini") {
      const blnStr = String(bulan + 1).padStart(2, "0");
      const tglStr = String(sekarang.getDate()).padStart(2, "0");
      d = `${tahun}-${blnStr}-01`;
      s = `${tahun}-${blnStr}-${tglStr}`;
    } else if (jenis === "30_hari") {
      const lalu = new Date(sekarang.getTime() - 30 * 24 * 60 * 60 * 1000);
      d = lalu.toISOString().slice(0, 10);
      s = sekarang.toISOString().slice(0, 10);
    } else if (jenis === "bulan_lalu") {
      const blnLalu = bulan === 0 ? 11 : bulan - 1;
      const thnLalu = bulan === 0 ? tahun - 1 : tahun;
      const blnStr = String(blnLalu + 1).padStart(2, "0");
      const akhirBln = new Date(thnLalu, blnLalu + 1, 0).getDate();
      d = `${thnLalu}-${blnStr}-01`;
      s = `${thnLalu}-${blnStr}-${String(akhirBln).padStart(2, "0")}`;
    } else if (jenis === "tahun_ini") {
      const blnStr = String(bulan + 1).padStart(2, "0");
      const tglStr = String(sekarang.getDate()).padStart(2, "0");
      d = `${tahun}-01-01`;
      s = `${tahun}-${blnStr}-${tglStr}`;
    }

    setDari(d);
    setSampai(s);
    terapkanFilter(d, s);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-bg-panel p-4 rounded-xl border border-border shadow-card">
      {/* Preset Tombol Cepat */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-medium text-text-muted mr-1 flex items-center gap-1">
          <Calendar className="size-3.5 text-primary" />
          Periode:
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => pilihPreset("bulan_ini")}
          className="h-8 text-xs hover:border-primary hover:text-primary"
        >
          Bulan Ini
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => pilihPreset("30_hari")}
          className="h-8 text-xs hover:border-primary hover:text-primary"
        >
          30 Hari Terakhir
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => pilihPreset("bulan_lalu")}
          className="h-8 text-xs hover:border-primary hover:text-primary"
        >
          Bulan Lalu
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => pilihPreset("tahun_ini")}
          className="h-8 text-xs hover:border-primary hover:text-primary"
        >
          Tahun Ini
        </Button>
      </div>

      {/* Input Tanggal Kustom */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          terapkanFilter(dari, sampai);
        }}
        className="flex items-center gap-2"
      >
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            value={dari}
            onChange={(e) => setDari(e.target.value)}
            className="h-8 text-xs w-36"
            required
          />
          <span className="text-xs text-text-muted">s/d</span>
          <Input
            type="date"
            value={sampai}
            onChange={(e) => setSampai(e.target.value)}
            className="h-8 text-xs w-36"
            required
          />
        </div>
        <Button type="submit" size="sm" className="h-8 text-xs gap-1">
          <Filter className="size-3" />
          Terapkan
        </Button>
      </form>
    </div>
  );
}

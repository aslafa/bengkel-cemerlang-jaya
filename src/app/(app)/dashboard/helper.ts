export type PeriodeDashboard = "hari_ini" | "7_hari" | "30_hari" | "bulan_ini" | "kustom";

export interface InfoPeriode {
  dari: string;
  sampai: string;
  label: string;
  periode: PeriodeDashboard;
}

/**
 * Menghitung tanggal awal dan akhir berdasarkan preset periode dalam zona waktu Asia/Jakarta (WIB).
 */
export function hitungPeriode(
  periodeKey = "30_hari",
  customDari?: string,
  customSampai?: string
): InfoPeriode {
  if (periodeKey === "kustom" && customDari && customSampai) {
    return {
      dari: customDari,
      sampai: customSampai,
      label: "Rentang Kustom",
      periode: "kustom",
    };
  }

  // Waktu saat ini di WIB
  const now = new Date();
  const wibString = now.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }); // format YYYY-MM-DD
  const [thnStr, blnStr, tglStr] = wibString.split("-");
  const tahun = parseInt(thnStr, 10);
  const bulan = parseInt(blnStr, 10);
  const tgl = parseInt(tglStr, 10);

  const hariIni = wibString;

  if (periodeKey === "hari_ini") {
    return {
      dari: hariIni,
      sampai: hariIni,
      label: "Hari Ini",
      periode: "hari_ini",
    };
  }

  if (periodeKey === "7_hari") {
    const d = new Date(Date.UTC(tahun, bulan - 1, tgl));
    d.setUTCDate(d.getUTCDate() - 6);
    const dari = d.toISOString().slice(0, 10);
    return {
      dari,
      sampai: hariIni,
      label: "7 Hari Terakhir",
      periode: "7_hari",
    };
  }

  if (periodeKey === "bulan_ini") {
    const blnPad = String(bulan).padStart(2, "0");
    const dari = `${tahun}-${blnPad}-01`;
    return {
      dari,
      sampai: hariIni,
      label: "Bulan Ini",
      periode: "bulan_ini",
    };
  }

  // Bawaan: 30 hari terakhir
  const d = new Date(Date.UTC(tahun, bulan - 1, tgl));
  d.setUTCDate(d.getUTCDate() - 29);
  const dari = d.toISOString().slice(0, 10);
  return {
    dari,
    sampai: hariIni,
    label: "30 Hari Terakhir",
    periode: "30_hari",
  };
}

/**
 * Menghitung persentase perubahan dibanding periode sebelumnya
 */
export function hitungPerubahan(sekarang: number, sebelumnya: number) {
  if (sebelumnya === 0) {
    if (sekarang === 0) return { persen: 0, arah: "sama" as const };
    return { persen: 100, arah: "naik" as const };
  }
  const diff = ((sekarang - sebelumnya) / Math.abs(sebelumnya)) * 100;
  if (Math.abs(diff) < 0.1) return { persen: 0, arah: "sama" as const };
  return {
    persen: Math.abs(Math.round(diff * 10) / 10),
    arah: diff > 0 ? ("naik" as const) : ("turun" as const),
  };
}

/**
 * Format tanggal pendek untuk sumbu grafik (misal: "16 Okt")
 */
export function tanggalPendek(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  });
}

import type { Peran } from "@/lib/peran";
import type { StatusWO } from "@/lib/status-wo";

/**
 * Memeriksa apakah WO terlambat (PRD 6.6):
 * Tanggal estimasi sudah lewat (sebelum hari ini), tetapi status belum selesai/diambil/dibatalkan.
 */
export function isWOTerlambat(status: string, estimasiSelesai: string | null | undefined): boolean {
  if (!estimasiSelesai) return false;
  const statusAktif = ["menunggu", "dikerjakan", "tertunda"];
  if (!statusAktif.includes(status)) return false;

  const hariIni = new Date();
  hariIni.setHours(0, 0, 0, 0);

  const tglEstimasi = new Date(estimasiSelesai);
  tglEstimasi.setHours(0, 0, 0, 0);

  return tglEstimasi.getTime() < hariIni.getTime();
}

/**
 * Format nomor HP ke link WhatsApp
 */
export function linkWhatsApp(telepon: string, pesan?: string): string {
  let nomor = telepon.replace(/\D/g, "");
  if (nomor.startsWith("0")) {
    nomor = "62" + nomor.slice(1);
  }
  const baseUrl = `https://wa.me/${nomor}`;
  if (pesan) {
    return `${baseUrl}?text=${encodeURIComponent(pesan)}`;
  }
  return baseUrl;
}

/**
 * Memeriksa apakah perpindahan status diizinkan untuk peran dan tim saat ini (PRD 7.2).
 */
export function bolehUbahStatus(params: {
  statusSekarang: StatusWO;
  statusTarget: StatusWO;
  peran: Peran;
  kepalaMekanikIdWO: string;
  userId: string;
  hasMechanic?: boolean;
  hasEstimation?: boolean;
  hasBillingItem?: boolean;
  isInvoiceLunas?: boolean;
  hasFinalPhoto?: boolean;
}): { boleh: boolean; alasan?: string } {
  const {
    statusSekarang,
    statusTarget,
    peran,
    kepalaMekanikIdWO,
    userId,
    hasMechanic,
    hasEstimation,
    hasBillingItem,
    isInvoiceLunas,
    hasFinalPhoto,
  } = params;

  const isTimWO = peran === "owner" || (peran === "kepala_mekanik" && kepalaMekanikIdWO === userId);
  const isAdminOrOwner = peran === "admin" || peran === "owner";

  // 1. menunggu -> dikerjakan
  if (statusSekarang === "menunggu" && statusTarget === "dikerjakan") {
    if (!isTimWO) return { boleh: false, alasan: "Hanya Kepala Mekanik tim ini atau Owner" };
    if (!hasMechanic || !hasEstimation) {
      return { boleh: false, alasan: "Minimal 1 mekanik dan estimasi selesai harus diisi" };
    }
    return { boleh: true };
  }

  // 2. dikerjakan -> tertunda
  if (statusSekarang === "dikerjakan" && statusTarget === "tertunda") {
    if (!isTimWO) return { boleh: false, alasan: "Hanya Kepala Mekanik tim ini atau Owner" };
    return { boleh: true };
  }

  // 3. tertunda -> dikerjakan
  if (statusSekarang === "tertunda" && statusTarget === "dikerjakan") {
    if (!isTimWO) return { boleh: false, alasan: "Hanya Kepala Mekanik tim ini atau Owner" };
    return { boleh: true };
  }

  // 4. dikerjakan -> selesai
  if (statusSekarang === "dikerjakan" && statusTarget === "selesai") {
    if (!isTimWO) return { boleh: false, alasan: "Hanya Kepala Mekanik tim ini atau Owner" };
    if (!hasBillingItem) {
      return { boleh: false, alasan: "Catat minimal 1 jasa atau spare part terlebih dahulu" };
    }
    return { boleh: true };
  }

  // 5. selesai -> siap_diambil (QC Lulus)
  if (statusSekarang === "selesai" && statusTarget === "siap_diambil") {
    if (!isTimWO) return { boleh: false, alasan: "Hanya Kepala Mekanik tim ini atau Owner" };
    return { boleh: true };
  }

  // 6. selesai -> dikerjakan (QC Gagal)
  if (statusSekarang === "selesai" && statusTarget === "dikerjakan") {
    if (!isTimWO) return { boleh: false, alasan: "Hanya Kepala Mekanik tim ini atau Owner" };
    return { boleh: true };
  }

  // 7. siap_diambil -> diambil
  if (statusSekarang === "siap_diambil" && statusTarget === "diambil") {
    if (!isAdminOrOwner) return { boleh: false, alasan: "Hanya Admin atau Owner" };
    if (!isInvoiceLunas) return { boleh: false, alasan: "Invoice harus berstatus lunas" };
    if (!hasFinalPhoto) return { boleh: false, alasan: "Wajib unggah minimal 1 foto kondisi akhir" };
    return { boleh: true };
  }

  // 8. menunggu, dikerjakan, tertunda -> dibatalkan
  if (["menunggu", "dikerjakan", "tertunda"].includes(statusSekarang) && statusTarget === "dibatalkan") {
    if (!isAdminOrOwner) return { boleh: false, alasan: "Hanya Admin atau Owner" };
    return { boleh: true };
  }

  return { boleh: false, alasan: "Perpindahan status tidak diizinkan" };
}

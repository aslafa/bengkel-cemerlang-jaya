import { Suspense } from "react";
import { ambilProfilSaya } from "@/lib/profil";
import { createClient } from "@/lib/supabase/server";
import { hitungPeriode, type PeriodeDashboard } from "./helper";
import { PenyaringPeriodeDashboard } from "./PenyaringPeriodeDashboard";
import { DashboardOwner } from "./DashboardOwner";
import { DashboardAdmin } from "./DashboardAdmin";
import { DashboardMekanik } from "./DashboardMekanik";
import { DashboardSkeleton } from "./DashboardSkeleton";

export const dynamic = "force-dynamic";

interface DashboardPageProps {
  searchParams: Promise<{
    periode?: string;
    dari?: string;
    sampai?: string;
  }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const profil = await ambilProfilSaya();
  const params = await searchParams;

  const periodeKey = (params.periode as PeriodeDashboard) || "30_hari";
  const infoPeriode = hitungPeriode(periodeKey, params.dari, params.sampai);

  return (
    <div className="space-y-6">
      {/* Header Halaman & Filter Periode di Kanan Atas (PRD 12.1) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-text">Dashboard</h1>

        <PenyaringPeriodeDashboard
          periodeAktif={infoPeriode.periode}
          dariAwal={infoPeriode.dari}
          sampaiAwal={infoPeriode.sampai}
        />
      </div>

      {/* Konten Dashboard Sesuai Peran Pengguna (PRD 12.2, 12.3, 12.4) */}
      <Suspense fallback={<DashboardSkeleton jumlahKartu={profil.peran === "owner" ? 6 : 4} />}>
        <KontenDashboard
          peran={profil.peran}
          userId={profil.id}
          dari={infoPeriode.dari}
          sampai={infoPeriode.sampai}
          labelPeriode={infoPeriode.label}
        />
      </Suspense>
    </div>
  );
}

async function KontenDashboard({
  peran,
  userId,
  dari,
  sampai,
  labelPeriode,
}: {
  peran: string;
  userId: string;
  dari: string;
  sampai: string;
  labelPeriode: string;
}) {
  const supabase = await createClient();

  // =========================================================================
  // 1. DASHBOARD OWNER (PRD 12.2)
  // =========================================================================
  if (peran === "owner") {
    const [
      resRingkasan,
      resLabaHarian,
      resPendapatanHarian,
      resWoStatus,
      resBebanMekanik,
      resTopPart,
      resTopJasa,
      resAudit,
      resWoTerlambat,
      resStokMenipis,
    ] = await Promise.all([
      supabase.rpc("dashboard_ringkasan", { p_dari: dari, p_sampai: sampai }),
      supabase.rpc("dashboard_laba_harian", { p_dari: dari, p_sampai: sampai }),
      supabase.rpc("dashboard_pendapatan_harian", { p_dari: dari, p_sampai: sampai }),
      supabase.rpc("dashboard_wo_per_status", {}),
      supabase.rpc("dashboard_beban_mekanik", { p_dari: dari, p_sampai: sampai }),
      supabase.rpc("dashboard_top_item", {
        p_dari: dari,
        p_sampai: sampai,
        p_jenis: "part",
      }),
      supabase.rpc("dashboard_top_item", {
        p_dari: dari,
        p_sampai: sampai,
        p_jenis: "jasa",
      }),
      supabase
        .from("audit_logs")
        .select("id, waktu, aksi, tabel, pelaku_peran, alasan, data_id")
        .order("waktu", { ascending: false })
        .limit(8),
      supabase
        .from("work_orders")
        .select("id, nomor, estimasi_selesai, vehicles(plat)")
        .in("status", ["dikerjakan", "tertunda"])
        .lt("estimasi_selesai", sampai)
        .limit(5),
      supabase
        .from("inventory_items")
        .select("id, nama, stok, stok_minimum")
        .eq("jenis", "part")
        .eq("aktif", true)
        .order("stok", { ascending: true })
        .limit(10),
    ]);

    const ringkasanRaw = (resRingkasan.data as Record<string, unknown>) || {};
    const ringkasanOwner = {
      pendapatan: Number(ringkasanRaw.pendapatan || 0),
      pendapatan_sebelumnya: Number(ringkasanRaw.pendapatan_sebelumnya || 0),
      laba_kotor: Number(ringkasanRaw.laba_kotor || 0),
      laba_kotor_sebelumnya: Number(ringkasanRaw.laba_kotor_sebelumnya || 0),
      margin_persen: Number(ringkasanRaw.margin_persen || 0),
      wo_aktif: Number(ringkasanRaw.wo_aktif || 0),
      wo_terlambat: Number(ringkasanRaw.wo_terlambat || 0),
      piutang: Number(ringkasanRaw.piutang || 0),
    };

    // Gabungkan item perhatian (PRD 12.2)
    const perhatianItems: {
      id: string;
      tipe: "terlambat" | "stok" | "bawah_modal";
      judul: string;
      keterangan: string;
      tautan: string;
    }[] = [];

    // WO Terlambat
    resWoTerlambat.data?.forEach((wo) => {
      const plat = (wo.vehicles as { plat?: string } | null)?.plat || "-";
      perhatianItems.push({
        id: `wo-${wo.id}`,
        tipe: "terlambat",
        judul: `WO ${wo.nomor} (${plat})`,
        keterangan: `Estimasi selesai lewat batas: ${wo.estimasi_selesai}`,
        tautan: `/work-orders/${wo.id}`,
      });
    });

    // Stok menipis
    resStokMenipis.data
      ?.filter((item) => item.stok <= item.stok_minimum)
      .slice(0, 4)
      .forEach((item) => {
        perhatianItems.push({
          id: `stok-${item.id}`,
          tipe: "stok",
          judul: item.nama,
          keterangan: `Sisa stok ${item.stok} (Batas minimum: ${item.stok_minimum})`,
          tautan: "/inventory",
        });
      });

    return (
      <DashboardOwner
        ringkasan={ringkasanOwner}
        labaHarian={resLabaHarian.data ?? []}
        pendapatanHarian={resPendapatanHarian.data ?? []}
        woPerStatus={resWoStatus.data ?? []}
        bebanMekanik={resBebanMekanik.data ?? []}
        topPart={resTopPart.data ?? []}
        topJasa={resTopJasa.data ?? []}
        perhatianItems={perhatianItems}
        auditLogs={resAudit.data ?? []}
        labelPeriode={labelPeriode}
      />
    );
  }

  // =========================================================================
  // 2. DASHBOARD ADMIN (PRD 12.3)
  // =========================================================================
  if (peran === "admin") {
    const [
      resRingkasan,
      resPendapatanHarian,
      resWoStatus,
      resTopPart,
      resTopJasa,
      resPerluDitagih,
      resSiapDiserahkan,
      resStokMenipis,
    ] = await Promise.all([
      supabase.rpc("dashboard_ringkasan", { p_dari: dari, p_sampai: sampai }),
      supabase.rpc("dashboard_pendapatan_harian", { p_dari: dari, p_sampai: sampai }),
      supabase.rpc("dashboard_wo_per_status", {}),
      supabase.rpc("dashboard_top_item", {
        p_dari: dari,
        p_sampai: sampai,
        p_jenis: "part",
      }),
      supabase.rpc("dashboard_top_item", {
        p_dari: dari,
        p_sampai: sampai,
        p_jenis: "jasa",
      }),
      supabase
        .from("work_orders")
        .select("id, nomor, vehicles(plat), invoices(total, status_bayar)")
        .eq("status", "siap_diambil")
        .limit(5),
      supabase
        .from("invoices")
        .select("id, work_order_id, work_orders!inner(id, nomor, status, vehicles(plat), customers(nama))")
        .eq("status_bayar", "lunas")
        .neq("work_orders.status", "diambil")
        .limit(5),
      supabase
        .from("inventory_items")
        .select("id, nama, stok, stok_minimum")
        .eq("jenis", "part")
        .eq("aktif", true)
        .order("stok", { ascending: true })
        .limit(8),
    ]);

    const ringkasanRaw = (resRingkasan.data as Record<string, unknown>) || {};
    const ringkasanAdmin = {
      mobil_masuk_hari_ini: Number(ringkasanRaw.mobil_masuk_hari_ini || 0),
      siap_diambil: Number(ringkasanRaw.siap_diambil || 0),
      perlu_ditagih: Number(ringkasanRaw.perlu_ditagih || 0),
      pendapatan_hari_ini: Number(ringkasanRaw.pendapatan_hari_ini || 0),
      pendapatan: Number(ringkasanRaw.pendapatan || 0),
      pendapatan_sebelumnya: Number(ringkasanRaw.pendapatan_sebelumnya || 0),
    };

    // Format Perlu Ditagih
    const daftarPerluDitagih = (resPerluDitagih.data ?? []).map((w) => {
      const inv = Array.isArray(w.invoices) ? w.invoices[0] : w.invoices;
      return {
        id: w.id,
        nomor: w.nomor,
        plat: (w.vehicles as { plat?: string } | null)?.plat || "-",
        total: inv?.total,
        statusBayar: inv?.status_bayar,
      };
    });

    // Format Siap Diserahkan
    const daftarSiapDiserahkan = (resSiapDiserahkan.data ?? []).map((inv) => {
      const wo = inv.work_orders as {
        id: string;
        nomor: string;
        vehicles?: { plat?: string } | null;
        customers?: { nama?: string } | null;
      } | null;
      return {
        id: wo?.id || inv.work_order_id,
        nomor: wo?.nomor || "-",
        plat: wo?.vehicles?.plat || "-",
        pelanggan: wo?.customers?.nama || "-",
      };
    });

    const stokMenipis = (resStokMenipis.data ?? []).filter(
      (item) => item.stok <= item.stok_minimum
    );

    return (
      <DashboardAdmin
        ringkasan={ringkasanAdmin}
        pendapatanHarian={resPendapatanHarian.data ?? []}
        woPerStatus={resWoStatus.data ?? []}
        perluDitagih={daftarPerluDitagih}
        siapDiserahkan={daftarSiapDiserahkan}
        stokMenipis={stokMenipis}
        labelPeriode={labelPeriode}
      />
    );
  }

  // =========================================================================
  // 3. DASHBOARD KEPALA MEKANIK (PRD 12.4)
  // =========================================================================
  const [
    resRingkasan,
    resBebanMekanik,
    resWoSelesaiHarian,
    resAntrean,
    resMenungguQc,
  ] = await Promise.all([
    supabase.rpc("dashboard_ringkasan", { p_dari: dari, p_sampai: sampai }),
    supabase.rpc("dashboard_beban_mekanik", { p_dari: dari, p_sampai: sampai }),
    supabase.rpc("dashboard_wo_selesai_harian", { p_dari: dari, p_sampai: sampai }),
    supabase
      .from("work_orders")
      .select("id, nomor, keluhan, status, estimasi_selesai, vehicles(plat)")
      .eq("kepala_mekanik_id", userId)
      .in("status", ["menunggu", "dikerjakan", "tertunda", "selesai"])
      .order("estimasi_selesai", { ascending: true, nullsFirst: false })
      .limit(6),
    supabase
      .from("work_orders")
      .select("id, nomor, keluhan, status, estimasi_selesai, vehicles(plat)")
      .eq("kepala_mekanik_id", userId)
      .eq("status", "selesai")
      .limit(5),
  ]);

  const ringkasanRaw = (resRingkasan.data as Record<string, unknown>) || {};
  const ringkasanMekanik = {
    menunggu_ditugaskan: Number(ringkasanRaw.menunggu_ditugaskan || 0),
    sedang_dikerjakan: Number(ringkasanRaw.sedang_dikerjakan || 0),
    menunggu_qc: Number(ringkasanRaw.menunggu_qc || 0),
    terlambat: Number(ringkasanRaw.terlambat || 0),
    selesai_periode: Number(ringkasanRaw.selesai_periode || 0),
    selesai_sebelumnya: Number(ringkasanRaw.selesai_sebelumnya || 0),
  };

  const today = sampai;

  const antreanTim = (resAntrean.data ?? []).map((wo) => ({
    id: wo.id,
    nomor: wo.nomor,
    plat: (wo.vehicles as { plat?: string } | null)?.plat || "-",
    keluhan: wo.keluhan,
    status: wo.status,
    estimasi_selesai: wo.estimasi_selesai,
    isTerlambat: Boolean(
      wo.estimasi_selesai &&
        wo.estimasi_selesai < today &&
        (wo.status === "dikerjakan" || wo.status === "tertunda")
    ),
  }));

  const menungguQc = (resMenungguQc.data ?? []).map((wo) => ({
    id: wo.id,
    nomor: wo.nomor,
    plat: (wo.vehicles as { plat?: string } | null)?.plat || "-",
    keluhan: wo.keluhan,
    status: wo.status,
    estimasi_selesai: wo.estimasi_selesai,
    isTerlambat: false,
  }));

  return (
    <DashboardMekanik
      ringkasan={ringkasanMekanik}
      bebanMekanik={resBebanMekanik.data ?? []}
      woSelesaiHarian={resWoSelesaiHarian.data ?? []}
      antreanTim={antreanTim}
      menungguQc={menungguQc}
      labelPeriode={labelPeriode}
    />
  );
}

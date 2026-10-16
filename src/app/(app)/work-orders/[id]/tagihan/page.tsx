import { notFound } from "next/navigation";
import { TabWorkOrder } from "@/components/TabWorkOrder";
import { ambilProfilSaya } from "@/lib/profil";
import { createClient } from "@/lib/supabase/server";
import {
  TagihanClient,
  type BillingItemRow,
  type InventoryItemOption,
  type PaymentRow,
  type WorkOrderHeader,
} from "./TagihanClient";

export default async function TagihanWorkOrder({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profil = await ambilProfilSaya();
  const supabase = await createClient();

  // 1. Ambil data Work Order
  const { data: wo, error: errWO } = await supabase
    .from("work_orders")
    .select(`
      id,
      nomor,
      status,
      diskon,
      alasan_diskon,
      kepala_mekanik_id,
      customers:customer_id (id, nama, telepon),
      vehicles:vehicle_id (plat, merek_model, tahun, transmisi),
      invoices (
        id,
        nomor,
        subtotal,
        diskon,
        total,
        terbayar,
        status_bayar,
        diterbitkan_at
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (errWO || !wo) {
    notFound();
  }

  // 2. Ambil baris tagihan
  const { data: rawItems } = await supabase
    .from("billing_items")
    .select(`
      id,
      work_order_id,
      item_id,
      nama_item,
      jenis,
      jumlah,
      harga_master,
      harga_dipakai,
      alasan_penyesuaian,
      disesuaikan_at,
      disesuaikan_oleh:profiles!billing_items_disesuaikan_oleh_fkey (nama),
      ditambah_oleh:profiles!billing_items_ditambah_oleh_fkey (nama),
      billing_item_costs (harga_modal)
    `)
    .eq("work_order_id", id)
    .order("created_at", { ascending: true });

  // 3. Ambil inventaris aktif untuk pilihan dropdown Tambah Item
  const { data: rawInventory } = await supabase
    .from("inventory_items")
    .select("id, kode, nama, jenis, harga_jual, stok")
    .eq("aktif", true)
    .order("nama");

  // 4. Ambil pembayaran jika invoice sudah terbit
  let payments: PaymentRow[] = [];
  if (wo.invoices) {
    const { data: rawPayments } = await supabase
      .from("payments")
      .select(`
        id,
        invoice_id,
        metode,
        jumlah,
        created_at,
        dicatat_oleh:profiles (nama)
      `)
      .eq("invoice_id", wo.invoices.id)
      .order("created_at", { ascending: false });

    payments = (rawPayments ?? []) as PaymentRow[];
  }

  // Cast dan persiapkan data
  const billingItems = (rawItems ?? []).map((it) => ({
    ...it,
    billing_item_costs: Array.isArray(it.billing_item_costs)
      ? it.billing_item_costs[0] ?? null
      : it.billing_item_costs ?? null,
  })) as BillingItemRow[];

  const inventory = (rawInventory ?? []) as InventoryItemOption[];
  const woHeader = wo as unknown as WorkOrderHeader;

  return (
    <div className="space-y-6">
      <TabWorkOrder id={id} />
      <TagihanClient
        wo={woHeader}
        items={billingItems}
        inventory={inventory}
        payments={payments}
        profil={profil}
      />
    </div>
  );
}

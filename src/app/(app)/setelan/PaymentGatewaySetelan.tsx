"use client";

import { useState } from "react";
import {
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  HelpCircle,
  Radio,
  Server,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTanggalWaktu } from "@/lib/format";
import { toast } from "sonner";

export interface WebhookLogRow {
  id: string;
  event: string;
  mayar_invoice_id: string | null;
  status: string;
  pesan_error: string | null;
  created_at: string;
}

interface PaymentGatewaySetelanProps {
  statusTerhubung: boolean;
  statusDetail: {
    mayarApiKey: boolean;
    supabaseSecretKey: boolean;
  };
  modeSandbox: boolean;
  webhookUrl: string;
  logs: WebhookLogRow[];
}

export function PaymentGatewaySetelan({
  statusTerhubung,
  statusDetail,
  modeSandbox,
  webhookUrl,
  logs,
}: PaymentGatewaySetelanProps) {
  const [tersalin, setTersalin] = useState(false);

  const salinUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setTersalin(true);
      toast.success("URL Webhook berhasil disalin ke clipboard!");
      setTimeout(() => setTersalin(false), 2500);
    } catch {
      toast.error("Gagal menyalin URL webhook.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "diterima":
        return (
          <Badge className="bg-success text-white border-transparent">
            Diterima
          </Badge>
        );
      case "ditolak":
        return <Badge variant="destructive">Ditolak</Badge>;
      case "gagal_sementara":
        return (
          <Badge className="bg-amber-500 text-white border-transparent">
            Gagal Sementara
          </Badge>
        );
      case "diproses":
      default:
        return (
          <Badge variant="outline" className="border-primary text-primary">
            {status}
          </Badge>
        );
    }
  };

  return (
    <Card className="border border-border/70 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CreditCard className="size-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">
                Payment Gateway (Mayar)
              </CardTitle>
              <CardDescription className="text-xs">
                Integrasi pembayaran digital, mode transaksi, dan log aktivitas webhook.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={statusTerhubung ? "default" : "outline"}
              className={`gap-1.5 px-3 py-1 font-semibold ${
                statusTerhubung
                  ? "bg-emerald-600 text-white hover:bg-emerald-600"
                  : "border-amber-500 text-amber-600"
              }`}
            >
              {statusTerhubung ? (
                <>
                  <ShieldCheck className="size-3.5" />
                  Terhubung
                </>
              ) : (
                <>
                  <ShieldAlert className="size-3.5" />
                  Konfigurasi Belum Lengkap
                </>
              )}
            </Badge>
            <Badge
              variant="outline"
              className={`gap-1.5 px-3 py-1 font-semibold ${
                modeSandbox
                  ? "border-blue-500 text-blue-600 bg-blue-50/50 dark:bg-blue-950/20"
                  : "border-purple-500 text-purple-600"
              }`}
            >
              <Radio className="size-3 animate-pulse text-blue-500" />
              {modeSandbox ? "Mode Sandbox" : "Mode Production"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-2">
        {/* Ringkasan Status Lingkungan Server */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-lg border bg-muted/30 flex items-start gap-3">
            <Server className="size-4 text-text-muted mt-0.5 shrink-0" />
            <div className="space-y-1">
              <span className="font-semibold text-text">Kredensial Server</span>
              <p className="text-text-muted">
                MAYAR_API_KEY:{" "}
                <span
                  className={
                    statusDetail.mayarApiKey
                      ? "text-success font-medium"
                      : "text-danger font-medium"
                  }
                >
                  {statusDetail.mayarApiKey ? "Tersedia" : "Belum Diatur"}
                </span>
                <br />
                SUPABASE_SECRET_KEY:{" "}
                <span
                  className={
                    statusDetail.supabaseSecretKey
                      ? "text-success font-medium"
                      : "text-danger font-medium"
                  }
                >
                  {statusDetail.supabaseSecretKey ? "Tersedia" : "Belum Diatur"}
                </span>
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border bg-muted/30 flex items-start gap-3">
            <Zap className="size-4 text-text-muted mt-0.5 shrink-0" />
            <div className="space-y-1">
              <span className="font-semibold text-text">Tujuan Endpoint Sandbox</span>
              <p className="text-text-muted leading-relaxed">
                {modeSandbox
                  ? "Transaksi berjalan pada sandbox Mayar (api.mayar.io). Tidak ada dana riil yang dipotong."
                  : "Transaksi berjalan pada server live Mayar."}
              </p>
            </div>
          </div>
        </div>

        {/* Bagian Salin Webhook URL */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-text">
            <span className="flex items-center gap-1.5">
              URL Webhook Mayar
              <span className="text-text-muted font-normal">(Daftarkan ke Dashboard Mayar)</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 font-mono text-xs p-2.5 rounded-lg border bg-muted/50 text-text select-all overflow-x-auto whitespace-nowrap">
              {webhookUrl}
            </div>
            <Button
              onClick={salinUrl}
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
            >
              {tersalin ? (
                <>
                  <Check className="size-4 text-success" />
                  <span>Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  <span>Salin URL</span>
                </>
              )}
            </Button>
          </div>
          <p className="text-[11px] text-text-muted">
            Salin tautan di atas lalu tempelkan pada menu <strong>Integration &gt; Webhooks</strong> di akun Mayar Anda.
          </p>
        </div>

        {/* 10 Baris Terakhir mayar_webhook_log */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text">
              Riwayat Webhook Terbaru (10 Terakhir)
            </h4>
            <span className="text-[11px] text-text-muted">
              Otomatis dicatat saat notifikasi diterima
            </span>
          </div>

          {logs.length === 0 ? (
            <div className="p-8 text-center rounded-lg border border-dashed text-text-muted text-xs space-y-1">
              <HelpCircle className="size-8 mx-auto opacity-40 mb-1" />
              <p className="font-medium">Belum ada riwayat webhook</p>
              <p className="text-[11px]">
                Event dari Mayar akan otomatis tercatat di tabel ini saat pelanggan melakukan pembayaran.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-[11px]">
                    <TableHead className="w-[160px]">Waktu</TableHead>
                    <TableHead className="w-[140px]">Event</TableHead>
                    <TableHead className="w-[200px]">ID Invoice Mayar</TableHead>
                    <TableHead className="w-[120px]">Status</TableHead>
                    <TableHead>Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-[11px] text-text-muted whitespace-nowrap">
                        {formatTanggalWaktu(log.created_at)}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] font-semibold">
                        {log.event}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-text-muted">
                        {log.mayar_invoice_id || "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell className="text-text-muted max-w-xs truncate text-[11px]">
                        {log.pesan_error || (
                          <span className="text-success flex items-center gap-1">
                            <CheckCircle2 className="size-3" /> Berhasil
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

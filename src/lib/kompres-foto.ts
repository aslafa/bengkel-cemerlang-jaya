import { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Kompresi foto di browser (PRD 11.4):
 * Sisi terpanjang maks 1600 px, format WebP, mutu 0.8, target < 400 KB.
 */
export async function kompresFoto(file: File, maxDimensi = 1600, mutu = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDimensi || height > maxDimensi) {
        if (width > height) {
          height = Math.round((height * maxDimensi) / width);
          width = maxDimensi;
        } else {
          width = Math.round((width * maxDimensi) / height);
          height = maxDimensi;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Gagal membuat konteks canvas 2D"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Gagal mengompresi gambar ke format WebP"));
            return;
          }
          resolve(blob);
        },
        "image/webp",
        mutu,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gagal membaca file gambar"));
    };
    img.src = url;
  });
}

/**
 * Buat thumbnail foto lebar 320 px (PRD 11.4).
 */
export async function buatThumbnail(file: File, lebarTarget = 320, mutu = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > lebarTarget) {
        height = Math.round((height * lebarTarget) / width);
        width = lebarTarget;
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Gagal membuat konteks canvas 2D"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Gagal membuat thumbnail WebP"));
            return;
          }
          resolve(blob);
        },
        "image/webp",
        mutu,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gagal membaca file gambar"));
    };
    img.src = url;
  });
}

/**
 * Unggah foto ukuran penuh dan thumbnail ke bucket privat foto-wo (PRD 11.1 & 11.4).
 * Mengembalikan path foto utama untuk dicatat ke database.
 */
export async function unggahFotoDanThumbnail(
  supabase: SupabaseClient<Database>,
  woId: string,
  jenis: "stnk" | "kondisi_awal" | "kondisi_akhir" | "pengerjaan",
  file: File,
): Promise<{ path: string; thumbPath: string }> {
  const fotoId = crypto.randomUUID();
  const path = `${woId}/${jenis}/${fotoId}.webp`;
  const thumbPath = `${woId}/${jenis}/thumb/${fotoId}.webp`;

  const [blobUtama, blobThumb] = await Promise.all([
    kompresFoto(file, 1600, 0.8),
    buatThumbnail(file, 320, 0.8),
  ]);

  const { error: errUtama } = await supabase.storage.from("foto-wo").upload(path, blobUtama, {
    contentType: "image/webp",
    upsert: false,
  });
  if (errUtama) {
    throw new Error(`Gagal mengunggah foto ${jenis}: ${errUtama.message}`);
  }

  const { error: errThumb } = await supabase.storage.from("foto-wo").upload(thumbPath, blobThumb, {
    contentType: "image/webp",
    upsert: false,
  });
  if (errThumb) {
    throw new Error(`Gagal mengunggah thumbnail ${jenis}: ${errThumb.message}`);
  }

  return { path, thumbPath };
}

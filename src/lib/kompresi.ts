import imageCompression from "browser-image-compression";

/**
 * Kompresi foto sebelum diunggah (PRD 11.4).
 * Sisi terpanjang maksimal 1600 px, format WebP, mutu 0,8. Target di bawah 400 KB.
 */
export async function kompresGambar(file: File): Promise<File> {
  // Hanya proses berkas gambar
  if (!file.type.startsWith("image/")) {
    return file;
  }

  const options = {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.8,
  };

  try {
    const hasil = await imageCompression(file, options);
    // Pastikan nama file berakhiran .webp
    const namaBaru = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([hasil], namaBaru, { type: "image/webp" });
  } catch (error) {
    console.error("Gagal mengompres gambar:", error);
    return file;
  }
}

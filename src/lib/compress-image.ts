"use client";

/**
 * Reduz o tamanho de uma imagem no navegador antes do upload (redimensiona e
 * recomprime em JPEG). Mantém uploads de fotos bem abaixo dos limites de corpo
 * do Server Action / Vercel. Arquivos não-imagem (PDF) e falhas retornam o
 * original inalterado.
 */
export async function compressImage(
  file: File,
  maxDim = 2000,
  quality = 0.82,
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const escala = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * escala);
    const h = Math.round(bitmap.height * escala);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((res) =>
      canvas.toBlob(res, "image/jpeg", quality),
    );
    if (!blob || blob.size >= file.size) return file; // não melhorou
    const nome = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nome, { type: "image/jpeg" });
  } catch {
    return file; // ex.: HEIC que o canvas não decodifica — envia original
  }
}

/** Comprime uma lista de arquivos e devolve um FileList pronto pro input. */
export async function compressToFileList(files: File[]): Promise<FileList> {
  const out = await Promise.all(files.map((f) => compressImage(f)));
  const dt = new DataTransfer();
  for (const f of out) dt.items.add(f);
  return dt.files;
}

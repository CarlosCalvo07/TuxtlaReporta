export async function compressPhoto(file: File): Promise<Blob> {
  if (file.size > 8 * 1024 * 1024) throw new Error("Image too large");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Cannot process image");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Invalid image"))),
        "image/jpeg",
        0.82,
      ),
    );
  } finally {
    bitmap.close();
  }
}

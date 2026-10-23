import { validatePhoto } from "./plan-photo";

export async function preparePlanPhoto(file: File): Promise<Blob> {
  const error = validatePhoto(file);
  if (error) throw new Error(error);
  if (/\.hei[cf]$/i.test(file.name)) {
    const { heicTo } = await import("heic-to");
    return heicTo({ blob: file, type: "image/jpeg", quality: 0.95 });
  }
  return file;
}

export async function readPlanPhotos(images: Blob[], onProgress: (image: number, progress: number) => void) {
  const { createWorker } = await import("tesseract.js");
  let current = 0;
  const worker = await createWorker("por+eng", 1, { logger: event => {
    if (event.status === "recognizing text") onProgress(current, event.progress);
  } });
  try {
    const pages: { text: string; uncertain: boolean }[] = [];
    for (let i = 0; i < images.length; i++) {
      current = i; onProgress(i, 0);
      const result = await worker.recognize(images[i]);
      pages.push({ text: result.data.text, uncertain: result.data.confidence < 70 });
      onProgress(i, 1);
    }
    return pages;
  } finally { await worker.terminate(); }
}
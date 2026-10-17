/**
 * High-speed, client-side canvas image compressor.
 * Downscales smartphone photos and screenshots (e.g. 5MB -> 120KB)
 * while preserving pin-sharp mathematical formulas, diagrams, and text.
 * Prevents Vercel 4.5MB payload limits and Render memory crashes.
 */

export interface CompressedImage {
  id: string;
  name: string;
  dataUrl: string;
  base64: string;
  mimeType: string;
  originalSize: number;
  compressedSize: number;
}

export async function compressImageFile(
  file: File | Blob,
  fileName: string = 'image.jpg',
  maxWidth: number = 1280,
  maxHeight: number = 1280,
  quality: number = 0.82
): Promise<CompressedImage> {
  const originalSize = file.size;

  // If already a tiny image (< 80KB), we can convert directly to base64
  if (file.type === 'application/pdf') {
    const base64 = await fileToBase64(file);
    return {
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: fileName,
      dataUrl: base64,
      base64: base64.replace(/^data:[^;]+;base64,/, ''),
      mimeType: 'application/pdf',
      originalSize,
      compressedSize: originalSize,
    };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => {
        // Fallback to raw base64 if decoding fails
        const raw = (reader.result as string) || '';
        resolve({
          id: `img-${Date.now()}`,
          name: fileName,
          dataUrl: raw,
          base64: raw.replace(/^data:[^;]+;base64,/, ''),
          mimeType: file.type || 'image/jpeg',
          originalSize,
          compressedSize: originalSize,
        });
      };
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Calculate aspect-ratio scale
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const raw = (reader.result as string) || '';
          resolve({
            id: `img-${Date.now()}`,
            name: fileName,
            dataUrl: raw,
            base64: raw.replace(/^data:[^;]+;base64,/, ''),
            mimeType: file.type || 'image/jpeg',
            originalSize,
            compressedSize: originalSize,
          });
          return;
        }

        // Draw white background in case of transparent PNGs so math formulas stay legible
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.replace(/^data:[^;]+;base64,/, '');
        const compressedSize = Math.round((base64.length * 3) / 4);

        resolve({
          id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: fileName,
          dataUrl,
          base64,
          mimeType: 'image/jpeg',
          originalSize,
          compressedSize,
        });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

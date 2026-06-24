import Tesseract from 'tesseract.js';
import api from '@/services/api';
import type { OCRResult, OCRMappingResult, ConceptOption } from '@/types/ocr';

function preprocessImage(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    let gray = 0.299 * r + 0.587 * g + 0.114 * b;
    gray = Math.min(255, Math.max(0, (gray - 80) * 1.6));
    d[i] = d[i + 1] = d[i + 2] = gray;
  }
  ctx.putImageData(imageData, 0, 0);
}

function downscaleImage(file: File, maxDim = 1600): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
        else { width = Math.round(width * maxDim / height); height = maxDim; }
      }
      const c = document.createElement('canvas');
      c.width = width; c.height = height;
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      preprocessImage(ctx, width, height);
      c.toBlob((b) => b ? resolve(b) : reject(new Error('Failed to encode')), 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

let ocrWorker: Tesseract.Worker | null = null;
async function getOcrWorker(): Promise<Tesseract.Worker> {
  if (!ocrWorker) {
    ocrWorker = await Tesseract.createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'loading tesseract core') console.log('OCR: loading core');
        else if (m.status === 'initializing tesseract') console.log('OCR: initializing');
        else if (m.status === 'loading language traineddata') console.log('OCR: loading language data');
        else if (m.status === 'initializing api') console.log('OCR: initializing API');
        else if (m.status === 'recognizing text') console.log(`OCR: recognizing ${Math.round(m.progress * 100)}%`);
      },
    });
  }
  return ocrWorker;
}

export async function scanImage(image: File): Promise<OCRResult> {
  const blob = await downscaleImage(image);
  const worker = await getOcrWorker();
  const { data } = await worker.recognize(blob);
  const blocks = (data.blocks || []).map((block: any) => ({
    text: block.text,
    bbox: { x: block.bbox.x0, y: block.bbox.y0, width: block.bbox.x1 - block.bbox.x0, height: block.bbox.y1 - block.bbox.y0 },
    confidence: block.confidence,
  }));
  return { text: data.text, confidence: data.confidence, blocks };
}

export async function scanMultipleImages(images: File[]): Promise<{ text: string; confidence: number; pages: Array<{ text: string; confidence: number }> }> {
  const formData = new FormData();
  for (const img of images) {
    const blob = await downscaleImage(img);
    const resized = new File([blob], img.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
    formData.append('images', resized);
  }
  const res = await api.post('/ocr/scan-multiple', formData);
  return res.data.data;
}

export async function scanImageBase64(imageBase64: string): Promise<OCRResult> {
  const res = await api.post('/ocr/scan', { image: imageBase64 });
  return res.data.data;
}

export async function mapToConcept(text: string, textbookId: string, count?: number, type?: 'quiz' | 'assignment'): Promise<OCRMappingResult & { type?: string; assignment?: any }> {
  const res = await api.post('/ocr/map-to-concept', { text, textbookId, count, type });
  return res.data.data;
}

export async function sendChatMessage(
  messages: Array<{ role: string; content: string }>,
  images?: File[],
): Promise<any> {
  const formData = new FormData();
  formData.append('messages', JSON.stringify(messages));
  if (images && images.length > 0) {
    const downscaled = await Promise.all(images.map((f) => downscaleImage(f)));
    for (let i = 0; i < downscaled.length; i++) {
      const resized = new File([downscaled[i]], `page-${i + 1}.jpg`, { type: 'image/jpeg' });
      formData.append('images', resized);
    }
  }
  const res = await api.post('/ocr/chat', formData);
  return res.data.data;
}

export async function getConceptsForTextbook(textbookId: string): Promise<ConceptOption[]> {
  const res = await api.get(`/ocr/concepts/${textbookId}`);
  return res.data.data;
}

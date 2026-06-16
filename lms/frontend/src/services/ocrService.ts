import api from '@/services/api';
import type { OCRResult, OCRMappingResult, ConceptOption } from '@/types/ocr';

function downscaleImage(file: File, maxDim = 800): Promise<Blob> {
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
      ctx.drawImage(img, 0, 0, width, height);
      c.toBlob((b) => b ? resolve(b) : reject(new Error('Failed to encode')), 'image/jpeg', 0.8);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

export async function scanImage(image: File): Promise<OCRResult> {
  const blob = await downscaleImage(image);
  const resized = new File([blob], image.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
  const formData = new FormData();
  formData.append('image', resized);
  const res = await api.post('/ocr/scan', formData);
  return res.data.data;
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

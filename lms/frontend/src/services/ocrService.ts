import api from '@/services/api';
import type { OCRResult, OCRMappingResult, ConceptOption } from '@/types/ocr';

export async function scanImage(image: File): Promise<OCRResult> {
  const formData = new FormData();
  formData.append('image', image);
  const res = await api.post('/ocr/scan', formData);
  return res.data.data;
}

export async function scanImageBase64(imageBase64: string): Promise<OCRResult> {
  const res = await api.post('/ocr/scan', { image: imageBase64 });
  return res.data.data;
}

export async function mapToConcept(text: string, textbookId: string, count?: number): Promise<OCRMappingResult> {
  const res = await api.post('/ocr/map-to-concept', { text, textbookId, count });
  return res.data.data;
}

export async function getConceptsForTextbook(textbookId: string): Promise<ConceptOption[]> {
  const res = await api.get(`/ocr/concepts/${textbookId}`);
  return res.data.data;
}

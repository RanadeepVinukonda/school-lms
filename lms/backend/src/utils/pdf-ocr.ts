/**
 * Fallback PDF text extraction via page rendering + Tesseract OCR.
 * Used when pdf-parse yields no text (scanned/image-based PDFs).
 */
import { logger } from './logger';

export async function extractTextFromScannedPDF(pdfBuffer: Buffer, languages = 'eng+hin+tel'): Promise<string[]> {
  const pdfjsLib = await import('pdfjs-dist');
  const { createCanvas } = await import('@napi-rs/canvas');
  const { createWorker } = await import('tesseract.js');

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  logger.info('OCR fallback: rendering scanned PDF pages', { totalPages, languages });

  const pageTexts: string[] = [];
  const SCALE = 2;

  const worker = await createWorker(languages);

  for (let i = 1; i <= totalPages; i++) {
    try {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: SCALE });
      const canvas = createCanvas(viewport.width, viewport.height);
      const ctx = canvas.getContext('2d');

      await page.render({ canvasContext: ctx as any, viewport }).promise;

      const pngBuffer = canvas.toBuffer('image/png');
      const { data } = await worker.recognize(pngBuffer);
      pageTexts.push(data.text || '');

      if (i % 20 === 0 || i === totalPages) {
        logger.info('OCR fallback progress', { page: i, totalPages });
      }
    } catch (err) {
      logger.warn('OCR fallback: failed to process page', { page: i, error: (err as Error).message });
      pageTexts.push('');
    }
  }

  await worker.terminate();

  const ocrPages = pageTexts.filter(t => t.trim().length > 0).length;
  logger.info('OCR fallback complete', { totalPages, pagesWithText: ocrPages });

  return pageTexts;
}

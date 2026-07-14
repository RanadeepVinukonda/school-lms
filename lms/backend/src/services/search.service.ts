import { logger } from '../utils/logger';

const SEARCH_SERVICE_URL = process.env.SEARCH_SERVICE_URL || 'http://localhost:4001';

export async function indexDocument(index: 'textbooks' | 'concepts' | 'courses', id: string, document: Record<string, any>) {
  try {
    const res = await fetch(`${SEARCH_SERVICE_URL}/index`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index, id, document })
    });
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
  } catch (error: any) {
    logger.error('Failed to index document in Elasticsearch:', { index, id, error: error.message });
  }
}

export async function deleteDocument(index: 'textbooks' | 'concepts' | 'courses', id: string) {
  try {
    const res = await fetch(`${SEARCH_SERVICE_URL}/index/${index}/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
  } catch (error: any) {
    logger.error('Failed to delete document from Elasticsearch:', { index, id, error: error.message });
  }
}

export async function searchAll(q: string, schoolId?: string) {
  try {
    const url = new URL(`${SEARCH_SERVICE_URL}/search`);
    url.searchParams.append('q', q);
    if (schoolId) {
      url.searchParams.append('schoolId', schoolId);
    }
    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const body: any = await res.json();
    return body?.data || null;
  } catch (error: any) {
    logger.error('Failed to search Elasticsearch:', { q, error: error.message });
    return null;
  }
}

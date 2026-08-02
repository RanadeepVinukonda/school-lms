import api from './api';

export interface ConceptRecommendation {
  conceptId: string;
  conceptTitle: string;
  textbookId: string;
  chapterId: string;
  chapterTitle: string;
  subjectId: string | null;
  subjectName: string;
  schoolId: string | null;
  masteryScore: number;
  attemptCount: number;
  lastReviewedAt: string | null;
  requestStatus: 'none' | 'pending' | 'approved';
  reason: string;
}

export interface ResourceRequest {
  id: string;
  studentId: string;
  studentName?: string;
  conceptId: string;
  textbookId: string | null;
  chapterId: string | null;
  subjectId: string | null;
  subjectName: string;
  conceptTitle: string;
  chapterTitle: string;
  reason: string;
  status: 'pending' | 'approved' | 'declined';
  declinedReason: string;
  schoolId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeachResource {
  id: string;
  videoId: string;
  source: 'khan_academy' | 'youtube';
  sourceLabel: string;
  title: string;
  thumbnail: string;
  duration: string;
  channelName: string;
  description: string;
  url: string;
  embedUrl: string;
  relevance: number;
}

export interface StudentResourceGroup {
  subject: string;
  concepts: Array<{
    concept: string;
    items: StudentResource[];
  }>;
}

export interface StudentResource {
  id: string;
  title: string;
  url: string;
  source: string;
  sourceLabel: string;
  thumbnail: string;
  duration: string;
  channelName: string;
  description: string;
  embedUrl: string;
  videoId: string;
  subjectName: string;
  conceptTitle: string;
  createdAt: string;
}

function mapRequest(r: any): ResourceRequest {
  return {
    id: r.id,
    studentId: r.student_id,
    studentName: r.studentName,
    conceptId: r.concept_id,
    textbookId: r.textbook_id,
    chapterId: r.chapter_id,
    subjectId: r.subject_id,
    subjectName: r.subject_name,
    conceptTitle: r.concept_title,
    chapterTitle: r.chapter_title,
    reason: r.reason,
    status: r.status,
    declinedReason: r.declined_reason,
    schoolId: r.school_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapResource(r: any): StudentResource {
  return {
    id: r.id,
    title: r.title,
    url: r.url,
    source: r.source,
    sourceLabel: r.source_label,
    thumbnail: r.thumbnail,
    duration: r.duration,
    channelName: r.channel_name,
    description: r.description,
    embedUrl: r.embed_url,
    videoId: r.video_id,
    subjectName: r.subject_name,
    conceptTitle: r.concept_title,
    createdAt: r.created_at,
  };
}

export async function getRecommendations(): Promise<ConceptRecommendation[]> {
  const res = await api.get('/api/resource-requests/recommendations');
  return res.data?.data || [];
}

export async function createResourceRequest(conceptId: string, reason?: string): Promise<ResourceRequest> {
  const res = await api.post('/api/resource-requests/requests', { conceptId, reason });
  return mapRequest(res.data?.data);
}

export async function getMyRequests(): Promise<ResourceRequest[]> {
  const res = await api.get('/api/resource-requests/requests/mine');
  return (res.data?.data || []).map(mapRequest);
}

export async function getMyResources(): Promise<StudentResourceGroup[]> {
  const res = await api.get('/api/resource-requests/resources/mine');
  const groups = res.data?.data || [];
  return groups.map((g: any) => ({
    subject: g.subject,
    concepts: (g.concepts || []).map((c: any) => ({
      concept: c.concept,
      items: (c.items || []).map(mapResource),
    })),
  }));
}

export async function getTeacherRequests(): Promise<ResourceRequest[]> {
  const res = await api.get('/api/resource-requests/requests');
  return (res.data?.data || []).map(mapRequest);
}

export async function searchResourcesForConcept(conceptId: string, maxResults = 6): Promise<TeachResource[]> {
  const res = await api.get(`/api/resource-requests/search/${conceptId}`, { params: { max: maxResults } });
  return res.data?.data || [];
}

export async function approveResourceRequest(requestId: string, resources: TeachResource[]): Promise<ResourceRequest> {
  const res = await api.post(`/api/resource-requests/requests/${requestId}/approve`, { resources });
  return mapRequest(res.data?.data);
}

export async function declineResourceRequest(requestId: string, reason?: string): Promise<ResourceRequest> {
  const res = await api.post(`/api/resource-requests/requests/${requestId}/decline`, { reason });
  return mapRequest(res.data?.data);
}

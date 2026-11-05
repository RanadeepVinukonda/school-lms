import { getSupabaseAdmin } from '../supabase';
import { logger } from '../../utils/logger';
import * as teachResourcesService from '../teach-resources.service';

export interface RemediationItem {
  conceptId: string;
  title: string;
  masteryScore: number;
  attemptCount: number;
  textbookId: string;
  status: 'Needs Remediation' | 'In Progress' | 'Proficient';
  resources: teachResourcesService.TeachResource[];
}

export async function getRemediationPlan(
  studentId: string,
  conceptId: string,
): Promise<RemediationItem[]> {
  const supabase = getSupabaseAdmin()!;
  const results: RemediationItem[] = [];

  const { data: concept } = await supabase
    .from('concepts')
    .select('id, title, prerequisites, textbook_id, chapter_id')
    .eq('id', conceptId)
    .single();

  if (!concept) return [];

  let prerequisiteTitles: string[] = [];
  if (typeof concept.prerequisites === 'string') {
    try { prerequisiteTitles = JSON.parse(concept.prerequisites); } catch { prerequisiteTitles = [concept.prerequisites]; }
  } else if (Array.isArray(concept.prerequisites)) {
    prerequisiteTitles = concept.prerequisites;
  }

  if (prerequisiteTitles.length === 0) return [];

  const { data: prerequisiteConcepts } = await supabase
    .from('concepts')
    .select('id, title')
    .eq('textbook_id', concept.textbook_id)
    .in('title', prerequisiteTitles);

  if (!prerequisiteConcepts || prerequisiteConcepts.length === 0) return [];

  for (const prereq of prerequisiteConcepts) {
    const { data: mastery } = await supabase
      .from('concept_mastery')
      .select('mastery_score, attempt_count')
      .eq('student_id', studentId)
      .eq('concept_id', prereq.id)
      .maybeSingle();

    const masteryScore = mastery?.mastery_score ?? 0;
    const attemptCount = mastery?.attempt_count ?? 0;

    let status: RemediationItem['status'] = 'Needs Remediation';
    if (masteryScore >= 0.7) status = 'Proficient';
    else if (attemptCount > 0) status = 'In Progress';

    const { data: chapter } = await supabase
      .from('chapters')
      .select('title')
      .eq('id', concept.chapter_id)
      .single();

    const { data: textbook } = await supabase
      .from('textbooks')
      .select('title, subject_id')
      .eq('id', concept.textbook_id)
      .single();

    let subjectName = '';
    if (textbook?.subject_id) {
      const { data: subject } = await supabase
        .from('subjects')
        .select('name')
        .eq('id', textbook.subject_id)
        .single();
      if (subject) subjectName = subject.name;
    }

    let resources: teachResourcesService.TeachResource[] = [];
    try {
      resources = await teachResourcesService.searchTeachResources(
        subjectName,
        chapter?.title || '',
        prereq.title,
        [],
        3,
      );
    } catch (err) {
      logger.warn('Failed to fetch resources for prerequisite', { conceptId: prereq.id, error: err });
    }

    results.push({
      conceptId: prereq.id,
      title: prereq.title,
      masteryScore,
      attemptCount,
      textbookId: concept.textbook_id || '',
      status,
      resources,
    });
  }

  results.sort((a, b) => a.masteryScore - b.masteryScore);
  return results;
}

export async function getStudentAdaptiveSummary(studentId: string): Promise<{
  proficiencyPercentage: number;
  needsRemediation: RemediationItem[];
  totalMastered: number;
  totalAttempted: number;
}> {
  const supabase = getSupabaseAdmin()!;

  const { data: masteryRecords } = await supabase
    .from('concept_mastery')
    .select('concept_id, mastery_score, attempt_count')
    .eq('student_id', studentId);

  const totalAttempted = masteryRecords?.length || 0;
  const totalMastered = masteryRecords?.filter((m: any) => (m.mastery_score || 0) >= 0.7).length || 0;
  const avgMastery = totalAttempted > 0
    ? (masteryRecords!.reduce((sum: number, m: any) => sum + (m.mastery_score || 0), 0) / totalAttempted) * 100
    : 0;

  const needsRemediation: RemediationItem[] = [];
  const lowMastery = (masteryRecords || [])
    .filter((m: any) => (m.mastery_score || 0) < 0.7)
    .slice(0, 5);

  for (const lm of lowMastery) {
    const { data: concept } = await supabase
      .from('concepts')
      .select('id, title, textbook_id, chapter_id')
      .eq('id', lm.concept_id)
      .single();

    if (!concept) continue;

    const { data: chapter } = await supabase
      .from('chapters')
      .select('title')
      .eq('id', concept.chapter_id)
      .single();
    const { data: textbook } = await supabase
      .from('textbooks')
      .select('title, subject_id')
      .eq('id', concept.textbook_id)
      .single();

    let subjectName = '';
    if (textbook?.subject_id) {
      const { data: subject } = await supabase
        .from('subjects')
        .select('name')
        .eq('id', textbook.subject_id)
        .single();
      if (subject) subjectName = subject.name;
    }

    let resources: teachResourcesService.TeachResource[] = [];
    try {
      resources = await teachResourcesService.searchTeachResources(
        subjectName,
        chapter?.title || '',
        concept.title,
        [],
        2,
      );
    } catch (err) {
      logger.warn('Failed to fetch resources for low mastery concept', { conceptId: concept.id, error: err });
    }

    needsRemediation.push({
      conceptId: concept.id,
      title: concept.title,
      masteryScore: lm.mastery_score || 0,
      attemptCount: lm.attempt_count || 0,
      textbookId: concept.textbook_id || '',
      status: (lm.attempt_count || 0) > 0 ? 'In Progress' : 'Needs Remediation',
      resources,
    });
  }

  needsRemediation.sort((a, b) => a.masteryScore - b.masteryScore);

  return {
    proficiencyPercentage: Math.round(avgMastery),
    needsRemediation,
    totalMastered,
    totalAttempted,
  };
}

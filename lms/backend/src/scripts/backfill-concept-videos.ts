import dotenv from 'dotenv';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from '../services/supabase';
import { searchAndRankVideos } from '../services/video-ranker.service';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const CHUNK = 200;

async function fetchAll(table: string, select: string): Promise<any[]> {
  const supabase = getSupabaseAdmin()!;
  const out: any[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await supabase.from(table).select(select).range(offset, offset + CHUNK - 1);
    if (error) throw new Error(`${table} fetch failed: ${error.message}`);
    if (!data || data.length === 0) break;
    out.push(...data);
    if (data.length < CHUNK) break;
    offset += CHUNK;
  }
  return out;
}

async function main() {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase not configured');

  console.log('Fetching concepts and existing videos...');
  const [concepts, videoRows] = await Promise.all([
    fetchAll('concepts', 'id, title, chapter_id, textbook_id'),
    fetchAll('concept_videos', 'concept_id'),
  ]);

  const hasVideos = new Set<string>((videoRows as any[]).map((v) => v.concept_id));
  const empty = concepts.filter((c: any) => !hasVideos.has(c.id));
  console.log(`concepts: ${concepts.length}, with videos: ${hasVideos.size}, empty: ${empty.length}`);

  // Chapter titles + subject names for context.
  const chapterIds = [...new Set(empty.map((c: any) => c.chapter_id).filter(Boolean))];
  const textbookIds = [...new Set(empty.map((c: any) => c.textbook_id).filter(Boolean))];

  const chaptersById = new Map<string, any>();
  if (chapterIds.length > 0) {
    for (const c of await fetchAll('chapters', 'id, title').then((rows) => rows.filter((r: any) => chapterIds.includes(r.id)))) {
      chaptersById.set(c.id, c);
    }
  }

  const subjectByTextbook = new Map<string, string>();
  const textbooks = (await fetchAll('textbooks', 'id, subject_id')).filter((t: any) => textbookIds.includes(t.id));
  const subjectIds = [...new Set(textbooks.map((t: any) => t.subject_id).filter(Boolean))];
  const subjects = subjectIds.length > 0
    ? (await fetchAll('subjects', 'id, name')).filter((s: any) => subjectIds.includes(s.id))
    : [];
  const subjectNameById = new Map<string, string>(subjects.map((s: any) => [s.id, s.name]));
  for (const t of textbooks) {
    subjectByTextbook.set(t.id, (t.subject_id && subjectNameById.get(t.subject_id)) || 'Education');
  }

  let filled = 0;
  let stillEmpty = 0;
  let errors = 0;

  for (const c of empty) {
    const chapterTitle = chaptersById.get(c.chapter_id)?.title || '';
    const subjectName = subjectByTextbook.get(c.textbook_id) || 'Education';
    try {
      const videos = await searchAndRankVideos(c.title, '', subjectName, 3, c.id, chapterTitle);
      const rows = (videos || []).map((video: any) => ({
        id: uuidv4(),
        concept_id: c.id,
        textbook_id: c.textbook_id,
        chapter_id: c.chapter_id,
        video_id: video.videoId || video.youtubeId || video.video_id || video.id,
        title: video.title,
        description: video.description,
        channel: video.channelName,
        thumbnail: video.thumbnail,
        duration: video.duration,
        score: video.score || 1.0,
        embedding: video.embedding || null,
        created_at: new Date().toISOString(),
      })).filter((row: any) => row.video_id && row.title);

      if (rows.length > 0) {
        const { error } = await supabase.from('concept_videos').insert(rows);
        if (error) {
          errors++;
          console.log(`  insert failed for "${c.title}": ${error.message}`);
          continue;
        }
        filled++;
        console.log(`  + "${c.title}" <- ${rows.length} video(s)`);
      } else {
        stillEmpty++;
        console.log(`  - "${c.title}" no relevant videos found`);
      }
    } catch (err: any) {
      errors++;
      console.log(`  error for "${c.title}": ${err?.message || err}`);
    }
    // Be gentle on search quota / scraping.
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log('--- summary ---');
  console.log('concepts filled:', filled);
  console.log('concepts still empty:', stillEmpty);
  console.log('errors:', errors);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error('FATAL', e); process.exit(1); });

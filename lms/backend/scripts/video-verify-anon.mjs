import 'dotenv/config';
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
const conceptId = '4b29cdbc-171b-478c-925e-8383906c1fc2';

const r = await fetch(`${url}/rest/v1/concept_videos?concept_id=eq.${conceptId}&select=*&order=score.desc`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
console.log('HTTP', r.status);
const body = await r.json();
if (Array.isArray(body)) {
  console.log('rows returned:', body.length);
  console.log(JSON.stringify(body.map(v => ({ video_id: v.video_id, title: v.title.slice(0, 40), thumbnail: v.thumbnail })), null, 1));
} else {
  console.log('ERROR RESPONSE:', JSON.stringify(body).slice(0, 500));
}

// also simulate for another concept
const conceptId2 = '71d42a8e-afc4-47c4-aabb-98c9b7da7938';
const r2 = await fetch(`${url}/rest/v1/concept_videos?concept_id=eq.${conceptId2}&select=video_id,title&order=score.desc`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
const b2 = await r2.json();
console.log('\nconcept 2 status', r2.status, 'rows:', Array.isArray(b2) ? b2.length : JSON.stringify(b2).slice(0, 300));
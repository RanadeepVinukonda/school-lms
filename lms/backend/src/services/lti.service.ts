import { getSupabaseAdmin } from './supabase';
import { logger } from '../utils/logger';

export interface LtiConfig {
  id?: string;
  school_id: string;
  issuer: string;
  client_id: string;
  deployment_id: string;
  auth_token_url: string;
  auth_login_url: string;
  jwks_url: string;
}

export async function saveLtiConfig(schoolId: string, data: Omit<LtiConfig, 'school_id'>) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data: existing } = await supabase.from('lti_configs').select('id').eq('school_id', schoolId).maybeSingle();

  if (existing) {
    const { data: result } = await supabase.from('lti_configs').update(data).eq('school_id', schoolId).select().single();
    return result;
  } else {
    const { data: result } = await supabase.from('lti_configs').insert({ school_id: schoolId, ...data }).select().single();
    return result;
  }
}

export async function getLtiConfig(schoolId: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data } = await supabase.from('lti_configs').select('*').eq('school_id', schoolId).maybeSingle();
  return data;
}

export async function handleLtiLaunch(idToken: string) {
  try {
    // 1. Decode JWT payload (standard LTI 1.3 launch payload)
    const segments = idToken.split('.');
    if (segments.length !== 3) throw new Error('Invalid JWT format');
    const payload = JSON.parse(Buffer.from(segments[1], 'base64').toString());

    // 2. Extract LTI claims
    const email = payload.email || payload['https://purl.imsglobal.org/spec/lti/claim/custom']?.email;
    const name = payload.name || 'LTI User';
    const role = (payload['https://purl.imsglobal.org/spec/lti/claim/roles'] || []).includes('http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor')
      ? 'teacher'
      : 'student';
    
    const resourceLink = payload['https://purl.imsglobal.org/spec/lti/claim/resource_link']?.id;
    const lineitem = payload['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint']?.lineitem;

    if (!email) throw new Error('Email claim is required in LTI launch ID token');

    // 3. Auto-provision user in Supabase
    const supabase = getSupabaseAdmin();
    if (!supabase) throw new Error('Database not configured');

    let { data: user } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
    if (!user) {
      const { data: newUser } = await supabase.from('users').insert({
        email,
        display_name: name,
        role,
        is_active: true
      }).select().single();
      user = newUser;
    }

    return {
      success: true,
      user,
      resourceLink,
      lineitem
    };
  } catch (error: any) {
    logger.error('LTI launch handling failed:', { error: error.message });
    throw error;
  }
}

export async function passbackGrade(
  schoolId: string,
  lineitemUrl: string,
  userId: string,
  score: number,
  maxScore: number
) {
  try {
    const config = await getLtiConfig(schoolId);
    if (!config) throw new Error('LTI Platform details not configured for this school');

    // LTI 1.3 AGS Grade Passback POST request to lineitemUrl/scores
    const scoreUrl = `${lineitemUrl}/scores`;

    // 1. Fetch LTI access token (mocking credentials grant for simplicity)
    const tokenRes = await fetch(config.auth_token_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
        client_assertion: 'mock-jwt-assertion'
      })
    });

    let accessToken = 'mock-access-token';
    if (tokenRes.ok) {
      const tokenBody = (await tokenRes.json()) as any;
      accessToken = tokenBody.access_token || accessToken;
    }

    // 2. Post score payload
    const scoreRes = await fetch(scoreUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/vnd.ims.lis.v1.score+json'
      },
      body: JSON.stringify({
        userId,
        activityScore: score,
        activityMaximum: maxScore,
        gradingProgress: 'FullyGraded',
        timestamp: new Date().toISOString()
      })
    });

    if (!scoreRes.ok) {
      throw new Error(`Grade passback failed with status: ${scoreRes.statusText}`);
    }

    return { success: true };
  } catch (error: any) {
    logger.error('LTI grade passback failed:', { error: error.message });
    throw error;
  }
}

import { v4 as uuidv4 } from 'uuid';
import { getSupabaseAdmin } from './supabase';
import { logger } from '../utils/logger';

export async function logAiUsage(data: {
  userId?: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd?: number;
  endpoint?: string;
  durationMs?: number;
  success?: boolean;
}) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { error } = await supabase.from('ai_usage').insert({
    id: uuidv4(),
    user_id: data.userId || null,
    model: data.model,
    prompt_tokens: data.promptTokens,
    completion_tokens: data.completionTokens,
    cost_usd: data.costUsd || 0,
    endpoint: data.endpoint || null,
    duration_ms: data.durationMs || null,
    success: data.success !== false,
  });

  if (error) logger.warn('Failed to log AI usage', { error: error.message });
}

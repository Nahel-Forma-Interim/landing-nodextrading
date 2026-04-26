// Helper Supabase server-side (utilise SERVICE_ROLE_KEY, bypass RLS)
import { createClient } from '@supabase/supabase-js';

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans les env vars Vercel');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// Hash SHA-256 hex (côté serveur)
import crypto from 'crypto';
export function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// CORS helpers (autorise le frontend même domaine)
export function setCors(res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.SITE_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Extrait le JWT de l'header Authorization OU du cookie sb-access-token
export function getAccessToken(req) {
  const auth = req.headers.authorization || req.headers.Authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  // Fallback: cookie httpOnly (si on l'utilise)
  const cookies = (req.headers.cookie || '').split(';').reduce((acc, c) => {
    const [k, ...v] = c.trim().split('=');
    if (k) acc[k] = decodeURIComponent(v.join('='));
    return acc;
  }, {});
  return cookies['sb-access-token'] || null;
}

// Vérifie le JWT auprès de Supabase et retourne l'utilisateur
export async function getUser(req) {
  const token = getAccessToken(req);
  if (!token) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// Log audit
export async function logAudit(userId, action, resource, metadata = {}) {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from('nodex_audit_log').insert({
      user_id: userId,
      action,
      resource,
      metadata
    });
  } catch (e) {
    console.error('audit log failed', e);
  }
}

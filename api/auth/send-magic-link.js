// POST /api/auth/send-magic-link
// Body: { email }
// → envoie un magic link via Supabase Auth (anon client + admin pour création)

import { createClient } from '@supabase/supabase-js';
import { setCors } from '../_lib/supabase.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Email invalide' });
    }
    const cleanEmail = email.trim().toLowerCase();

    const url = process.env.SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !anonKey || !serviceKey) {
      console.error('env missing', { hasUrl: !!url, hasAnon: !!anonKey, hasSrv: !!serviceKey });
      return res.status(500).json({ error: 'Configuration serveur incomplète' });
    }

    const origin = process.env.SITE_ORIGIN || `https://${req.headers.host}`;

    // 1. Client anon (pour signInWithOtp standard)
    const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });

    const { error: otpError } = await anonClient.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: `${origin}/compte.html`,
        shouldCreateUser: true
      }
    });

    if (otpError) {
      // Si erreur, on tente la méthode admin (createMagicLink)
      console.error('signInWithOtp error', otpError.message, otpError);
      const adminClient = createClient(url, serviceKey, { auth: { persistSession: false } });
      const { error: linkError } = await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email: cleanEmail,
        options: { redirectTo: `${origin}/compte.html` }
      });
      if (linkError) {
        console.error('generateLink fallback error', linkError.message, linkError);
        return res.status(500).json({
          error: 'Email auth non actif côté Supabase ou rate limit. Vérifie : Auth → Providers → Email activé · ou attends 1 min.',
          detail: linkError.message
        });
      }
    }

    return res.status(200).json({ ok: true, message: 'Email envoyé · vérifie ta boîte (et les spams)' });
  } catch (e) {
    console.error('send-magic-link', e);
    return res.status(500).json({ error: 'Erreur serveur', detail: e.message });
  }
}

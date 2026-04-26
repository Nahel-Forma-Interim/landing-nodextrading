// POST /api/auth/send-magic-link
// Body: { email }
// → envoie un magic link via Supabase Auth

import { getSupabaseAdmin, setCors, logAudit } from '../_lib/supabase.js';

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

    const supabase = getSupabaseAdmin();
    const origin = process.env.SITE_ORIGIN || `https://${req.headers.host}`;

    // Génère un magic link (signInWithOtp envoie l'email)
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: `${origin}/compte.html`,
        shouldCreateUser: true
      }
    });

    if (error) {
      console.error('signInWithOtp error', error);
      return res.status(500).json({ error: 'Impossible d\'envoyer l\'email. Réessaie dans quelques secondes.' });
    }

    return res.status(200).json({ ok: true, message: 'Email envoyé · vérifie ta boîte (et les spams)' });
  } catch (e) {
    console.error('send-magic-link', e);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

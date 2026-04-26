// GET /api/download/skill
// Headers: Authorization: Bearer <jwt>
// → retourne une URL signée (15 min) pour le ZIP du skill

import { getSupabaseAdmin, setCors, getUser, logAudit } from '../_lib/supabase.js';

const BUCKET = 'nodex-skill-zips';
const FILE = 'nodex-v5.3.zip';
const TTL_SECONDS = 900; // 15 min

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Non connecté' });

    const supabase = getSupabaseAdmin();

    // Vérifier le tier de l'utilisateur (essentiel/pro/elite ont tous accès au skill)
    const { data: account, error: accErr } = await supabase
      .from('nodex_accounts')
      .select('tier')
      .eq('id', user.id)
      .single();

    if (accErr || !account) {
      return res.status(403).json({ error: 'Compte non trouvé' });
    }

    // Tous les tiers ont accès au skill
    if (!['essentiel', 'pro', 'elite'].includes(account.tier)) {
      return res.status(403).json({ error: 'Tier insuffisant' });
    }

    // Génère URL signée temporaire
    const { data: signed, error: signErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(FILE, TTL_SECONDS, { download: FILE });

    if (signErr || !signed?.signedUrl) {
      console.error('createSignedUrl error', signErr);
      return res.status(500).json({ error: 'Erreur génération du lien de téléchargement' });
    }

    await logAudit(user.id, 'download_skill', FILE, { tier: account.tier });

    return res.status(200).json({
      url: signed.signedUrl,
      expiresIn: TTL_SECONDS,
      filename: FILE
    });
  } catch (e) {
    console.error('download/skill', e);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

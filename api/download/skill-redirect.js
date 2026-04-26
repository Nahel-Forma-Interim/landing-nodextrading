// GET /api/download/skill-redirect
// Déclenché par le rewrite /downloads/nodex-v5.3.zip
// Vérifie auth + redirige vers URL signée Supabase Storage

import { getSupabaseAdmin, setCors, getUser, logAudit } from '../_lib/supabase.js';

const BUCKET = 'nodex-skill-zips';
const FILE = 'nodex-v5.3.zip';
const TTL_SECONDS = 60; // Très court : le user est redirigé immédiatement

export default async function handler(req, res) {
  setCors(res);

  try {
    const user = await getUser(req);
    if (!user) {
      // Redirige vers la page compte avec retour
      res.writeHead(302, { Location: '/compte.html?next=skill-download' });
      return res.end();
    }

    const supabase = getSupabaseAdmin();
    const { data: account } = await supabase
      .from('nodex_accounts')
      .select('tier')
      .eq('id', user.id)
      .single();

    if (!account || !['essentiel', 'pro', 'elite'].includes(account.tier)) {
      res.writeHead(302, { Location: '/compte.html?error=tier-required' });
      return res.end();
    }

    const { data: signed, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(FILE, TTL_SECONDS, { download: FILE });

    if (error || !signed?.signedUrl) {
      console.error('signed url error', error);
      res.writeHead(302, { Location: '/compte.html?error=download-failed' });
      return res.end();
    }

    await logAudit(user.id, 'download_skill_redirect', FILE, { tier: account.tier });

    res.writeHead(302, { Location: signed.signedUrl });
    return res.end();
  } catch (e) {
    console.error('skill-redirect', e);
    res.writeHead(302, { Location: '/compte.html?error=server' });
    return res.end();
  }
}

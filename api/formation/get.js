// GET /api/formation/get
// Headers: Authorization: Bearer <jwt>
// → retourne le HTML de la formation (servi côté serveur, pas bypassable JS)

import { getSupabaseAdmin, setCors, getUser, logAudit } from '../_lib/supabase.js';
import fs from 'fs';
import path from 'path';

let cachedHtml = null;
function loadHtml() {
  if (cachedHtml) return cachedHtml;
  // Le fichier source de la formation
  const candidates = [
    path.join(process.cwd(), 'private', 'formation-nodex-v53-content.html'),
    path.join(process.cwd(), 'formation-nodex-v53.html')
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        cachedHtml = fs.readFileSync(p, 'utf-8');
        return cachedHtml;
      }
    } catch (e) { /* ignore */ }
  }
  throw new Error('Formation HTML introuvable côté serveur');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await getUser(req);
    if (!user) {
      return res.status(401).send('<!DOCTYPE html><html><body style="background:#000;color:#fff;font-family:sans-serif;padding:40px;text-align:center;"><h1>🔒 Accès refusé</h1><p>Connecte-toi pour accéder à la formation.</p><p><a href="/compte.html" style="color:#6fa8ff;">→ Aller à mon compte</a></p></body></html>');
    }

    const supabase = getSupabaseAdmin();
    const { data: account } = await supabase
      .from('nodex_accounts')
      .select('tier')
      .eq('id', user.id)
      .single();

    if (!account || !['essentiel', 'pro', 'elite'].includes(account.tier)) {
      return res.status(403).send('<!DOCTYPE html><html><body style="background:#000;color:#fff;font-family:sans-serif;padding:40px;text-align:center;"><h1>🔒 Tier insuffisant</h1><p><a href="/compte.html" style="color:#6fa8ff;">→ Mon compte</a></p></body></html>');
    }

    const html = loadHtml();
    await logAudit(user.id, 'view_formation', 'formation-v5.3', { tier: account.tier });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).send(html);
  } catch (e) {
    console.error('formation/get', e);
    return res.status(500).json({ error: 'Erreur serveur · ' + e.message });
  }
}

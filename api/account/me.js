// GET /api/account/me
// Headers: Authorization: Bearer <jwt>
// → retourne le compte de l'utilisateur connecté (tier, etc.)

import { getSupabaseAdmin, setCors, getUser } from '../_lib/supabase.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Non connecté' });

    const supabase = getSupabaseAdmin();

    const { data: account, error } = await supabase
      .from('nodex_accounts')
      .select('email, tier, promo_code_used, created_at, last_login_at')
      .eq('id', user.id)
      .single();

    if (error || !account) {
      return res.status(404).json({ error: 'Compte non trouvé' });
    }

    // Update last_login_at silencieusement
    await supabase
      .from('nodex_accounts')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    return res.status(200).json({
      ok: true,
      account: {
        email: account.email,
        tier: account.tier,
        promoCodeUsed: !!account.promo_code_used,
        memberSince: account.created_at
      }
    });
  } catch (e) {
    console.error('account/me', e);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

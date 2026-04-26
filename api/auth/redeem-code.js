// POST /api/auth/redeem-code
// Body: { code }
// Headers: Authorization: Bearer <jwt>
// → applique le code promo au user connecté · upgrade tier

import { getSupabaseAdmin, sha256, setCors, getUser, logAudit } from '../_lib/supabase.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Non connecté' });

    const { code } = req.body || {};
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Code manquant' });
    }
    const cleanCode = code.trim().toUpperCase();
    const codeHash = sha256(cleanCode);

    const supabase = getSupabaseAdmin();

    // 1. Vérifier que le code existe + actif + utilisations restantes
    const { data: promo, error: promoErr } = await supabase
      .from('nodex_promo_codes')
      .select('*')
      .eq('code_hash', codeHash)
      .eq('is_active', true)
      .single();

    if (promoErr || !promo) {
      await logAudit(user.id, 'redeem_code_failed', cleanCode.slice(0, 4) + '***', { reason: 'not_found' });
      return res.status(404).json({ error: 'Code invalide ou désactivé' });
    }

    if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
      await logAudit(user.id, 'redeem_code_failed', cleanCode.slice(0, 4) + '***', { reason: 'max_uses_reached' });
      return res.status(410).json({ error: 'Ce code a atteint son nombre maximum d\'utilisations' });
    }

    // 2. Vérifier que ce user n'a pas déjà utilisé un code (évite les abus)
    const { data: existingAccount } = await supabase
      .from('nodex_accounts')
      .select('promo_code_used, tier')
      .eq('id', user.id)
      .single();

    if (existingAccount?.promo_code_used) {
      return res.status(409).json({
        error: 'Tu as déjà utilisé un code promo sur ce compte',
        currentTier: existingAccount.tier
      });
    }

    // 3. Appliquer le code : update tier + increment used_count
    const { error: updateErr } = await supabase
      .from('nodex_accounts')
      .update({
        tier: promo.tier,
        promo_code_used: cleanCode,
        last_login_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateErr) {
      console.error('update account error', updateErr);
      return res.status(500).json({ error: 'Erreur application du code' });
    }

    await supabase
      .from('nodex_promo_codes')
      .update({ used_count: promo.used_count + 1 })
      .eq('id', promo.id);

    await logAudit(user.id, 'redeem_code_success', cleanCode.slice(0, 4) + '***', { tier: promo.tier });

    return res.status(200).json({
      ok: true,
      tier: promo.tier,
      message: `Code valide · accès ${promo.tier.toUpperCase()} débloqué`
    });
  } catch (e) {
    console.error('redeem-code', e);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

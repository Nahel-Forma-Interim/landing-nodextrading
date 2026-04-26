# Setup backend Nodex Trading (Supabase + Vercel API)

Une fois ce setup fait, le site sera **vraiment sécurisé** :
- Auth par magic link email (Supabase)
- Codes promo validés côté serveur (impossible à bypass)
- ZIP du skill servi via URL signée 60 sec
- Formation servie côté serveur (pas de bypass JS)
- Sessions cookie httpOnly (cross-device naturel)

## ✅ Étape 1 — SQL dans Supabase (5 min)

Va sur https://supabase.com/dashboard/project/btmdgbtcxmytfjanfixj/sql/new

Colle le SQL fourni dans le chat (création tables `nodex_accounts`, `nodex_promo_codes`, `nodex_audit_log`, RLS, trigger), clique **RUN**.

## ✅ Étape 2 — Bucket Storage (3 min)

1. Supabase → **Storage** → **New bucket**
2. Nom : `nodex-skill-zips`
3. **Public bucket** : ❌ DÉCOCHÉ (privé obligatoire)
4. Upload `downloads/nodex-v5.3.zip` dans le bucket

## ✅ Étape 3 — Variables d'environnement Vercel (5 min)

Va sur https://vercel.com → ton projet `landing-nodextrading` → **Settings** → **Environment Variables**

Ajoute ces 4 variables (Production + Preview + Development) :

| Nom | Valeur | Où la trouver |
|---|---|---|
| `SUPABASE_URL` | `https://btmdgbtcxmytfjanfixj.supabase.co` | Supabase → Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | `eyJhbGc...` (longue chaîne) | Supabase → Settings → API → `anon public` |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` ou `eyJ...` | Supabase → Settings → API → `service_role` (⚠ secret) |
| `SITE_ORIGIN` | `https://nodextrading.com` (ou ton URL Vercel) | Ton domaine de prod |

Click **Save**. Re-déploie le projet (Deployments → ⋯ → Redeploy).

## ✅ Étape 4 — Tester (5 min)

1. Va sur ton site `nodextrading.com/compte.html`
2. Saisis ton email → clique "Recevoir mon lien"
3. Tu dois recevoir un email Supabase → clique le lien
4. Tu es connecté · dashboard apparaît · tier "essentiel" par défaut
5. Saisis le code partenaire dans le champ "Code partenaire" → clique "Activer"
6. Tier passe à "elite" (si tu as bien inséré le hash MARLDE en SQL)
7. Click "Télécharger ZIP" → URL signée 60s → ZIP téléchargé
8. Click "Ouvrir formation" → vérifie auth côté serveur → HTML servi

## 🔧 Architecture des API routes

```
/api/config                       → expose SUPABASE_URL + SUPABASE_ANON_KEY au frontend
/api/auth/send-magic-link  POST   { email } → envoie magic link
/api/auth/redeem-code      POST   { code } + JWT → applique tier
/api/account/me            GET    JWT → infos compte
/api/download/skill        GET    JWT → URL signée Supabase Storage
/api/download/skill-redirect GET  Rewrite /downloads/nodex-v5.3.zip → URL signée + redirect
/api/formation/get         GET    JWT → HTML formation servi côté serveur
```

## 🔐 Sécurité résolue

| Limite avant | Solution V2 backend |
|---|---|
| localStorage perdu si change PC | ✅ Cookie Supabase httpOnly cross-device |
| Formation bypass JS | ✅ Servie côté serveur, JWT vérifié |
| ZIP URL publique | ✅ URL signée 60s, vérification tier |
| Codes en clair | ✅ Hash SHA-256 stocké en BDD |
| Pas de tracking | ✅ Audit log dans `nodex_audit_log` |

## 📊 Monitoring

Pour voir l'activité :
- Supabase → Table Editor → `nodex_audit_log`
- Voir qui se connecte, qui télécharge, qui active des codes

## 💸 Coûts

Tout est dans le **free tier** Supabase + Vercel :
- Supabase Free : 500 MB DB · 1 GB Storage · 50k MAU · 2 GB bandwidth
- Vercel Free : 100 GB bandwidth · 100k Functions invocations
- Resend (emails Supabase) : 4 emails/heure inclus, suffit pour 4-10 utilisateurs

Pour passer à l'échelle (1000+ utilisateurs) : ~25 €/mois total.

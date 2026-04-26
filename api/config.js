// GET /api/config
// → expose SUPABASE_URL et SUPABASE_ANON_KEY au frontend
// (Ces clés sont publiques par design, OK de les exposer.)

import { setCors } from './_lib/supabase.js';

export default function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  return res.status(200).json({
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ''
  });
}

// Script de synchronisation des noms d'agents entre Supabase Auth et la table users (ESM)
// À lancer avec Node.js : node sync_agents.mjs

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://holvmacfhxfteqcirfyt.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvbHZtYWNmaHhmdGVxY2lyZnl0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY2NTc3NiwiZXhwIjoyMDY1MjQxNzc2fQ.ttiZsOrNRuXBBgosH8AEfvH-bxp2lZcKcl-K-Wm2tgc';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function syncAgentNames() {
  // 1. Récupérer tous les users Auth
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;

  // 2. Pour chaque user, mettre à jour la table users si c'est un agent
  for (const user of users.users) {
    const id = user.id;
    const displayName = user.user_metadata?.full_name || user.user_metadata?.display_name || user.user_metadata?.name || user.email;
    // Chercher dans la table users
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('id, role, full_name')
      .eq('id', id)
      .single();
    if (dbError) continue;
    if (dbUser && dbUser.role === 'agent' && dbUser.full_name !== displayName) {
      // Mettre à jour le nom
      await supabase
        .from('users')
        .update({ full_name: displayName })
        .eq('id', id);
      console.log(`✅ Agent ${id} synchronisé : ${displayName}`);
    }
  }
  console.log('Synchronisation terminée.');
}

syncAgentNames().catch(console.error);

// Service utilitaire pour l'analytics avancé des tickets
import { supabase } from '../utils/supabase';
import { Database } from '../lib/supabase-types';

type Ticket = Database['public']['Tables']['tickets']['Row'];

export const analyticsService = {
  // Tickets par période (par semaine ou par mois)
  async getTicketsEvolution(period: 'week' | 'month' = 'week') {
    // On récupère tous les tickets (pour admin/agent)
    const { data, error } = await supabase
      .from('tickets')
      .select('id, created_at, resolved_at, agent_id, priority, status');
    if (error) throw error;
    if (!data) return [];

    // Regrouper par semaine/mois
    const groupKey = (date: string) => {
      const d = new Date(date);
      if (period === 'week') {
        // Année + numéro de semaine
        const firstDay = new Date(d.getFullYear(), 0, 1);
        const days = Math.floor((d.getTime() - firstDay.getTime()) / 86400000);
        const week = Math.ceil((days + firstDay.getDay() + 1) / 7);
        return `${d.getFullYear()}-S${week}`;
      } else {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
    };

    const evolution: Record<string, number> = {};
    for (const t of data) {
      if (t.created_at) {
        const key = groupKey(t.created_at);
        evolution[key] = (evolution[key] || 0) + 1;
      }
    }
    // Retourne un tableau trié par période
    return Object.entries(evolution)
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => a.period.localeCompare(b.period));
  },

  // Temps de résolution moyen (en heures)
  async getAverageResolutionTime() {
    const { data, error } = await supabase
      .from('tickets')
      .select('created_at, resolved_at')
      .eq('status', 'resolu');
    if (error) throw error;
    if (!data || data.length === 0) return 0;
    const total = data.reduce((sum, t) => {
      if (t.created_at && t.resolved_at) {
        const start = new Date(t.created_at).getTime();
        const end = new Date(t.resolved_at).getTime();
        return sum + (end - start);
      }
      return sum;
    }, 0);
    return Math.round(total / data.length / 3600000); // en heures
  },

  // Répartition des tickets par agent
  async getTicketsByAgent() {
    const { data, error } = await supabase
      .from('tickets')
      .select('agent_id');
    if (error) throw error;
    const counts: Record<string, number> = {};
    for (const t of data || []) {
      if (t.agent_id) counts[t.agent_id] = (counts[t.agent_id] || 0) + 1;
    }
    return counts;
  },

  // Répartition des tickets par priorité
  async getTicketsByPriority() {
    const { data, error } = await supabase
      .from('tickets')
      .select('priority');
    if (error) throw error;
    const counts: Record<string, number> = {};
    for (const t of data || []) {
      if (t.priority) counts[t.priority] = (counts[t.priority] || 0) + 1;
    }
    return counts;
  }
};

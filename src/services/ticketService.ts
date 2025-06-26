import { supabase } from '../utils/supabase';
import { Database } from '../lib/supabase-types';

type Ticket = Database['public']['Tables']['tickets']['Row'];
type TicketInsert = Database['public']['Tables']['tickets']['Insert'];
type TicketUpdate = Database['public']['Tables']['tickets']['Update'];

export const ticketService = {
  // Récupérer tous les tickets selon le rôle de l'utilisateur (CORRIGÉ)
  async getTickets(userId?: string, role?: string) {
    let query = supabase
      .from('tickets')
      .select(`
        *,
        client:users!tickets_client_id_fkey(id, full_name, email, company, department),
        agent:users!tickets_agent_id_fkey(id, full_name, email)
      `)
      .order('created_at', { ascending: false });

    // Si c'est un client, ne montrer que ses tickets
    if (role === 'client' && userId) {
      query = query.eq('client_id', userId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Erreur lors du chargement des tickets:', error);
      throw error;
    }
    
    console.log('Tickets chargés avec données client:', data);
    return data;
  },

  // Récupérer un ticket par ID (CORRIGÉ)
  async getTicketById(id: string) {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        client:users!tickets_client_id_fkey(id, full_name, email, company, department, phone),
        agent:users!tickets_agent_id_fkey(id, full_name, email)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erreur lors du chargement du ticket:', error);
      throw error;
    }
    
    console.log('Ticket chargé avec données complètes:', data);
    return data;
  },

  // Créer un nouveau ticket
  async createTicket(ticket: TicketInsert) {
    try {
      console.log('Tentative de création de ticket avec:', ticket);
      
      const { data, error } = await supabase
        .from('tickets')
        .insert(ticket)
        .select(`
          *,
          client:users!tickets_client_id_fkey(id, full_name, email, company),
          agent:users!tickets_agent_id_fkey(id, full_name, email)
        `)
        .single();

      if (error) {
        console.error('Erreur Supabase lors de la création du ticket:', error);
        throw error;
      }
      
      console.log('Ticket créé avec succès:', data);
      return data;
    } catch (error) {
      console.error('Erreur lors de la création du ticket:', error);
      throw error;
    }
  },

  // Mettre à jour un ticket
  async updateTicket(id: string, updates: TicketUpdate) {
    const { data, error } = await supabase
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        client:users!tickets_client_id_fkey(id, full_name, email, company),
        agent:users!tickets_agent_id_fkey(id, full_name, email)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Supprimer un ticket (admin seulement) - Version corrigée
  async deleteTicket(ticketId: string) {
    console.log('🗑️ Suppression du ticket:', ticketId);
    
    try {
      // Utiliser la fonction de suppression en cascade corrigée
      const { data, error } = await supabase.rpc('delete_ticket_cascade', {
        ticket_id: ticketId
      });

      if (error) {
        console.error('❌ Erreur suppression ticket:', error);
        
        // Si la fonction RPC échoue, essayer une suppression directe
        console.log('🔄 Tentative de suppression directe...');
        
        const { error: directError } = await supabase
          .from('tickets')
          .delete()
          .eq('id', ticketId);
          
        if (directError) {
          throw new Error(`Impossible de supprimer le ticket: ${directError.message}`);
        }
        
        console.log('✅ Ticket supprimé directement');
        return { success: true, method: 'direct' };
      }

      // Vérifier le résultat de la fonction
      if (data && typeof data === 'object' && data.success === false) {
        throw new Error(data.error || 'Erreur lors de la suppression');
      }

      console.log('✅ Ticket supprimé avec succès:', data);
      return data;
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      throw error;
    }
  },

  // Assigner un ticket à un agent
  async assignTicket(ticketId: string, agentId: string) {
    return this.updateTicket(ticketId, { 
      agent_id: agentId, 
      status: 'en_cours' 
    });
  },

  // Changer le statut d'un ticket
  async updateTicketStatus(ticketId: string, status: Ticket['status']) {
    const updates: TicketUpdate = { status };
    
    // Ajouter les timestamps appropriés
    if (status === 'resolu') {
      updates.resolved_at = new Date().toISOString();
    } else if (status === 'ferme') {
      updates.closed_at = new Date().toISOString();
    }
    
    return this.updateTicket(ticketId, updates);
  },

  // Récupérer les statistiques des tickets
  async getTicketStats(userId?: string, role?: string) {
    let query = supabase.from('tickets').select('status, priority');

    if (role === 'client' && userId) {
      query = query.eq('client_id', userId);
    } else if (role === 'agent' && userId) {
      query = query.eq('agent_id', userId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const stats = {
      total: data.length,
      ouvert: data.filter(t => t.status === 'ouvert').length,
      en_cours: data.filter(t => t.status === 'en_cours').length,
      en_attente: data.filter(t => t.status === 'en_attente').length,
      resolu: data.filter(t => t.status === 'resolu').length,
      ferme: data.filter(t => t.status === 'ferme').length,
      urgents: data.filter(t => t.priority === 'urgente').length,
    };

    return stats;
  },

  // Rechercher des tickets (CORRIGÉ)
  async searchTickets(query: string, userId?: string, role?: string) {
    let searchQuery = supabase
      .from('tickets')
      .select(`
        *,
        client:users!tickets_client_id_fkey(id, full_name, email, company),
        agent:users!tickets_agent_id_fkey(id, full_name, email)
      `)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (role === 'client' && userId) {
      searchQuery = searchQuery.eq('client_id', userId);
    }

    const { data, error } = await searchQuery;
    if (error) throw error;
    return data;
  }
};
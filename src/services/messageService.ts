import { supabase } from '../utils/supabase';
import { Database } from '../lib/supabase-types';

type Message = Database['public']['Tables']['messages']['Row'];
type MessageInsert = Database['public']['Tables']['messages']['Insert'];

export const messageService = {
  // Récupérer les messages d'un ticket
  async getTicketMessages(ticketId: string) {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        user:users!messages_user_id_fkey(id, full_name, email, role, avatar_url)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  },

  // Créer un nouveau message
  async createMessage(message: MessageInsert) {
    const { data, error } = await supabase
      .from('messages')
      .insert(message)
      .select(`
        *,
        user:users!messages_user_id_fkey(id, full_name, email, role, avatar_url)
      `)
      .single();

    if (error) throw error;
    return data;
  },

  // Mettre à jour un message
  async updateMessage(id: string, content: string) {
    const { data, error } = await supabase
      .from('messages')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Supprimer un message (soft delete en marquant le contenu)
  async deleteMessage(id: string) {
    const { data, error } = await supabase
      .from('messages')
      .update({ 
        content: '[Message supprimé]',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Marquer les messages comme lus (fonctionnalité future)
  async markAsRead(ticketId: string, userId: string) {
    // Cette fonctionnalité nécessiterait une table séparée pour les statuts de lecture
    // Pour l'instant, on retourne juste true
    return true;
  }
};
import { supabase } from '../utils/supabase';

export interface RemoteSession {
  id: string;
  ticket_id: string;
  agent_id: string;
  client_id: string;
  session_id: string;
  password: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  started_at: string;
  ended_at?: string;
  recording_url?: string;
}

export const remoteControlService = {
  // Créer une nouvelle session de contrôle à distance
  async createSession(ticketId: string, agentId: string, clientId: string): Promise<RemoteSession> {
    const sessionId = `GIT-${ticketId.slice(0, 8)}-${Date.now()}`;
    const password = Math.random().toString(36).substring(2, 10).toUpperCase();

    const sessionData = {
      ticket_id: ticketId,
      agent_id: agentId,
      client_id: clientId,
      session_id: sessionId,
      password: password,
      status: 'pending' as const,
      started_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('remote_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Mettre à jour le statut d'une session
  async updateSessionStatus(sessionId: string, status: RemoteSession['status'], endedAt?: string) {
    const updates: any = { status };
    if (endedAt) {
      updates.ended_at = endedAt;
    }

    const { data, error } = await supabase
      .from('remote_sessions')
      .update(updates)
      .eq('session_id', sessionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Récupérer les sessions d'un ticket
  async getTicketSessions(ticketId: string): Promise<RemoteSession[]> {
    const { data, error } = await supabase
      .from('remote_sessions')
      .select(`
        *,
        agent:users!remote_sessions_agent_id_fkey(full_name, email),
        client:users!remote_sessions_client_id_fkey(full_name, email)
      `)
      .eq('ticket_id', ticketId)
      .order('started_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Envoyer une notification au client pour la session
  async notifyClient(sessionId: string, clientId: string, agentName: string) {
    // Créer une notification pour le client
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: clientId,
        title: 'Demande de Contrôle à Distance',
        message: `${agentName} souhaite accéder à votre ordinateur pour vous aider. Session: ${sessionId}`,
        type: 'info',
        action_url: `/remote-control/${sessionId}`
      });

    if (error) throw error;
  },

  // Enregistrer les actions de la session (pour audit)
  async logSessionAction(sessionId: string, action: string, details?: any) {
    const { error } = await supabase
      .from('remote_session_logs')
      .insert({
        session_id: sessionId,
        action: action,
        details: details,
        timestamp: new Date().toISOString()
      });

    if (error) console.error('Erreur lors de l\'enregistrement de l\'action:', error);
  }
};
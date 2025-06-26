export interface User {
  id: string;
  email: string;
  name: string;
  role: 'client' | 'agent' | 'admin';
  avatar_url?: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'ouvert' | 'en_cours' | 'en_attente' | 'resolu' | 'ferme';
  priority: 'faible' | 'normale' | 'elevee' | 'urgente';
  category: string;
  client_id: string;
  agent_id?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface Message {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

export interface KnowledgeBase {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  views: number;
  created_at: string;
  updated_at: string;
}
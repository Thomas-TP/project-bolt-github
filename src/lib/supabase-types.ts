export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: 'client' | 'agent' | 'admin';
          avatar_url: string | null;
          phone: string | null;
          company: string | null;
          department: string | null;
          is_active: boolean;
          last_login: string | null;
          created_at: string;
          updated_at: string;
          onboarded: boolean;
          first_name: string | null;
          last_name: string | null;
          nickname: string | null;
          job_title: string | null;
          linkedin_url: string | null;
          bio: string | null;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: 'client' | 'agent' | 'admin';
          avatar_url?: string | null;
          phone?: string | null;
          company?: string | null;
          department?: string | null;
          is_active?: boolean;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
          onboarded?: boolean;
          first_name?: string | null;
          last_name?: string | null;
          nickname?: string | null;
          job_title?: string | null;
          linkedin_url?: string | null;
          bio?: string | null;
          notification_prefs?: any | null;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: 'client' | 'agent' | 'admin';
          avatar_url?: string | null;
          phone?: string | null;
          company?: string | null;
          department?: string | null;
          is_active?: boolean;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
          onboarded?: boolean;
          first_name?: string | null;
          last_name?: string | null;
          nickname?: string | null;
          job_title?: string | null;
          linkedin_url?: string | null;
          bio?: string | null;
          notification_prefs?: any | null;
        };
      };
      tickets: {
        Row: {
          id: string;
          title: string;
          description: string;
          status: 'ouvert' | 'en_cours' | 'en_attente' | 'resolu' | 'ferme';
          priority: 'faible' | 'normale' | 'elevee' | 'urgente';
          category: string;
          client_id: string;
          agent_id: string | null;
          created_at: string;
          updated_at: string;
          resolved_at: string | null;
          closed_at: string | null;
          tags: string[];
          satisfaction_rating: number | null;
          satisfaction_comment: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          status?: 'ouvert' | 'en_cours' | 'en_attente' | 'resolu' | 'ferme';
          priority?: 'faible' | 'normale' | 'elevee' | 'urgente';
          category: string;
          client_id: string;
          agent_id?: string | null;
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
          closed_at?: string | null;
          tags?: string[];
          satisfaction_rating?: number | null;
          satisfaction_comment?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          status?: 'ouvert' | 'en_cours' | 'en_attente' | 'resolu' | 'ferme';
          priority?: 'faible' | 'normale' | 'elevee' | 'urgente';
          category?: string;
          client_id?: string;
          agent_id?: string | null;
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
          closed_at?: string | null;
          tags?: string[];
          satisfaction_rating?: number | null;
          satisfaction_comment?: string | null;
        };
      };
      messages: {
        Row: {
          id: string;
          ticket_id: string;
          user_id: string;
          content: string;
          is_internal: boolean;
          attachments: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          user_id: string;
          content: string;
          is_internal?: boolean;
          attachments?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          user_id?: string;
          content?: string;
          is_internal?: boolean;
          attachments?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      knowledge_base: {
        Row: {
          id: string;
          title: string;
          content: string;
          category: string | null;
          tags: string[];
          author_id: string;
          views: number;
          is_published: boolean;
          is_featured: boolean;
          created_at: string;
          updated_at: string;
          published_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          category?: string | null;
          tags?: string[];
          author_id: string;
          views?: number;
          is_published?: boolean;
          is_featured?: boolean;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          category?: string | null;
          tags?: string[];
          author_id?: string;
          views?: number;
          is_published?: boolean;
          is_featured?: boolean;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          color: string;
          icon: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          color?: string;
          icon?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          color?: string;
          icon?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          is_read: boolean;
          action_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type?: string;
          is_read?: boolean;
          action_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: string;
          is_read?: boolean;
          action_url?: string | null;
          created_at?: string;
        };
      };
      invitations: {
        Row: {
          id: string;
          email: string;
          token: string;
          expires_at: string;
          created_at: string;
          used_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          token: string;
          expires_at: string;
          created_at?: string;
          used_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          token?: string;
          expires_at?: string;
          created_at?: string;
          used_at?: string | null;
        };
      };
    };
  };
}


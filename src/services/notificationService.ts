import { supabase } from '../utils/supabase';
import { Database } from '../lib/supabase-types';

type Notification = Database['public']['Tables']['notifications']['Row'];

export const notificationService = {
  // Récupérer les notifications de l'utilisateur
  async getUserNotifications(limit: number = 50) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  // Récupérer les notifications non lues
  async getUnreadNotifications() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Marquer une notification comme lue
  async markAsRead(notificationId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Marquer toutes les notifications comme lues
  async markAllAsRead() {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false)
      .select();

    if (error) throw error;
    return data;
  },

  // Supprimer une notification
  async deleteNotification(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
  },

  // Créer une notification manuelle
  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    actionUrl?: string
  ) {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        action_url: actionUrl
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // S'abonner aux notifications en temps réel
  subscribeToNotifications(userId: string, callback: (notification: Notification) => void) {
    // Créer un canal unique pour éviter les conflits
    const channelName = `notifications_${userId}_${Date.now()}`;
    
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Nouvelle notification reçue:', payload.new);
          callback(payload.new as Notification);
        }
      )
      .subscribe((status) => {
        console.log('Statut subscription notifications:', status);
      });

    return subscription;
  },

  // Obtenir le nombre de notifications non lues
  async getUnreadCount() {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  }
};
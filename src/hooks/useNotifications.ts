import { useState, useEffect, useRef } from 'react';
import { notificationService } from '../services/notificationService';
import { useUser } from './useUser';
import { Database } from '../lib/supabase-types';
import { supabase } from '../utils/supabase';

type Notification = Database['public']['Tables']['notifications']['Row'];

export const useNotifications = () => {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<any>(null);
  const [subscriptionInitialized, setSubscriptionInitialized] = useState(false);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    fetchNotifications();
    fetchUnreadCount();

    // Nettoyer l'ancienne subscription si elle existe
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    // S'abonner aux nouvelles notifications en temps réel via Supabase
    if (!subscriptionInitialized) {
      const channelName = `notifications-changes-${Date.now()}`;
      console.log(`Initialisation du canal de notifications: ${channelName}`);
      
      const notificationsSubscription = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Nouvelle notification reçue:', payload.new);
            
            // Ajouter la notification à la liste
            if (payload.new) {
              setNotifications(prev => [payload.new as Notification, ...prev]);
              setUnreadCount(prev => prev + 1);
              
              // Afficher une notification native du navigateur
              if ('Notification' in window && Notification.permission === 'granted') {
                const notif = payload.new as Notification;
                new Notification(notif.title, {
                  body: notif.message,
                  icon: '/favicon.ico'
                });
              }
            }
          }
        )
        .subscribe();

      subscriptionRef.current = notificationsSubscription;
      setSubscriptionInitialized(true);
      
      console.log('Abonnement aux notifications configuré');
    }

    return () => {
      if (subscriptionRef.current) {
        console.log('Nettoyage de l\'abonnement aux notifications');
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [user?.id]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationService.getUserNotifications();
      setNotifications(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Erreur lors du chargement du nombre de notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Erreur lors du marquage de toutes les notifications:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      
      // Décrémenter le compteur si la notification n'était pas lue
      const notification = notifications.find(n => n.id === notificationId);
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la notification:', error);
    }
  };

  // Demander la permission pour les notifications natives
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    requestNotificationPermission,
    refresh: fetchNotifications
  };
};
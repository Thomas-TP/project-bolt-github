import { useState, useEffect } from 'react';
import { Bell, BellOff, Check, X } from 'lucide-react';
import PushNotificationService from '../../services/pushNotificationService';

export function PushNotificationSettings() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTestNotification, setShowTestNotification] = useState(false);
  const pushService = PushNotificationService.getInstance();

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    const subscribed = await pushService.isSubscribed();
    setIsSubscribed(subscribed);
  };

  const handleToggleNotifications = async () => {
    setIsLoading(true);
    
    try {
      if (isSubscribed) {
        const success = await pushService.unsubscribe();
        if (success) {
          setIsSubscribed(false);
        }
      } else {
        const subscription = await pushService.subscribe();
        if (subscription) {
          setIsSubscribed(true);
          // Register periodic sync after subscribing
          await pushService.registerPeriodicSync();
        }
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleTestNotification = async () => {
    await pushService.sendLocalNotification('Test HelpDesk GIT', {
      body: 'Ceci est une notification de test pour vérifier que tout fonctionne correctement.',
      tag: 'test-notification',
      requireInteraction: true
    });
    setShowTestNotification(true);
    setTimeout(() => setShowTestNotification(false), 3000);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            {isSubscribed ? (
              <Bell className="h-5 w-5 text-blue-500 mr-2" />
            ) : (
              <BellOff className="h-5 w-5 text-gray-400 mr-2" />
            )}
            Notifications Push
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Recevez des notifications même lorsque l'application est fermée
          </p>
        </div>
        
        <button
          onClick={handleToggleNotifications}
          disabled={isLoading}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            isSubscribed ? 'bg-blue-600' : 'bg-gray-200'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              isSubscribed ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {isSubscribed && (
        <div className="space-y-4">
          <div className="flex items-center text-sm text-green-600">
            <Check className="h-4 w-4 mr-2" />
            Notifications activées
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleTestNotification}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
            >
              Tester les notifications
            </button>
          </div>

          {showTestNotification && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <div className="flex items-center">
                <Check className="h-4 w-4 text-green-400 mr-2" />
                <span className="text-sm text-green-800">
                  Notification de test envoyée !
                </span>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              Vous recevrez des notifications pour :
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Nouveaux tickets assignés</li>
              <li>• Réponses aux tickets</li>
              <li>• Mises à jour importantes</li>
              <li>• Rappels de tickets en attente</li>
            </ul>
          </div>
        </div>
      )}

      {!isSubscribed && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
          <div className="flex items-center mb-2">
            <X className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-sm text-gray-600">
              Notifications désactivées
            </span>
          </div>
          <p className="text-sm text-gray-500">
            Activez les notifications pour rester informé des nouveaux tickets et mises à jour importantes.
          </p>
        </div>
      )}
    </div>
  );
}

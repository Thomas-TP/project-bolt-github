import React, { useEffect, useState } from 'react';
import { Bell, Mail, Smartphone, CheckCircle } from 'lucide-react';
import { userService } from '../../services/userService';
import { PushNotificationSettings } from '../PWA/PushNotificationSettings';

const defaultPrefs = {
  push: true,
  email: true,
  toast: true,
  ticket: true,
  reply: true,
  important: true,
  reminder: true
};

export default function UserNotificationSettings() {
  const [prefs, setPrefs] = useState(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    userService.getCurrentUserProfile().then(u => {
      if (u && u.notification_prefs) setPrefs({ ...defaultPrefs, ...u.notification_prefs });
      setLoading(false);
    });
  }, []);

  const handleChange = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrefs(p => ({ ...p, [key]: e.target.checked }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Ajoute ou met à jour le champ notification_prefs dans le profil utilisateur
      const user = await userService.getCurrentUserProfile();
      await userService.updateProfile(user.id, { notification_prefs: prefs });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Bell className="w-5 h-5" /> Préférences de notifications</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={prefs.push} onChange={handleChange('push')} />
            <Smartphone className="w-4 h-4" /> Notifications push (web/PWA/mobile)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={prefs.email} onChange={handleChange('email')} />
            <Mail className="w-4 h-4" /> Notifications par email
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={prefs.toast} onChange={handleChange('toast')} />
            <Bell className="w-4 h-4" /> Notifications toast (popup dans l'app)
          </label>
        </div>
        <div className="space-y-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={prefs.ticket} onChange={handleChange('ticket')} />
            Nouveau ticket assigné
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={prefs.reply} onChange={handleChange('reply')} />
            Réponse à un ticket
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={prefs.important} onChange={handleChange('important')} />
            Mises à jour importantes
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={prefs.reminder} onChange={handleChange('reminder')} />
            Rappels de tickets
          </label>
        </div>
      </div>
      <div className="flex gap-4 items-center mt-4">
        <button onClick={handleSave} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold shadow disabled:opacity-50">Enregistrer</button>
        {success && <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Préférences enregistrées</span>}
      </div>
      <div className="mt-8">
        <PushNotificationSettings />
      </div>
    </div>
  );
}

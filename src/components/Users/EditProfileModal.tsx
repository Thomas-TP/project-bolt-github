import React, { useState } from 'react';
import { userService } from '../../services/userService';
import { hybridStorage } from '../../utils/hybridStorage';
import { Database } from '../../lib/supabase-types';

interface EditProfileModalProps {
  user: Database['public']['Tables']['users']['Row'];
  onClose: () => void;
  onProfileUpdated: (user: Database['public']['Tables']['users']['Row']) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, onClose, onProfileUpdated }) => {
  console.log('[EditProfileModal] Rendu du composant. Props user:', user);
  if (!user) {
    console.error('[EditProfileModal] Propriété user manquante ou nulle. Le composant ne sera pas affiché.');
    return null;
  }
  const [formData, setFormData] = useState({
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    nickname: user.nickname || '',
    email: user.email,
    phone: user.phone || '',
    company: user.company || '',
    department: user.department || '',
    job_title: user.job_title || '',
    linkedin_url: user.linkedin_url || '',
    bio: user.bio || '',
    avatar_url: user.avatar_url || '',
  });
  console.log('[EditProfileModal] formData initialisé:', formData);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    console.log(`[EditProfileModal] Changement de champ: ${name} =`, value);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      console.log('[EditProfileModal] Fichier avatar sélectionné:', file);
      try {
        const result = await hybridStorage.uploadFile(
          'profile-avatars',
          file,
          `${user.id}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
          user.id,
          'ticket' // catégorie requise, on utilise 'ticket' pour compatibilité
        );
        console.log('[EditProfileModal] Résultat upload avatar:', result);
        if (result.success && result.data?.fileData?.data && result.data?.fileData?.type) {
          // Générer une data URL base64 compatible CSP
          const url = `data:${result.data.fileData.type};base64,${result.data.fileData.data}`;
          setFormData((prev) => ({ ...prev, avatar_url: url }));
        } else {
          setError('Erreur lors de l’upload de la photo de profil.');
          console.error('[EditProfileModal] Erreur upload avatar:', result);
        }
      } catch (err) {
        setError('Erreur inattendue lors de l’upload de la photo de profil.');
        console.error('[EditProfileModal] Exception upload avatar:', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    console.log('[EditProfileModal] Soumission du formulaire. formData:', formData);
    try {
      let avatar_url = formData.avatar_url;
      if (avatarFile && formData.avatar_url.startsWith('/api/profile-avatar/')) {
        avatar_url = formData.avatar_url;
      }
      const updates = {
        ...formData,
        avatar_url,
      };
      console.log('[EditProfileModal] Données envoyées à userService.updateProfile:', updates);
      const updated = await userService.updateProfile(user.id, updates);
      console.log('[EditProfileModal] Profil mis à jour avec succès:', updated);
      onProfileUpdated(updated);
      onClose();
    } catch (err: any) {
      setError('Erreur lors de la mise à jour du profil.');
      console.error('[EditProfileModal] Erreur lors de la mise à jour du profil:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 w-full max-w-lg flex flex-col items-center animate-fade-in overflow-y-auto max-h-[95vh]">
        <h2 className="text-2xl font-bold mb-4 text-center">Modifier mon profil</h2>
        <form onSubmit={handleSubmit} className="space-y-4 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-semibold mb-1 text-gray-800">Prénom <span className="text-red-500">*</span></label>
              <div className="text-xs text-gray-500 mb-2">Votre prénom officiel</div>
              <input name="first_name" value={formData.first_name} onChange={handleChange} className="input input-bordered w-full rounded-xl border-2 border-yellow-300 bg-yellow-50 focus:border-red-400 focus:bg-white transition text-base px-4 py-3" required />
            </div>
            <div>
              <label className="block text-base font-semibold mb-1 text-gray-800">Nom <span className="text-red-500">*</span></label>
              <div className="text-xs text-gray-500 mb-2">Votre nom de famille</div>
              <input name="last_name" value={formData.last_name} onChange={handleChange} className="input input-bordered w-full rounded-xl border-2 border-yellow-300 bg-yellow-50 focus:border-red-400 focus:bg-white transition text-base px-4 py-3" required />
            </div>
          </div>
          <div>
            <label className="block text-base font-semibold mb-1 text-gray-800">Surnom</label>
            <div className="text-xs text-gray-500 mb-2">Un pseudo ou diminutif (optionnel)</div>
            <input name="nickname" value={formData.nickname} onChange={handleChange} className="input input-bordered w-full rounded-xl border-2 border-yellow-300 bg-yellow-50 focus:border-red-400 focus:bg-white transition text-base px-4 py-3" />
          </div>
          <div>
            <label className="block text-base font-semibold mb-1 text-gray-800">Email</label>
            <div className="text-xs text-gray-500 mb-2">Non modifiable</div>
            <input name="email" value={formData.email} disabled className="input input-bordered w-full rounded-xl border-2 border-gray-200 bg-gray-100 text-gray-400 text-base px-4 py-3" />
          </div>
          <div>
            <label className="block text-base font-semibold mb-1 text-gray-800">Téléphone</label>
            <div className="text-xs text-gray-500 mb-2">Numéro de contact (optionnel)</div>
            <input name="phone" value={formData.phone} onChange={handleChange} className="input input-bordered w-full rounded-xl border-2 border-yellow-300 bg-yellow-50 focus:border-red-400 focus:bg-white transition text-base px-4 py-3" />
          </div>
          {/* Organisation supprimée */}
          <div>
            <label className="block text-base font-semibold mb-1 text-gray-800">Département</label>
            <div className="text-xs text-gray-500 mb-2">Service ou équipe (optionnel)</div>
            <input name="department" value={formData.department} onChange={handleChange} className="input input-bordered w-full rounded-xl border-2 border-yellow-300 bg-yellow-50 focus:border-red-400 focus:bg-white transition text-base px-4 py-3" />
          </div>
          <div>
            <label className="block text-base font-semibold mb-1 text-gray-800">Poste</label>
            <div className="text-xs text-gray-500 mb-2">Votre fonction (optionnel)</div>
            <input name="job_title" value={formData.job_title} onChange={handleChange} className="input input-bordered w-full rounded-xl border-2 border-yellow-300 bg-yellow-50 focus:border-red-400 focus:bg-white transition text-base px-4 py-3" />
          </div>
          <div>
            <label className="block text-base font-semibold mb-1 text-gray-800">Profil LinkedIn</label>
            <div className="text-xs text-gray-500 mb-2">Lien vers votre profil (optionnel)</div>
            <input name="linkedin_url" value={formData.linkedin_url} onChange={handleChange} className="input input-bordered w-full rounded-xl border-2 border-yellow-300 bg-yellow-50 focus:border-red-400 focus:bg-white transition text-base px-4 py-3" />
          </div>
          <div>
            <label className="block text-base font-semibold mb-1 text-gray-800">Bio courte</label>
            <div className="text-xs text-gray-500 mb-2">Quelques mots sur vous (optionnel, max 200 caractères)</div>
            <textarea name="bio" value={formData.bio} onChange={handleChange} className="input input-bordered w-full min-h-[80px] rounded-xl border-2 border-yellow-300 bg-yellow-50 focus:border-red-400 focus:bg-white transition text-base px-4 py-3" maxLength={200} />
          </div>
          <div>
            <label className="block text-base font-semibold mb-1 text-gray-800">Photo de profil</label>
            <div className="text-xs text-gray-500 mb-2">Ajoutez une photo professionnelle (optionnel)</div>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
              id="avatar-upload"
            />
            <label htmlFor="avatar-upload" className="inline-block cursor-pointer px-4 py-2 mt-2 rounded-full bg-gradient-to-r from-red-400 to-yellow-400 text-white font-semibold shadow hover:from-red-500 hover:to-yellow-500 transition-all">
              Choisir une photo
            </label>
            {formData.avatar_url && (
              <img src={formData.avatar_url} alt="avatar" className="w-20 h-20 rounded-full mt-4 shadow object-cover" />
            )}
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="flex justify-end space-x-2 mt-6">
            <button type="button" onClick={onClose} className="btn rounded-full px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold shadow transition-all">Annuler</button>
            <button type="submit" className="btn rounded-full px-6 py-2 bg-gradient-to-r from-red-400 to-yellow-400 hover:from-red-500 hover:to-yellow-500 text-white font-bold shadow-lg transition-all" disabled={loading}>{loading ? 'Enregistrement...' : 'Enregistrer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;

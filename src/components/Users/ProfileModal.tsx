import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Database } from '../../lib/supabase-types';

interface ProfileModalProps {
  user: Database['public']['Tables']['users']['Row'];
  onClose: () => void;
  onProfileUpdated: (user: Database['public']['Tables']['users']['Row']) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, onProfileUpdated }) => {
  const [formData, setFormData] = useState({
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    nickname: user.nickname || '',
    email: user.email,
    phone: user.phone || '',
    department: user.department || '',
    job_title: user.job_title || '',
    linkedin_url: user.linkedin_url || '',
    bio: user.bio || '',
    avatar_url: user.avatar_url || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Appeler ici la fonction d'update du profil (à adapter selon ton service)
      // const updated = await userService.updateProfile(user.id, formData);
      // onProfileUpdated(updated);
      onProfileUpdated({ ...user, ...formData }); // Simule la mise à jour
      onClose();
    } catch (err: any) {
      setError('Erreur lors de la mise à jour du profil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 md:p-8 w-full max-w-lg flex flex-col items-center animate-fade-in overflow-y-auto max-h-[95vh]">
        <div className="flex items-center justify-between w-full mb-4">
          <h2 className="text-2xl font-bold text-center flex-1">Mon profil</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors ml-4">
            <X className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-base font-semibold mb-1 text-gray-800">Prénom <span className="text-red-500">*</span></label>
              <input name="first_name" value={formData.first_name} onChange={handleChange} className="input input-bordered w-full rounded-xl border-2 border-yellow-300 bg-yellow-50 focus:border-red-400 focus:bg-white transition text-base px-4 py-3" required />
            </div>
            <div>
              <label className="block text-base font-semibold mb-1 text-gray-800">Nom <span className="text-red-500">*</span></label>
              <input name="last_name" value={formData.last_name} onChange={handleChange} className="input input-bordered w-full rounded-xl border-2 border-yellow-300 bg-yellow-50 focus:border-red-400 focus:bg-white transition text-base px-4 py-3" required />
            </div>
          </div>
          <div>
            <label className="block text-base font-semibold mb-1 text-gray-800">Surnom</label>
            <input name="nickname" value={formData.nickname} onChange={handleChange} className="input input-bordered w-full rounded-xl border-2 border-yellow-300 bg-yellow-50 focus:border-red-400 focus:bg-white transition text-base px-4 py-3" />
          </div>
          <div>
            <label className="block text-base font-semibold mb-1 text-gray-800">Email</label>
            <input name="email" value={formData.email} disabled className="input input-bordered w-full rounded-xl border-2 border-gray-200 bg-gray-100 text-gray-400 text-base px-4 py-3" />
          </div>
          <div>
            <label className="block text-base font-semibold mb-1 text-gray-800">Téléphone</label>
            <input name="phone" value={formData.phone} onChange={handleChange} className="input input-bordered w-full rounded-xl border-2 border-yellow-300 bg-yellow-50 focus:border-red-400 focus:bg-white transition text-base px-4 py-3" />
          </div>
          <div>
            <label className="block text-base font-semibold mb-1 text-gray-800">Département</label>
            <input name="department" value={formData.department} onChange={handleChange} className="input input-bordered w-full rounded-xl border-2 border-yellow-300 bg-yellow-50 focus:border-red-400 focus:bg-white transition text-base px-4 py-3" />
          </div>
          <div>
            <label className="block text-base font-semibold mb-1 text-gray-800">Poste</label>
            <input name="job_title" value={formData.job_title} onChange={handleChange} className="input input-bordered w-full rounded-xl border-2 border-yellow-300 bg-yellow-50 focus:border-red-400 focus:bg-white transition text-base px-4 py-3" />
          </div>
          <div>
            <label className="block text-base font-semibold mb-1 text-gray-800">Profil LinkedIn</label>
            <input name="linkedin_url" value={formData.linkedin_url} onChange={handleChange} className="input input-bordered w-full rounded-xl border-2 border-yellow-300 bg-yellow-50 focus:border-red-400 focus:bg-white transition text-base px-4 py-3" />
          </div>
          <div>
            <label className="block text-base font-semibold mb-1 text-gray-800">Bio courte</label>
            <textarea name="bio" value={formData.bio} onChange={handleChange} className="input input-bordered w-full min-h-[80px] rounded-xl border-2 border-yellow-300 bg-yellow-50 focus:border-red-400 focus:bg-white transition text-base px-4 py-3" maxLength={200} />
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

export default ProfileModal;

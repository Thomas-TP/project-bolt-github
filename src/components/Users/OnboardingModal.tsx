import React, { useState } from 'react';
import { userService } from '../../services/userService';
import { Database } from '../../lib/supabase-types';
import { alternativeStorage } from '../../utils/alternativeStorage';

interface OnboardingModalProps {
  user: Database['public']['Tables']['users']['Row'];
  onOnboardingComplete: (user: Database['public']['Tables']['users']['Row']) => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ user, onOnboardingComplete }) => {
  // Champs et étapes de l'onboarding
  const steps = [
    { key: 'first_name', label: 'Prénom', required: true, description: 'Votre prénom officiel (obligatoire)' },
    { key: 'last_name', label: 'Nom', required: true, description: 'Votre nom de famille (obligatoire)' },
    { key: 'nickname', label: 'Surnom', required: false, description: 'Un surnom ou pseudo (optionnel)' },
    { key: 'email', label: 'Email', required: false, readonly: true, description: 'Votre adresse email (non modifiable)' },
    { key: 'phone', label: 'Téléphone', required: false, description: 'Numéro de téléphone (optionnel, pour contact rapide)' },
    { key: 'company', label: 'Organisation', required: true, description: 'Votre entreprise ou organisation (obligatoire)' },
    { key: 'department', label: 'Département', required: false, description: 'Département ou service (optionnel)' },
    { key: 'job_title', label: 'Poste', required: false, description: 'Votre poste ou fonction (optionnel)' },
    { key: 'linkedin_url', label: 'Profil LinkedIn', required: false, description: 'Lien vers votre profil LinkedIn (optionnel)' },
    { key: 'bio', label: 'Bio courte', required: false, description: 'Quelques mots sur vous (optionnel, max 200 caractères)' },
    { key: 'avatar_url', label: 'Photo de profil', required: false, type: 'file', description: 'Ajoutez une photo professionnelle (optionnel)' },
  ];

  const initialFormData = (user: Database['public']['Tables']['users']['Row']) => ({
    first_name: '',
    last_name: '',
    nickname: '',
    email: user.email,
    phone: user.phone || '',
    company: user.company || '',
    department: user.department || '',
    job_title: '',
    linkedin_url: '',
    bio: '',
    avatar_url: user.avatar_url || '',
  });

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState(initialFormData(user));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      // Upload direct de la photo de profil
      // Similaire à EditProfileModal
      const result = await import('../../utils/hybridStorage').then(m => m.hybridStorage.uploadFile(
        'profile-avatars',
        file,
        `${user.id}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
        user.id,
        'ticket'
      ));
      if (result.success && result.data?.fileData?.data && result.data?.fileData?.type) {
        // Générer une data URL base64 compatible CSP
        const url = `data:${result.data.fileData.type};base64,${result.data.fileData.data}`;
        setFormData((prev) => ({ ...prev, avatar_url: url }));
      } else {
        setError('Erreur lors de l’upload de la photo de profil.');
      }
    }
  };

  const handleNext = () => {
    setError(null);
    if (current.required && !formData[current.key as keyof typeof formData]) {
      setError('Ce champ est requis.');
      return;
    }
    setStep((s) => s + 1);
  };

  const handlePrev = () => {
    setError(null);
    setStep((s) => s - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let avatar_url = formData.avatar_url;
      if (avatarFile) {
        // TODO: upload avatar to Supabase Storage and get URL
        // avatar_url = await uploadAvatar(avatarFile);
      }
      const updates = {
        ...formData,
        avatar_url,
        onboarded: true,
      };
      const updated = await userService.updateProfile(user.id, updates);
      onOnboardingComplete(updated);
    } catch (err: any) {
      setError('Erreur lors de la configuration du profil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-red-100 to-yellow-100">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-lg flex flex-col items-center animate-fade-in">
        <img src="/logo.png" alt="Logo" className="w-20 h-20 mb-4" />
        <h2 className="text-2xl font-bold mb-2 text-center">Bienvenue !</h2>
        <p className="mb-6 text-center text-gray-600">Avant de commencer, personnalisez votre profil pour une expérience optimale.</p>
        <form onSubmit={isLast ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} className="w-full flex flex-col items-center">
          <div className="w-full mb-2">
            <label className="block text-base font-semibold mb-1 text-gray-800">{current.label}{current.required && <span className="text-red-500">*</span>}</label>
            <div className="text-xs text-gray-500 mb-2">{current.description}</div>
            {current.type === 'file' ? (
              <div className="w-full flex flex-col items-center">
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
            ) : current.key === 'bio' ? (
              <textarea name="bio" value={formData['bio']} onChange={handleChange} className="input input-bordered w-full min-h-[80px] rounded-xl border-2 border-yellow-300 bg-yellow-50 focus:border-red-400 focus:bg-white transition" maxLength={200} placeholder="Quelques mots sur vous..." />
            ) : (
              <input
                name={current.key}
                value={formData[current.key as keyof typeof formData] || ''}
                onChange={handleChange}
                className={`input input-bordered w-full rounded-xl border-2 border-yellow-300 bg-yellow-50 focus:border-red-400 focus:bg-white transition text-base px-4 py-3 ${current.readonly ? 'bg-gray-100 text-gray-400' : ''}`}
                required={current.required}
                readOnly={current.readonly}
                type={current.key === 'phone' ? 'tel' : 'text'}
                autoFocus
              />
            )}
          </div>
          {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
          <div className="flex justify-between w-full mt-6">
            {!isFirst && (
              <button type="button" className="btn rounded-full px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold shadow transition-all" onClick={handlePrev}>Précédent</button>
            )}
            {!isLast && (
              <button type="submit" className="btn rounded-full px-6 py-2 bg-gradient-to-r from-red-400 to-yellow-400 hover:from-red-500 hover:to-yellow-500 text-white font-bold shadow-lg ml-auto transition-all">Suivant</button>
            )}
            {isLast && (
              <button type="submit" className="btn rounded-full px-6 py-2 bg-gradient-to-r from-red-400 to-yellow-400 hover:from-red-500 hover:to-yellow-500 text-white font-bold shadow-lg ml-auto transition-all" disabled={loading}>{loading ? 'Enregistrement...' : 'Terminer'}</button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default OnboardingModal;

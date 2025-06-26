import React from 'react';
import { Database } from '../../lib/supabase-types';

interface UserProfileModalProps {
  user: Database['public']['Tables']['users']['Row'];
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg flex flex-col items-center animate-fade-in relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 text-2xl font-bold">×</button>
        <div className="flex flex-col items-center w-full">
          <img src={user.avatar_url || '/logo.png'} alt="avatar" className="w-24 h-24 rounded-full shadow mb-4 object-cover bg-white" />
          <div className="w-full flex flex-col items-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{user.first_name} {user.last_name}</h2>
            {user.nickname && <div className="text-yellow-600 font-semibold">@{user.nickname}</div>}
            <div className="grid grid-cols-1 gap-2 w-full mt-4">
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Poste</span>
                <span className="text-gray-700 font-medium">{user.job_title || <span className='text-gray-300'>Non renseigné</span>}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Organisation</span>
                <span className="text-gray-700 font-medium">{user.company || <span className='text-gray-300'>Non renseignée</span>}</span>
              </div>
              {user.department && (
                <div className="flex flex-col items-center">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Département</span>
                  <span className="text-gray-700 font-medium">{user.department}</span>
                </div>
              )}
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-400 uppercase tracking-wide">Email</span>
                <span className="text-gray-700 font-medium">{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex flex-col items-center">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Téléphone</span>
                  <span className="text-gray-700 font-medium">{user.phone}</span>
                </div>
              )}
              {user.linkedin_url && (
                <div className="flex flex-col items-center">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">LinkedIn</span>
                  <a href={user.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">{user.linkedin_url}</a>
                </div>
              )}
              {user.bio && (
                <div className="flex flex-col items-center">
                  <span className="text-xs text-gray-400 uppercase tracking-wide">Bio</span>
                  <span className="text-gray-700 font-medium text-center">{user.bio}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;

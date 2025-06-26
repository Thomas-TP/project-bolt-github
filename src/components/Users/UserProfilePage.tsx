import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { userService } from '../../services/userService';
import { Database } from '../../lib/supabase-types';
import { useUser } from '../../hooks/useUser';

const UserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<Database['public']['Tables']['users']['Row'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const { user: currentUser } = useUser();

  useEffect(() => {
    if (userId) {
      userService.getUserProfileById(userId).then((u) => {
        setUser(u);
        setRole(u?.role || '');
        setLoading(false);
      });
    }
  }, [userId]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }
  if (!user) {
    return <div className="text-center text-gray-500 mt-12">Utilisateur introuvable.</div>;
  }

  return (
    <div className="flex flex-col items-center max-w-xl mx-auto bg-white rounded-2xl shadow-2xl p-8 mt-8">
      <img src={user.avatar_url || '/logo.png'} alt="avatar" className="w-24 h-24 rounded-full shadow mb-4 object-cover bg-white" />
      <h2 className="text-2xl font-bold text-gray-900 mb-1">{user.first_name} {user.last_name}</h2>
      {user.nickname && <div className="text-yellow-600 font-semibold">@{user.nickname}</div>}
      <div className="flex flex-col items-center mt-2">
        <span className="text-xs text-gray-400 uppercase tracking-wide">Rôle</span>
        {currentUser?.role === 'admin' ? (
          <div className="flex items-center space-x-2 mt-1">
            <select
              className="border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              value={role}
              disabled={saving}
              onChange={async (e) => {
                const newRole = e.target.value;
                setRole(newRole);
                setSaving(true);
                setSaveMsg(null);
                try {
                  await userService.updateUserRole(user.id, newRole);
                  setSaveMsg('Rôle mis à jour !');
                  setUser((u) => u ? { ...u, role: newRole } : u);
                } catch (err) {
                  setSaveMsg('Erreur lors de la mise à jour du rôle');
                } finally {
                  setSaving(false);
                  setTimeout(() => setSaveMsg(null), 2000);
                }
              }}
            >
              <option value="client">Client</option>
              <option value="agent">Agent</option>
              <option value="admin">Administrateur</option>
            </select>
            {saving && <span className="text-xs text-blue-600 animate-pulse ml-2">Enregistrement...</span>}
            {saveMsg && <span className="text-xs ml-2 text-green-600">{saveMsg}</span>}
          </div>
        ) : (
          <span className="text-gray-700 font-medium text-sm mt-1">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>
        )}
      </div>
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
  );
};

export default UserProfilePage;

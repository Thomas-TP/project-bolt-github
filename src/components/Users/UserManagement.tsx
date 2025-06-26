import React, { useState, useEffect } from 'react';
import { Users, Search, UserPlus, Shield, Mail, Building, Phone, Edit, Trash2, ToggleLeft, ToggleRight, Eye, EyeOff, Save, X, AlertCircle, CheckCircle, RefreshCw, Database as DatabaseIcon } from 'lucide-react';
import { userService } from '../../services/userService';
import { useUser } from '../../hooks/useUser';
import { Database } from '../../lib/supabase-types';
import InviteUserModal from './InviteUserModal'; // Import the new modal

type User = Database['public']['Tables']['users']['Row'];

interface EditUserModalProps {
  user: User;
  onClose: () => void;
  onUserUpdated: () => void;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ user, onClose, onUserUpdated }) => {
  const [formData, setFormData] = useState({
    full_name: user.full_name || '',
    email: user.email,
    role: user.role,
    company: user.company || '',
    department: user.department || '',
    phone: user.phone || '',
    is_active: user.is_active
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      await userService.updateUserInfo(user.id, {
        full_name: formData.full_name || null,
        role: formData.role,
        company: formData.company || null,
        department: formData.department || null,
        phone: formData.phone || null,
        is_active: formData.is_active
      });
      
      onUserUpdated();
      onClose();
    } catch (err) {
      console.error('Erreur lors de la mise à jour:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Modifier l'utilisateur</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom complet
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nom complet"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">L'email ne peut pas être modifié</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rôle
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as User['role'] }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="client">Client</option>
                <option value="agent">Agent</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="+33 1 23 45 67 89"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entreprise
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nom de l'entreprise"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Département
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Département"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">
              Compte actif
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <Save className="w-4 h-4" />
              <span>Sauvegarder</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UserManagement: React.FC = () => {
  const { user: currentUser } = useUser();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false); // New state for invite modal
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchUsers();
      fetchStats();
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Chargement des utilisateurs...');
      
      const data = await userService.getAllUsers();
      setUsers(data || []);
      setLastSync(new Date());
      
      console.log('✅ Utilisateurs chargés:', data?.length);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des utilisateurs:', error);
      setError('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await userService.getUserStats();
      setStats(data);
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    }
  };

  const handleSyncUsers = async () => {
    try {
      setSyncing(true);
      console.log('🔄 Synchronisation manuelle des utilisateurs...');
      
      // Diagnostic d'abord
      await userService.diagnoseUsers();
      
      // Puis synchronisation
      const syncResult = await userService.syncMissingUsers();
      
      // Recharger les données
      await fetchUsers();
      await fetchStats();
      
      if (syncResult && syncResult.created_count > 0) {
        alert(`✅ ${syncResult.created_count} utilisateur(s) synchronisé(s) !`);
      } else {
        alert('✅ Tous les utilisateurs sont déjà synchronisés');
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation:', error);
      alert('❌ Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchUsers();
      return;
    }

    try {
      setLoading(true);
      const data = await userService.searchUsers(searchQuery);
      setUsers(data || []);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: User['role']) => {
    if (userId === currentUser?.id) {
      alert('❌ Vous ne pouvez pas modifier votre propre rôle');
      return;
    }

    const user = users.find(u => u.id === userId);
    if (!user) {
      alert('❌ Utilisateur non trouvé');
      return;
    }

    const confirmMessage = `Êtes-vous sûr de vouloir changer le rôle de "${user.full_name || user.email}" de "${user.role}" vers "${newRole}" ?`;
    if (!confirm(confirmMessage)) return;

    try {
      setUpdatingUserId(userId);
      setError(null);
      
      console.log('🔄 Début changement de rôle:', { userId, currentRole: user.role, newRole });
      
      const updatedUser = await userService.updateUserRole(userId, newRole);
      
      console.log('✅ Rôle changé avec succès:', updatedUser);
      
      // Mettre à jour la liste locale
      setUsers(prev => 
        prev.map(u => 
          u.id === userId ? { ...u, role: newRole, updated_at: updatedUser.updated_at } : u
        )
      );
      
      // Recharger les stats
      fetchStats();
      
      // Message de succès
      alert(`✅ Rôle de "${user.full_name || user.email}" changé vers "${newRole}" avec succès !`);
      
    } catch (error) {
      console.error('❌ Erreur lors du changement de rôle:', error);
      
      let errorMessage = 'Erreur lors du changement de rôle';
      if (error instanceof Error) {
        errorMessage += `:\n${error.message}`;
      }
      
      setError(errorMessage);
      alert(`❌ ${errorMessage}`);
      
      // Recharger les données pour s'assurer de la cohérence
      fetchUsers();
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    if (userId === currentUser?.id) {
      alert('❌ Vous ne pouvez pas désactiver votre propre compte');
      return;
    }

    const user = users.find(u => u.id === userId);
    if (!user) {
      alert('❌ Utilisateur non trouvé');
      return;
    }

    const action = currentStatus ? 'désactiver' : 'activer';
    const confirmMessage = `Êtes-vous sûr de vouloir ${action} le compte de "${user.full_name || user.email}" ?`;
    if (!confirm(confirmMessage)) return;

    try {
      setUpdatingUserId(userId);
      setError(null);
      
      await userService.toggleUserStatus(userId, !currentStatus);
      
      // Mettre à jour la liste locale
      setUsers(prev => 
        prev.map(u => 
          u.id === userId ? { ...u, is_active: !currentStatus } : u
        )
      );
      
      fetchStats(); // Recharger les stats
      
      alert(`✅ Compte ${!currentStatus ? 'activé' : 'désactivé'} avec succès !`);
      
    } catch (error) {
      console.error('❌ Erreur lors du changement de statut:', error);
      
      let errorMessage = 'Erreur lors du changement de statut';
      if (error instanceof Error) {
        errorMessage += `:\n${error.message}`;
      }
      
      setError(errorMessage);
      alert(`❌ ${errorMessage}`);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredUsers = users.filter(user => {
    if (roleFilter !== 'all' && user.role !== roleFilter) return false;
    if (statusFilter === 'active' && !user.is_active) return false;
    if (statusFilter === 'inactive' && user.is_active) return false;
    return true;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'agent': return 'bg-blue-100 text-blue-800';
      case 'client': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrateur';
      case 'agent': return 'Agent';
      case 'client': return 'Client';
      default: return role;
    }
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Accès restreint</h3>
        <p className="text-gray-500">Seuls les administrateurs peuvent accéder à cette section.</p>
      </div>
    );
  }

  if (loading && !syncing) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des utilisateurs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
          <p className="text-gray-600 mt-2">Gérez les comptes et rôles des utilisateurs</p>
          {lastSync && (
            <p className="text-sm text-gray-500 mt-1">
              Dernière synchronisation: {lastSync.toLocaleTimeString('fr-FR')}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleSyncUsers}
            disabled={syncing}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm disabled:opacity-50"
            title="Synchroniser les utilisateurs manquants"
          >
            {syncing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>Synchroniser les utilisateurs</span>
          </button>
          <button 
            onClick={() => setShowInviteModal(true)} // Open the invite modal
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Inviter un utilisateur</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => { if (e.key === 'Enter') handleSearch(); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Tous les rôles</option>
            <option value="admin">Administrateur</option>
            <option value="agent">Agent</option>
            <option value="client">Client</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="inactive">Inactif</option>
          </select>
          <button
            onClick={handleSearch}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition-colors"
          >
            Appliquer
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entreprise</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dernière connexion</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <button
                          className="flex-shrink-0 h-10 w-10 focus:outline-none group"
                          title="Voir le profil utilisateur"
                          onClick={() => window.open(`/users/${user.id}`, '_blank')}
                        >
                          <img className="h-10 w-10 rounded-full group-hover:ring-2 group-hover:ring-blue-400 transition" src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.full_name || user.email}&background=random`} alt="" />
                        </button>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.full_name || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        {getRoleName(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.company || 'N/A'}
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('fr-FR') : 'Jamais'}
                    </td> */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.updated_at ? new Date(user.updated_at).toLocaleString('fr-FR') : 'Jamais'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Modifier l'utilisateur"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        {/* Actions de statut et rôle supprimées, tout est dans le modal d'édition */}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUserUpdated={fetchUsers}
        />
      )}

      {showInviteModal && (
        <InviteUserModal
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
};

export default UserManagement;



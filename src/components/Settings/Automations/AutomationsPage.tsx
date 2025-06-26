import React, { useState, useEffect } from 'react';


import AutomationForm from './AutomationForm';
import { Plus, Zap, Edit, Trash2, MessageCircle } from 'lucide-react';
import { automationsService } from '../../../services/automationsService';

// Modèle d'automatisation
export interface AutomationRule {
  id: string;
  name: string;
  trigger: {
    keyword: string;
    location: 'title' | 'description' | 'message';
  };
  reason?: string;
  action: {
    type: 'ia_reply' | 'status_change' | 'assign_agent';
    iaPrompt?: string;
    statusToSet?: string;
    agentId?: string;
    faqId?: string;
  };
  enabled: boolean;
}




const AutomationsPage: React.FC = () => {
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AutomationRule | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les automatisations depuis Supabase
  useEffect(() => {
    setLoading(true);
    automationsService.list()
      .then(setAutomations)
      .catch((e: any) => setError(e.message || 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  // Ajout/édition d'automatisation
  const handleSave = async (rule: AutomationRule) => {
    setLoading(true);
    setError(null);
    try {
      const saved = await automationsService.upsert(rule);
      setAutomations(prev => {
        const exists = prev.find(r => r.id === saved.id);
        if (exists) {
          return prev.map(r => (r.id === saved.id ? saved : r));
        }
        return [...prev, saved];
      });
      setShowModal(false);
      setEditing(null);
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  // Suppression d'automatisation
  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette automatisation ?')) return;
    setLoading(true);
    setError(null);
    try {
      await automationsService.remove(id);
      setAutomations(prev => prev.filter(r => r.id !== id));
    } catch (e: any) {
      setError(e.message || 'Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setShowModal(false);
    setEditing(null);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Automatisations</h1>
        <button
          className="flex items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg shadow hover:from-blue-700 hover:to-purple-700"
          onClick={() => { setEditing(null); setShowModal(true); }}
        >
          <Plus className="w-5 h-5 mr-2" /> Nouvelle automatisation
        </button>
      </div>
      <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
        {loading ? (
          <div className="text-gray-500 text-center py-8">Chargement…</div>
        ) : error ? (
          <div className="text-red-500 text-center py-8">{error}</div>
        ) : automations.length === 0 ? (
          <div className="text-gray-500 text-center py-8">Aucune automatisation définie.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600 border-b">
                <th className="py-2">Nom</th>
                <th>Déclencheur</th>
                <th>Action</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {automations.map(rule => (
                <tr key={rule.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{rule.name}</td>
                  <td>{rule.trigger.keyword} <span className="text-xs text-gray-400">({rule.trigger.location})</span></td>
                  <td>
                    {rule.action.type === 'ia_reply' && <span className="inline-flex items-center text-blue-600"><Zap className="w-4 h-4 mr-1" />Réponse IA</span>}
                    {rule.action.type === 'status_change' && <span className="inline-flex items-center text-green-600"><MessageCircle className="w-4 h-4 mr-1" />Changement de statut</span>}
                    {rule.action.type === 'assign_agent' && <span className="inline-flex items-center text-purple-600"><MessageCircle className="w-4 h-4 mr-1" />Assignation</span>}
                  </td>
                  <td>{rule.enabled ? <span className="text-green-600 font-bold">Activée</span> : <span className="text-gray-400">Désactivée</span>}</td>
                  <td>
                    <button className="text-blue-500 hover:text-blue-700 mr-2" onClick={() => { setEditing(rule); setShowModal(true); }}><Edit className="w-4 h-4" /></button>
                    <button className="text-red-500 hover:text-red-700" onClick={() => handleDelete(rule.id)}><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {/* Modal d'ajout/édition */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">{editing ? 'Modifier' : 'Nouvelle'} automatisation</h2>
            <AutomationForm
              initial={editing || undefined}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AutomationsPage;

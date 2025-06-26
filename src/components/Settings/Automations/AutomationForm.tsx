
import React, { useState, useEffect } from 'react';
import { faqService } from '../../../services/faqService';
import { userService } from '../../../services/userService';
import { Wand2 } from 'lucide-react';
import { geminiService } from '../../../utils/gemini';

import type { AutomationRule } from './AutomationsPage';

interface AutomationFormProps {
  initial?: Partial<AutomationRule>;
  onSave: (rule: AutomationRule) => void;
  onCancel: () => void;
}

const defaultRule: AutomationRule = {
  id: '',
  name: '',
  trigger: { keyword: '', location: 'title' },
  reason: '',
  action: { type: 'ia_reply', iaPrompt: '', faqId: '' },
  enabled: true,
};

const AutomationForm: React.FC<AutomationFormProps> = ({ initial, onSave, onCancel }) => {
  // Merge deeply to ensure action.faqId is preserved if present in initial
  const [rule, setRule] = useState<AutomationRule>({
    ...defaultRule,
    ...initial,
    action: {
      ...defaultRule.action,
      ...(initial?.action || {}),
    },
  });

  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [agents, setAgents] = useState<{id: string, full_name: string, email: string}[]>([]);
  const [faqs, setFaqs] = useState<{id: string, question: string}[]>([]);

  useEffect(() => {
    if (rule.action && rule.action.type === 'ia_reply') {
      faqService.getAll().then(data => setFaqs(data || [])).catch(() => setFaqs([]));
    }
  }, [rule.action?.type]);

  useEffect(() => {
    if (rule.action.type === 'assign_agent') {
      userService.getAgents().then(setAgents).catch(() => setAgents([]));
    }
  }, [rule.action.type]);

  // Prompt Gemini pour mots-clés courts, séparés par virgule
  const handleImproveKeyword = async () => {
    setLoadingSuggest(true);
    setSuggestedKeywords([]);
    const prompt = `Voici un ou plusieurs mots-clés d'automatisation pour détecter un problème dans un ticket d'assistance : "${rule.trigger.keyword}". Propose uniquement 3 à 5 mots-clés courts, séparés par des virgules, sans phrases ni descriptions, en français.`;
    const result = await geminiService.generateResponse(prompt);
    // Extraction des mots-clés séparés par virgule
    const variants = result
      .split(/,|\n|;/)
      .map(s => s.trim())
      .filter(s => s.length > 1 && !rule.trigger.keyword.split(',').map(k => k.trim()).includes(s));
    setSuggestedKeywords(variants);
    setLoadingSuggest(false);
  };

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        // Merge deeply pour ne pas perdre faqId ou autres props d'action
        onSave({
          ...rule,
          id: rule.id || crypto.randomUUID(),
          action: {
            ...defaultRule.action,
            ...(rule.action || {}),
          },
        });
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium mb-1">Nom de l'automatisation</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={rule.name}
          onChange={e => setRule(r => ({ ...r, name: e.target.value }))}
          required
        />
      </div>
      <div className="flex flex-col sm:flex-row sm:space-x-2 items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium mb-1">Mot-clé déclencheur</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={rule.trigger.keyword}
            onChange={e => setRule(r => ({ ...r, trigger: { ...r.trigger, keyword: e.target.value } }))}
            required
            placeholder="Ex : bug, erreur, connexion, ... (plusieurs mots-clés séparés par virgule)"
          />
        </div>
        <button
          type="button"
          className="mt-2 sm:mt-0 ml-0 sm:ml-2 p-2 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-300 flex items-center justify-center text-gray-600"
          onClick={handleImproveKeyword}
          disabled={loadingSuggest || !rule.trigger.keyword}
          title="Suggérer des mots-clés avec l'IA"
          style={{ minWidth: 36, minHeight: 36 }}
        >
          {loadingSuggest ? (
            <span className="animate-pulse">…</span>
          ) : (
            <Wand2 className="w-5 h-5" />
          )}
        </button>
      </div>
      {suggestedKeywords.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestedKeywords.map((kw, i) => (
            <button
              key={i}
              type="button"
              className="px-2 py-1 rounded-full bg-blue-100 hover:bg-blue-200 border border-blue-300 text-blue-800 text-xs transition"
              onClick={() => {
                // Ajoute le mot-clé sans doublon, séparé par virgule
                const current = rule.trigger.keyword
                  .split(',')
                  .map(s => s.trim())
                  .filter(Boolean);
                if (!current.includes(kw)) {
                  setRule(r => ({
                    ...r,
                    trigger: {
                      ...r.trigger,
                      keyword: current.length > 0 ? [...current, kw].join(', ') : kw
                    }
                  }));
                }
              }}
            >
              {kw}
            </button>
          ))}
        </div>
      )}
      <div className="flex space-x-2">
        <div>
          <label className="block text-sm font-medium mb-1">Emplacement</label>
          <select
            className="border rounded px-2 py-2"
            value={rule.trigger.location}
            onChange={e => setRule(r => ({ ...r, trigger: { ...r.trigger, location: e.target.value as any } }))}
          >
            <option value="title">Titre</option>
            <option value="description">Description</option>
            <option value="message">Message</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Raison (optionnel)</label>
        <input
          className="w-full border rounded px-3 py-2"
          value={rule.reason || ''}
          onChange={e => setRule(r => ({ ...r, reason: e.target.value }))}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Action</label>
        <select
          className="border rounded px-2 py-2"
          value={rule.action.type}
          onChange={e => setRule(r => ({ ...r, action: { ...r.action, type: e.target.value as any } }))}
        >
          <option value="ia_reply">Réponse IA</option>
          <option value="status_change">Changement de statut</option>
          <option value="assign_agent">Assignation à un agent</option>
        </select>
      </div>
      {rule.action.type === 'ia_reply' && (
        <div>
          <label className="block text-sm font-medium mb-1">Prompt IA personnalisé (optionnel)</label>
          <div className="flex gap-2">
            <textarea
              className="w-full border rounded px-3 py-2"
              value={rule.action.iaPrompt || ''}
              onChange={e => setRule(r => ({ ...r, action: { ...r.action, iaPrompt: e.target.value, type: 'ia_reply' } }))}
              placeholder="Ex: Donne une réponse professionnelle et rassurante au client..."
              rows={3}
            />
            <div className="w-64">
              <label className="block text-xs font-medium mb-1">Référence FAQ (optionnel)</label>
              <select
                className="w-full border rounded px-2 py-2"
                value={rule.action.faqId || ''}
                onChange={e => setRule(r => ({ ...r, action: { ...r.action, faqId: e.target.value, type: 'ia_reply', iaPrompt: r.action.iaPrompt } }))}
              >
                <option value="">Aucune FAQ</option>
                {faqs.map(faq => (
                  <option key={faq.id} value={faq.id}>{faq.question}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
      {rule.action.type === 'status_change' && (
        <div>
          <label className="block text-sm font-medium mb-1">Nouveau statut</label>
          <select
            className="border rounded px-2 py-2"
            value={rule.action.statusToSet || ''}
            onChange={e => setRule(r => ({ ...r, action: { ...r.action, statusToSet: e.target.value, type: 'status_change' } }))}
          >
            <option value="">Choisir…</option>
            <option value="ouvert">Ouvert</option>
            <option value="en_cours">En cours</option>
            <option value="en_attente">En attente</option>
            <option value="resolu">Résolu</option>
            <option value="ferme">Fermé</option>
          </select>
        </div>
      )}
      {rule.action.type === 'assign_agent' && (
        <div>
          <label className="block text-sm font-medium mb-1">Agent à assigner</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={rule.action.agentId || ''}
            onChange={e => setRule(r => ({ ...r, action: { ...r.action, agentId: e.target.value, type: 'assign_agent' } }))}
          >
            <option value="">Choisir un agent…</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.full_name || agent.email}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex items-center space-x-2 mt-4">
        <input
          type="checkbox"
          checked={rule.enabled}
          onChange={e => setRule(r => ({ ...r, enabled: e.target.checked }))}
          id="enabled"
        />
        <label htmlFor="enabled" className="text-sm">Automatisation activée</label>
      </div>
      <div className="flex justify-end space-x-2 mt-6">
        <button type="button" className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200" onClick={onCancel}>Annuler</button>
        <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">Enregistrer</button>
      </div>
    </form>
  );
};

export default AutomationForm;

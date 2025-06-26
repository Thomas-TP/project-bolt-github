import { supabase } from '../utils/supabase';
import type { AutomationRule } from '../components/Settings/Automations/AutomationsPage';

// Conversion helpers entre AutomationRule (front) et row (DB)
function toDb(rule: AutomationRule) {
  return {
    id: rule.id,
    name: rule.name,
    trigger_keyword: rule.trigger.keyword,
    trigger_location: rule.trigger.location,
    reason: rule.reason,
    action_type: rule.action.type,
    action_ia_prompt: rule.action.iaPrompt,
    action_status_to_set: rule.action.statusToSet,
    action_agent_id: rule.action.agentId,
    action_faq_id: rule.action.faqId,
    enabled: rule.enabled,
  };
}

function fromDb(row: any): AutomationRule {
  return {
    id: row.id,
    name: row.name,
    trigger: {
      keyword: row.trigger_keyword,
      location: row.trigger_location,
    },
    reason: row.reason,
    action: {
      type: row.action_type,
      iaPrompt: row.action_ia_prompt,
      statusToSet: row.action_status_to_set,
      agentId: row.action_agent_id,
      faqId: row.action_faq_id,
    },
    enabled: row.enabled,
  };
}

export const automationsService = {
  async list(): Promise<AutomationRule[]> {
    const { data, error } = await supabase
      .from('automations')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map(fromDb);
  },
  async upsert(rule: AutomationRule): Promise<AutomationRule> {
    const { data, error } = await supabase
      .from('automations')
      .upsert([toDb(rule)], { onConflict: 'id' })
      .select();
    if (error) throw error;
    return fromDb((data || [])[0]);
  },
  async remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('automations')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

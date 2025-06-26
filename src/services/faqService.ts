// Service pour la FAQ dynamique (CRUD Supabase)
import { supabase } from '../utils/supabase';

export const faqService = {
  // Récupérer toutes les questions FAQ (avec images)
  async getAll() {
    const { data, error } = await supabase
      .from('faq')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data;
  },
  // Ajouter une question
  async add({ question, answer, images = [] }) {
    const { data, error } = await supabase
      .from('faq')
      .insert([{ question, answer, images }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  // Modifier une question
  async update(id, { question, answer, images }) {
    const { data, error } = await supabase
      .from('faq')
      .update({ question, answer, images, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  // Supprimer une question
  async remove(id) {
    const { error } = await supabase
      .from('faq')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};

import { supabase } from '../utils/supabase';
import { Database } from '../lib/supabase-types';

type KnowledgeBase = Database['public']['Tables']['knowledge_base']['Row'];
type KnowledgeBaseInsert = Database['public']['Tables']['knowledge_base']['Insert'];
type KnowledgeBaseUpdate = Database['public']['Tables']['knowledge_base']['Update'];

export const knowledgeBaseService = {
  // Récupérer tous les articles publiés
  async getPublishedArticles() {
    const { data, error } = await supabase
      .from('knowledge_base')
      .select(`
        *,
        author:users!knowledge_base_author_id_fkey(id, full_name)
      `)
      .eq('is_published', true)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Récupérer tous les articles (agents/admins)
  async getAllArticles() {
    const { data, error } = await supabase
      .from('knowledge_base')
      .select(`
        *,
        author:users!knowledge_base_author_id_fkey(id, full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Récupérer un article par ID
  async getArticleById(id: string) {
    const { data, error } = await supabase
      .from('knowledge_base')
      .select(`
        *,
        author:users!knowledge_base_author_id_fkey(id, full_name, email)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    
    // Incrémenter le compteur de vues
    await supabase.rpc('increment_article_views', { article_id: id });
    
    return data;
  },

  // Créer un nouvel article
  async createArticle(article: KnowledgeBaseInsert) {
    const { data, error } = await supabase
      .from('knowledge_base')
      .insert(article)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Mettre à jour un article
  async updateArticle(id: string, updates: KnowledgeBaseUpdate) {
    const { data, error } = await supabase
      .from('knowledge_base')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Supprimer un article (corrigé)
  async deleteArticle(id: string) {
    console.log('🗑️ Suppression de l\'article:', id);
    
    try {
      const { error } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Erreur suppression article:', error);
        throw new Error(`Impossible de supprimer l'article: ${error.message}`);
      }

      console.log('✅ Article supprimé avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      throw error;
    }
  },

  // Rechercher dans les articles
  async searchArticles(query: string) {
    const { data, error } = await supabase
      .from('knowledge_base')
      .select(`
        *,
        author:users!knowledge_base_author_id_fkey(id, full_name)
      `)
      .eq('is_published', true)
      .textSearch('title', query)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Récupérer les articles par catégorie
  async getArticlesByCategory(category: string) {
    const { data, error } = await supabase
      .from('knowledge_base')
      .select(`
        *,
        author:users!knowledge_base_author_id_fkey(id, full_name)
      `)
      .eq('is_published', true)
      .eq('category', category)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Récupérer les articles populaires
  async getPopularArticles(limit: number = 5) {
    const { data, error } = await supabase
      .from('knowledge_base')
      .select(`
        id,
        title,
        category,
        views,
        author:users!knowledge_base_author_id_fkey(full_name)
      `)
      .eq('is_published', true)
      .order('views', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
};
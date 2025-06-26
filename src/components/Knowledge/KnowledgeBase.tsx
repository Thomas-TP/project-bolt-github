import React, { useState, useEffect } from 'react';
import { Search, BookOpen, Eye, Star, Plus, Calendar, Edit, Trash2, Filter } from 'lucide-react';
import { knowledgeBaseService } from '../../services/knowledgeBaseService';
import { useUser } from '../../hooks/useUser';
import { Database } from '../../lib/supabase-types';
import CreateArticleModal from './CreateArticleModal';
import ArticleDetailModal from './ArticleDetailModal';

type KnowledgeArticle = Database['public']['Tables']['knowledge_base']['Row'] & {
  author?: { id: string; full_name: string };
};

const KnowledgeBase: React.FC = () => {
  const { user } = useUser();
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [popularArticles, setPopularArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [deletingArticleId, setDeletingArticleId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<any>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  useEffect(() => {
    fetchArticles();
    fetchPopularArticles();
  }, [user]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const data = user?.role === 'client' 
        ? await knowledgeBaseService.getPublishedArticles()
        : await knowledgeBaseService.getAllArticles();
      setArticles(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPopularArticles = async () => {
    try {
      const data = await knowledgeBaseService.getPopularArticles(5);
      setPopularArticles(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des articles populaires:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchArticles();
      return;
    }

    try {
      setLoading(true);
      const data = await knowledgeBaseService.searchArticles(searchQuery);
      setArticles(data || []);
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteArticle = async (articleId: string) => {
    if (!user || (user.role !== 'agent' && user.role !== 'admin')) {
      alert('Seuls les agents et administrateurs peuvent supprimer des articles');
      return;
    }

    const article = articles.find(a => a.id === articleId);
    if (!article) return;

    const confirmMessage = `Êtes-vous sûr de vouloir supprimer définitivement l'article "${article.title}" ?\n\nCette action est IRRÉVERSIBLE.`;
    
    if (!confirm(confirmMessage)) return;

    try {
      setDeletingArticleId(articleId);
      console.log('🗑️ Début suppression article:', articleId);
      
      await knowledgeBaseService.deleteArticle(articleId);
      console.log('✅ Article supprimé avec succès');
      
      // Retirer l'article de la liste
      setArticles(prev => prev.filter(a => a.id !== articleId));
      setPopularArticles(prev => prev.filter(a => a.id !== articleId));
      
      // Fermer le modal de détails si c'est l'article supprimé
      if (selectedArticleId === articleId) {
        setSelectedArticleId(null);
      }
      
      alert('✅ Article supprimé avec succès !');
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      
      let errorMessage = 'Erreur lors de la suppression de l\'article';
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }
      
      alert(`❌ ${errorMessage}\n\nVeuillez réessayer ou contacter l'administrateur.`);
    } finally {
      setDeletingArticleId(null);
    }
  };

  const handleEditArticle = (article: any) => {
    setEditingArticle(article);
    setShowCreateModal(true);
    setSelectedArticleId(null); // Fermer le modal de détails
  };

  const handleArticleCreated = () => {
    setShowCreateModal(false);
    setEditingArticle(null);
    fetchArticles();
    fetchPopularArticles();
  };

  // Fonction pour extraire la première image d'un article
  const extractFirstImage = (content: string): string | null => {
    const imageRegex = /!\[.*?\]\((.*?)\)/;
    const match = content.match(imageRegex);
    return match ? match[1] : null;
  };

  // Fonction pour extraire un extrait de texte sans markdown
  const extractTextPreview = (content: string, maxLength: number = 150): string => {
    // Supprimer les images
    let text = content.replace(/!\[.*?\]\(.*?\)/g, '');
    // Supprimer les titres markdown
    text = text.replace(/^#{1,6}\s+/gm, '');
    // Supprimer les autres éléments markdown
    text = text.replace(/\*\*(.*?)\*\*/g, '$1');
    text = text.replace(/\*(.*?)\*/g, '$1');
    text = text.replace(/^-\s+/gm, '');
    // Nettoyer les espaces multiples et les sauts de ligne
    text = text.replace(/\s+/g, ' ').trim();
    
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  };

  const categories = Array.from(new Set(articles.map(article => article.category).filter(Boolean)));

  const filteredArticles = articles.filter(article => {
    if (selectedCategory !== 'all' && article.category !== selectedCategory) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Base de Connaissances</h1>
          <p className="text-gray-600 mt-2">
            Trouvez des réponses à vos questions et des guides utiles
          </p>
        </div>

        {(user?.role === 'agent' || user?.role === 'admin') && (
          <button 
            onClick={() => {
              setEditingArticle(null);
              setShowCreateModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Nouvel Article</span>
          </button>
        )}
      </div>

      {/* Barre de recherche */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher dans la base de connaissances..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 transition-colors"
              >
                Rechercher
              </button>
            </div>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px]"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Articles populaires */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <span>Articles Populaires</span>
            </h3>
            <div className="space-y-3">
              {popularArticles.length === 0 ? (
                <p className="text-gray-500 text-sm">Aucun article populaire</p>
              ) : (
                popularArticles.map((article) => (
                  <div 
                    key={article.id} 
                    className="border-b border-gray-100 pb-3 last:border-b-0 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                    onClick={() => setSelectedArticleId(article.id)}
                  >
                    <h4 className="font-medium text-gray-900 text-sm mb-1 line-clamp-2">
                      {article.title}
                    </h4>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center space-x-1">
                        <Eye className="w-3 h-3" />
                        <span>{article.views} vues</span>
                      </span>
                      {article.category && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          {article.category}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Catégories */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Catégories</h3>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'hover:bg-gray-50'
                }`}
              >
                Toutes ({articles.length})
              </button>
              {categories.map(category => {
                const count = articles.filter(a => a.category === category).length;
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory === category
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {category} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Liste des articles avec aperçu amélioré */}
        <div className="lg:col-span-3">
          {filteredArticles.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun article trouvé</h3>
              <p className="text-gray-500">
                {searchQuery 
                  ? "Aucun article ne correspond à votre recherche"
                  : "Aucun article dans cette catégorie"
                }
              </p>
              {(user?.role === 'agent' || user?.role === 'admin') && !searchQuery && (
                <button 
                  onClick={() => {
                    setEditingArticle(null);
                    setShowCreateModal(true);
                  }}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Créer le premier article
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredArticles.map((article) => {
                const firstImage = extractFirstImage(article.content);
                const textPreview = extractTextPreview(article.content);
                
                return (
                  <div
                    key={article.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group"
                    onClick={() => setSelectedArticleId(article.id)}
                  >
                    {/* Image en avant si disponible */}
                    {firstImage && (
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={firstImage}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.parentElement?.remove();
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                        {article.is_featured && (
                          <div className="absolute top-3 right-3">
                            <Star className="w-5 h-5 text-yellow-400 fill-current drop-shadow-lg" />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {!firstImage && article.is_featured && (
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            )}
                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                              {article.title}
                            </h3>
                          </div>
                          
                          {/* Aperçu du contenu */}
                          <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                            {textPreview}
                          </p>
                        </div>
                        
                        {(user?.role === 'agent' || user?.role === 'admin') && (
                          <div className="flex items-center space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditArticle(article);
                              }}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Modifier l'article"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteArticle(article.id);
                              }}
                              disabled={deletingArticleId === article.id}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Supprimer l'article"
                            >
                              {deletingArticleId === article.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Métadonnées */}
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(article.created_at).toLocaleDateString('fr-FR')}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Eye className="w-4 h-4" />
                            <span>{article.views} vues</span>
                          </div>
                        </div>
                        
                        {article.author && (
                          <span className="text-xs">{article.author.full_name}</span>
                        )}
                      </div>

                      {/* Tags et catégorie */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {article.category && (
                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                              {article.category}
                            </span>
                          )}
                          {!article.is_published && (user?.role === 'agent' || user?.role === 'admin') && (
                            <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-medium">
                              Brouillon
                            </span>
                          )}
                        </div>

                        <button className="text-blue-600 hover:text-blue-800 font-medium text-sm hover:underline transition-colors">
                          Lire l'article →
                        </button>
                      </div>

                      {/* Tags */}
                      {article.tags && article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-gray-100">
                          {article.tags.slice(0, 3).map((tag, index) => (
                            <span
                              key={index}
                              className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs"
                            >
                              #{tag}
                            </span>
                          ))}
                          {article.tags.length > 3 && (
                            <span className="text-gray-400 text-xs py-1">
                              +{article.tags.length - 3} autres
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de création/édition d'article */}
      {showCreateModal && (
        <CreateArticleModal
          onClose={() => {
            setShowCreateModal(false);
            setEditingArticle(null);
          }}
          onArticleCreated={handleArticleCreated}
          editingArticle={editingArticle}
        />
      )}

      {/* Modal de détails d'article */}
      {selectedArticleId && (
        <ArticleDetailModal
          articleId={selectedArticleId}
          onClose={() => setSelectedArticleId(null)}
          onEdit={handleEditArticle}
          onDelete={handleDeleteArticle}
        />
      )}
    </div>
  );
};

export default KnowledgeBase;
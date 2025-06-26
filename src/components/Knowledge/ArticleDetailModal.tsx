import React, { useState, useEffect } from 'react';
import { X, Eye, Calendar, User, Tag, Edit, Trash2, Star } from 'lucide-react';
import { knowledgeBaseService } from '../../services/knowledgeBaseService';
import { useUser } from '../../hooks/useUser';

interface ArticleDetailModalProps {
  articleId: string;
  onClose: () => void;
  onEdit: (article: any) => void;
  onDelete: (articleId: string) => void;
}

const ArticleDetailModal: React.FC<ArticleDetailModalProps> = ({ 
  articleId, 
  onClose, 
  onEdit, 
  onDelete 
}) => {
  const { user } = useUser();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArticle();
  }, [articleId]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await knowledgeBaseService.getArticleById(articleId);
      setArticle(data);
    } catch (err) {
      console.error('Erreur lors du chargement de l\'article:', err);
      setError('Impossible de charger l\'article');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = (content: string) => {
    return content.split('\n').map((line, index) => {
      // Traitement du markdown
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-3xl font-bold mt-8 mb-4 text-gray-900">{line.substring(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-2xl font-semibold mt-6 mb-3 text-gray-800">{line.substring(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-xl font-medium mt-5 mb-2 text-gray-700">{line.substring(4)}</h3>;
      }
      if (line.match(/!\[.*\]\((.*)\)/)) {
        const match = line.match(/!\[.*\]\((.*)\)/);
        if (match) {
          return (
            <div key={index} className="my-6">
              <img 
                src={match[1]} 
                alt="Image de l'article" 
                className="max-w-full h-auto rounded-lg shadow-md mx-auto"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          );
        }
      }
      if (line.startsWith('- ')) {
        return <li key={index} className="ml-6 mb-1 list-disc">{line.substring(2)}</li>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={index} className="mb-3 font-bold">{line.slice(2, -2)}</p>;
      }
      if (line.startsWith('*') && line.endsWith('*')) {
        return <p key={index} className="mb-3 italic">{line.slice(1, -1)}</p>;
      }
      if (line.trim() === '') {
        return <div key={index} className="mb-3"></div>;
      }
      return <p key={index} className="mb-3 leading-relaxed text-gray-700">{line}</p>;
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur</h3>
          <p className="text-red-600 mb-4">{error || 'Article non trouvé'}</p>
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center space-x-4 flex-1">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h2 className="text-2xl font-bold text-gray-900">{article.title}</h2>
                {article.is_featured && (
                  <Star className="w-5 h-5 text-yellow-500 fill-current" />
                )}
                {!article.is_published && (
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                    Brouillon
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <User className="w-4 h-4" />
                  <span>{article.author?.full_name || 'Auteur inconnu'}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(article.created_at)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Eye className="w-4 h-4" />
                  <span>{article.views} vues</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {(user?.role === 'agent' || user?.role === 'admin') && (
              <>
                <button
                  onClick={() => onEdit(article)}
                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Modifier l'article"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onDelete(article.id)}
                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                  title="Supprimer l'article"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Métadonnées */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap items-center gap-4">
            {article.category && (
              <div className="flex items-center space-x-1">
                <span className="text-sm font-medium text-gray-600">Catégorie:</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-medium">
                  {article.category}
                </span>
              </div>
            )}
            
            {article.tags && article.tags.length > 0 && (
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-gray-500" />
                <div className="flex flex-wrap gap-1">
                  {article.tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {article.updated_at !== article.created_at && (
              <div className="text-sm text-gray-500">
                Mis à jour le {formatDate(article.updated_at)}
              </div>
            )}
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose max-w-none">
            {renderContent(article.content)}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Article créé le {formatDate(article.created_at)}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticleDetailModal;
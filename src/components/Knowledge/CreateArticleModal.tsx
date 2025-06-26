import React, { useState, useEffect } from 'react';
import { X, Save, Eye, Upload, Image, AlertCircle } from 'lucide-react';
import { knowledgeBaseService } from '../../services/knowledgeBaseService';
import { useUser } from '../../hooks/useUser';
import { supabase } from '../../utils/supabase';

interface CreateArticleModalProps {
  onClose: () => void;
  onArticleCreated: () => void;
  editingArticle?: any;
}

interface Category {
  id: string;
  name: string;
  description: string;
}

const CreateArticleModal: React.FC<CreateArticleModalProps> = ({ 
  onClose, 
  onArticleCreated, 
  editingArticle 
}) => {
  const { user } = useUser();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    tags: '',
    is_published: false,
    is_featured: false
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchCategories();
    
    // Si on édite un article, pré-remplir le formulaire
    if (editingArticle) {
      setFormData({
        title: editingArticle.title || '',
        content: editingArticle.content || '',
        category: editingArticle.category || '',
        tags: editingArticle.tags ? editingArticle.tags.join(', ') : '',
        is_published: editingArticle.is_published || false,
        is_featured: editingArticle.is_featured || false
      });
    }
  }, [editingArticle]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setCategories(data || []);
      
      // Sélectionner la première catégorie par défaut si pas d'édition
      if (data && data.length > 0 && !editingArticle) {
        setFormData(prev => ({ ...prev, category: data[0].name }));
      }
    } catch (err) {
      console.error('Erreur lors du chargement des catégories:', err);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier que c'est une image
    if (!file.type.startsWith('image/')) {
      setError('Veuillez sélectionner un fichier image');
      return;
    }

    // Vérifier la taille (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('L\'image ne doit pas dépasser 2MB');
      return;
    }

    try {
      setUploadingImage(true);
      setError(null);

      // Créer un nom de fichier unique
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2);
      const extension = file.name.split('.').pop();
      const fileName = `knowledge-base/${timestamp}-${randomId}.${extension}`;

      // Upload vers Supabase Storage
      const { data, error } = await supabase.storage
        .from('ticket-attachments') // Réutiliser le bucket existant
        .upload(fileName, file);

      if (error) throw error;

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('ticket-attachments')
        .getPublicUrl(fileName);

      // Insérer l'image dans le contenu à la position du curseur
      const imageMarkdown = `\n\n![Image](${publicUrl})\n\n`;
      setFormData(prev => ({
        ...prev,
        content: prev.content + imageMarkdown
      }));

    } catch (err) {
      console.error('Erreur lors de l\'upload:', err);
      setError('Erreur lors de l\'upload de l\'image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Utilisateur non connecté');
      return;
    }

    if (!formData.title.trim() || !formData.content.trim()) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const articleData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        category: formData.category || null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        is_published: formData.is_published,
        is_featured: formData.is_featured,
        author_id: user.id
      };

      if (editingArticle) {
        // Mise à jour
        await knowledgeBaseService.updateArticle(editingArticle.id, articleData);
      } else {
        // Création
        await knowledgeBaseService.createArticle(articleData);
      }

      onArticleCreated();
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const renderPreview = () => {
    return (
      <div className="prose max-w-none">
        <h1>{formData.title || 'Titre de l\'article'}</h1>
        <div className="whitespace-pre-wrap">
          {formData.content.split('\n').map((line, index) => {
            // Traitement basique du markdown
            if (line.startsWith('# ')) {
              return <h1 key={index} className="text-2xl font-bold mt-6 mb-4">{line.substring(2)}</h1>;
            }
            if (line.startsWith('## ')) {
              return <h2 key={index} className="text-xl font-semibold mt-5 mb-3">{line.substring(3)}</h2>;
            }
            if (line.startsWith('### ')) {
              return <h3 key={index} className="text-lg font-medium mt-4 mb-2">{line.substring(4)}</h3>;
            }
            if (line.match(/!\[.*\]\((.*)\)/)) {
              const match = line.match(/!\[.*\]\((.*)\)/);
              if (match) {
                return <img key={index} src={match[1]} alt="Image" className="max-w-full h-auto my-4 rounded-lg shadow-md" />;
              }
            }
            if (line.startsWith('- ')) {
              return <li key={index} className="ml-4">{line.substring(2)}</li>;
            }
            if (line.trim() === '') {
              return <br key={index} />;
            }
            return <p key={index} className="mb-2">{line}</p>;
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Save className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              {editingArticle ? 'Modifier l\'article' : 'Créer un nouvel article'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Formulaire */}
          <div className={`${preview ? 'w-1/2' : 'w-full'} p-6 overflow-y-auto border-r border-gray-200`}>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <span className="text-red-700">{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Titre de l'article <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Entrez le titre de votre article"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                    Catégorie
                  </label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Aucune catégorie</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                    Tags (séparés par des virgules)
                  </label>
                  <input
                    type="text"
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                    placeholder="tag1, tag2, tag3"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="content" className="block text-sm font-medium text-gray-700">
                    Contenu de l'article <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                      disabled={uploadingImage}
                    />
                    <label
                      htmlFor="image-upload"
                      className={`flex items-center space-x-1 px-3 py-1 text-sm border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                        uploadingImage ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {uploadingImage ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      ) : (
                        <Image className="w-4 h-4" />
                      )}
                      <span>Ajouter image</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setPreview(!preview)}
                      className="flex items-center space-x-1 px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      <span>{preview ? 'Masquer' : 'Aperçu'}</span>
                    </button>
                  </div>
                </div>
                <textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Rédigez votre article en markdown...

Exemples de formatage :
# Titre principal
## Sous-titre
### Titre de section

**Texte en gras**
*Texte en italique*

- Liste à puces
- Élément 2

![Description](URL_de_l_image)"
                  rows={20}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-sm"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Utilisez la syntaxe Markdown pour formater votre contenu
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.is_published}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_published: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Publier l'article</span>
                  </label>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_featured: e.target.checked }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Article en vedette</span>
                  </label>
                </div>
                <p className="text-sm text-gray-500">
                  Les articles non publiés ne sont visibles que par les agents et administrateurs
                </p>
              </div>
            </form>
          </div>

          {/* Aperçu */}
          {preview && (
            <div className="w-1/2 p-6 overflow-y-auto bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Aperçu</h3>
              <div className="bg-white rounded-lg p-6 shadow-sm">
                {renderPreview()}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-4 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.title.trim() || !formData.content.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
            <Save className="w-4 h-4" />
            <span>{loading ? 'Sauvegarde...' : (editingArticle ? 'Mettre à jour' : 'Créer l\'article')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateArticleModal;
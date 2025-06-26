import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Paperclip, Download, Database, Shield } from 'lucide-react';
import { ticketService } from '../../services/ticketService';
import { useUser } from '../../hooks/useUser';
import { supabase } from '../../utils/supabase';
import { hybridStorage } from '../../utils/hybridStorage';
import { maliceScanner } from '../../utils/maliceScanner';

interface CreateTicketModalProps {
  onClose: () => void;
  onTicketCreated: () => void;
  prefillDescription?: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
}

const CreateTicketModal: React.FC<CreateTicketModalProps> = ({ onClose, onTicketCreated, prefillDescription }) => {
  const { user } = useUser();
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    category: string;
    priority: 'faible' | 'normale' | 'elevee' | 'urgente';
  }>({
    title: '',
    description: prefillDescription || '',
    category: '',
    priority: 'normale'
  });

  // Si la prop prefillDescription change (ouverture modale), on met à jour la description
  useEffect(() => {
    if (prefillDescription) {
      setFormData(prev => ({ ...prev, description: prefillDescription }));
    }
  }, [prefillDescription]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageStatus, setStorageStatus] = useState<string>('Vérification...');
  const [storageReady, setStorageReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<{file: string, result: string}[]>([]);

  useEffect(() => {
    fetchCategories();
    initializeStorage();
  }, []);

  // Initialiser le système de stockage
  const initializeStorage = async () => {
    try {
      console.log('🔧 === INITIALISATION STOCKAGE TICKETS ===');
      setStorageStatus('Diagnostic en cours...');
      
      const diagnosis = await hybridStorage.diagnoseStorage();
      
      if (diagnosis.databaseAvailable) {
        setStorageReady(true);
        setStorageStatus('Stockage prêt (max 5MB)');
        setError(null);
        console.log('✅ Stockage tickets prêt');
      } else {
        setStorageReady(false);
        setStorageStatus('Stockage non disponible');
        setError('Système de stockage non disponible');
        console.log('❌ Stockage tickets non disponible');
      }
    } catch (error) {
      console.error('❌ Erreur initialisation stockage tickets:', error);
      setStorageReady(false);
      setStorageStatus('Erreur d\'initialisation');
      setError('Erreur de configuration du stockage');
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setCategories(data || []);
      
      // Sélectionner la première catégorie par défaut
      if (data && data.length > 0) {
        setFormData(prev => ({ ...prev, category: data[0].name }));
      }
    } catch (err) {
      console.error('Erreur lors du chargement des catégories:', err);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Vérifier la taille des fichiers (max 5MB pour stockage en base)
    const validFiles = files.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        setError(`Le fichier "${file.name}" est trop volumineux (max 5MB)`);
        return false;
      }
      return true;
    });
    
    if (validFiles.length === 0) return;
    
    setScanning(true);
    setScanResults([]);
    setError(null);
    
    const newScanResults: {file: string, result: string}[] = [];
    const safeFiles: File[] = [];
    
    // Scanner chaque fichier pour les malwares
    for (const file of validFiles) {
      try {
        // Vérification de sécurité basique
        const safetyCheck = maliceScanner.isFileSafe(file);
        if (!safetyCheck.safe) {
          newScanResults.push({
            file: file.name,
            result: `❌ Rejeté: ${safetyCheck.reason}`
          });
          continue;
        }
        
        // Scanner pour les malwares
        const scanResult = await maliceScanner.scanFile(file);
        
        if (!scanResult.success) {
          newScanResults.push({
            file: file.name,
            result: `⚠️ Échec du scan: ${scanResult.error}`
          });
          continue;
        }
        
        if (!scanResult.clean) {
          newScanResults.push({
            file: file.name,
            result: `❌ Menace détectée: ${scanResult.threats.join(', ')}`
          });
          continue;
        }
        
        // Fichier sécurisé
        newScanResults.push({
          file: file.name,
          result: '✅ Sécurisé'
        });
        safeFiles.push(file);
      } catch (error) {
        console.error(`Erreur lors du scan de ${file.name}:`, error);
        newScanResults.push({
          file: file.name,
          result: '⚠️ Erreur de scan'
        });
      }
    }
    
    setScanResults(newScanResults);
    setAttachments(prev => [...prev, ...safeFiles]);
    setScanning(false);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadFiles = async (ticketId: string) => {
    if (attachments.length === 0) return [];

    const uploadedFiles = [];
    
    for (const file of attachments) {
      try {
        // Créer un nom de fichier unique
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2);
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${ticketId}/${timestamp}-${randomId}-${cleanName}`;
        
        console.log('🔄 Upload fichier ticket en base:', fileName);
        
        // Utiliser le système de stockage en base
        const result = await hybridStorage.uploadFile(
          'ticket-attachments', 
          file, 
          fileName, 
          ticketId, 
          'ticket'
        );
        
        if (!result.success) {
          setError(`Erreur upload ${file.name}: ${result.error}`);
          continue;
        }

        const fileInfo = {
          name: file.name,
          originalName: file.name,
          size: file.size,
          type: file.type,
          method: result.method,
          id: result.data?.id,
          fileData: result.data?.fileData
        };

        console.log(`✅ Fichier ticket uploadé (${result.method}):`, fileInfo);
        uploadedFiles.push(fileInfo);
      } catch (err) {
        console.error('❌ Erreur lors de l\'upload:', err);
        setError(`Erreur lors de l'upload de ${file.name}`);
      }
    }

    console.log('📁 Fichiers tickets uploadés:', uploadedFiles);
    return uploadedFiles;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Utilisateur non connecté');
      return;
    }

    if (!formData.title.trim() || !formData.description.trim() || !formData.category) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Vérifier que le stockage est prêt si on a des fichiers
    if (attachments.length > 0 && !storageReady) {
      setError(`Le stockage de fichiers n'est pas disponible: ${storageStatus}`);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Créer d'abord le ticket avec les données de base uniquement
      const ticketData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        priority: formData.priority,
        client_id: user.id
      };

      console.log('📝 Création du ticket avec les données:', ticketData);

      const createdTicket = await ticketService.createTicket(ticketData);
      console.log('✅ Ticket créé:', createdTicket);


      // Déclenchement automatisations : si une règle automation répond, ne pas envoyer le message IA de base
      try {
        const { handleAutomationsOnTicketCreate } = await import('../../services/automationTriggerService');
        const automationDidReply = await handleAutomationsOnTicketCreate({
          id: createdTicket.id,
          title: ticketData.title,
          description: ticketData.description
        });
        if (!automationDidReply) {
          const { geminiService } = await import('../../utils/gemini');
          const { messageService } = await import('../../services/messageService');
          // Prompt IA par défaut
          const prompt = `Voici un ticket client :\nTitre : ${ticketData.title}\nDescription : ${ticketData.description}\nDonne une recommandation ou un conseil court (max 3 phrases) sur ce ticket, puis ajoute : « Un agent va prendre en charge votre demande, merci de patienter. »`;
          let aiResponse = '';
          try {
            aiResponse = await geminiService.generateResponse(prompt);
          } catch (err) {
            aiResponse = '';
          }
          if (!aiResponse || aiResponse.trim() === '') {
            aiResponse = `Merci pour votre demande ! Un agent va prendre en charge votre ticket très prochainement. Merci de patienter.`;
          }
          await messageService.createMessage({
            ticket_id: createdTicket.id,
            user_id: '68496c98-c438-4791-a50a-fb4e15928ada',
            content: aiResponse,
            is_internal: false
          });
        }
      } catch (e) {
        // Log l'erreur dans le chat pour debug
        const { messageService } = await import('../../services/messageService');
        let errMsg = '';
        if (e && typeof e === 'object' && 'message' in e) {
          errMsg = (e as any).message;
        } else {
          errMsg = String(e);
        }
        await messageService.createMessage({
          ticket_id: createdTicket.id,
          user_id: '68496c98-c438-4791-a50a-fb4e15928ada',
          content: `Erreur IA: ${errMsg}`,
          is_internal: false
        });
        console.error('Erreur lors de la génération ou l\'insertion du message IA:', e);
      }

      // Uploader les fichiers si il y en a (sans mettre à jour le ticket)
      if (attachments.length > 0) {
        console.log('📁 Upload des fichiers...');
        const uploadedFiles = await uploadFiles(createdTicket.id);
        console.log(`✅ ${uploadedFiles.length} fichiers uploadés`);
      }

      onTicketCreated();
    } catch (err) {
      console.error('❌ Erreur lors de la création du ticket:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du ticket');
    } finally {
      setLoading(false);
    }
  };

  const priorityOptions = [
    { value: 'faible', label: 'Faible', color: 'text-green-600' },
    { value: 'normale', label: 'Normale', color: 'text-yellow-600' },
    { value: 'elevee', label: 'Élevée', color: 'text-orange-600' },
    { value: 'urgente', label: 'Urgente', color: 'text-red-600' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-yellow-50">
          <div className="flex items-center space-x-3">
            <img 
              src="https://i.postimg.cc/TPXN8mX3/Whats-App-Image-2025-06-12-18-31-34-d5a1cf22-removebg-preview.png" 
              alt="GIT Logo" 
              className="w-8 h-8 object-contain"
            />
            <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-yellow-500 bg-clip-text text-transparent">
              Créer un nouveau ticket
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Titre du ticket <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Décrivez brièvement votre problème"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              required
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Catégorie <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              required
            >
              <option value="">Sélectionnez une catégorie</option>
              {categories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name} - {category.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
              Priorité
            </label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                priority: e.target.value as 'faible' | 'normale' | 'elevee' | 'urgente'
              }))}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Sélectionnez "Urgente" uniquement pour les problèmes critiques bloquants
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description détaillée <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Décrivez votre problème en détail, incluez les étapes pour le reproduire, les messages d'erreur, etc."
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              Plus votre description est détaillée, plus nous pourrons vous aider efficacement
            </p>
          </div>

          {/* Section fichiers joints */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fichiers joints (optionnel)
              <div className="flex items-center space-x-2 mt-1">
                <Database className="w-4 h-4 text-red-600" />
                <span className="text-xs text-red-600">{storageStatus}</span>
                <Shield className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-600">Protection antivirus active</span>
              </div>
            </label>
            
            <div className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              storageReady 
                ? 'border-red-300 hover:border-red-400 bg-gradient-to-r from-red-50 to-yellow-50' 
                : 'border-gray-200 bg-gray-50'
            }`}>
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar"
                disabled={!storageReady || scanning}
              />
              <label
                htmlFor="file-upload"
                className={`flex flex-col items-center space-y-2 ${
                  storageReady && !scanning ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
              >
                {scanning ? (
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mb-2"></div>
                    <span className="text-red-600 font-medium">Analyse antivirus en cours...</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center space-x-2">
                      <Paperclip className={`w-8 h-8 ${storageReady ? 'text-red-400' : 'text-gray-300'}`} />
                      <Shield className={`w-6 h-6 ${storageReady ? 'text-green-500' : 'text-gray-300'}`} />
                    </div>
                    <span className={`text-sm ${storageReady ? 'text-gray-600' : 'text-gray-400'}`}>
                      {storageReady 
                        ? 'Cliquez pour ajouter des fichiers ou glissez-déposez'
                        : 'Stockage en cours d\'initialisation...'
                      }
                    </span>
                    <span className="text-xs text-gray-500">
                      PDF, DOC, images, ZIP... (max 5MB par fichier - stockage en base)
                    </span>
                  </>
                )}
              </label>
            </div>

            {/* Résultats des scans */}
            {scanResults.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span>Résultats de l'analyse antivirus</span>
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {scanResults.map((result, index) => (
                    <div key={index} className="text-xs flex items-center space-x-2 p-1">
                      <span className={`font-medium ${
                        result.result.startsWith('✅') ? 'text-green-600' : 
                        result.result.startsWith('❌') ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {result.result}
                      </span>
                      <span className="text-gray-600">{result.file}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Liste des fichiers sélectionnés */}
            {attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Fichiers sélectionnés :</h4>
                {attachments.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-red-50 rounded-lg p-3 border border-red-200">
                    <div className="flex items-center space-x-2">
                      <Database className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-gray-900">{file.name}</span>
                      <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Base</span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Sécurisé</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title.trim() || !formData.description.trim() || !formData.category || scanning}
              className="px-6 py-3 bg-gradient-to-r from-red-600 to-yellow-500 text-white rounded-lg hover:from-red-700 hover:to-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <span>{loading ? 'Création...' : 'Créer le ticket'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicketModal;
import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Smile, MoreVertical, Edit, Trash2, Clock, Download, X, AlertTriangle, CheckCircle, Database, Cloud, Monitor, MessageSquare, Shield } from 'lucide-react';
import { messageService } from '../../services/messageService';
import { faqService } from '../../services/faqService';
import { knowledgeBaseService } from '../../services/knowledgeBaseService';
import { useUser } from '../../hooks/useUser';
import { Database as DatabaseType } from '../../lib/supabase-types';
import { supabase } from '../../utils/supabase';
import { hybridStorage } from '../../utils/hybridStorage';
import { maliceScanner } from '../../utils/maliceScanner';
import UserProfileModal from '../Users/UserProfileModal';
import ReactMarkdown from 'react-markdown';
import { userService } from '../../services/userService';
import CreateTicketModal from '../Tickets/CreateTicketModal';

type Message = DatabaseType['public']['Tables']['messages']['Row'] & {
  user?: { id: string; full_name: string; email: string; role: string; avatar_url?: string };
};

interface MessageCenterProps {
  ticketId: string;
  onClose?: () => void;
}

const MessageCenter: React.FC<MessageCenterProps> = ({ ticketId, onClose }) => {
  // Gestion du bouton "Créer un ticket" IA (écouteur global)
  React.useEffect(() => {
    const handler = (e: any) => {
      if (e && e.detail && e.detail.content) {
        setPrefillTicket(e.detail.content);
        setShowCreateTicketModal(true);
      }
    };
    window.addEventListener('create-ticket-from-chat', handler);
    return () => window.removeEventListener('create-ticket-from-chat', handler);
  }, []);

  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [storageStatus, setStorageStatus] = useState<string>('Vérification...');
  const [storageMethod, setStorageMethod] = useState<'supabase' | 'database' | 'hybrid' | 'none'>('none');
  const [ticketInfo, setTicketInfo] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  const [scanResults, setScanResults] = useState<{file: string, result: string}[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
  const [prefillTicket, setPrefillTicket] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Vérifier que ticketId est valide avant de charger les messages
    if (!ticketId || ticketId === 'demo' || !isValidUUID(ticketId)) {
      console.error('TicketId invalide:', ticketId);
      setError('ID de ticket invalide');
      setLoading(false);
      return;
    }

    initializeStorage();
    fetchMessages();
    fetchTicketInfo();

    // Configurer l'abonnement aux nouveaux messages
    const messagesSubscription = supabase
      .channel(`messages-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `ticket_id=eq.${ticketId}`
        },
        (payload) => {
          console.log('Nouveau message reçu:', payload);
          // Ajouter le message à la liste si ce n'est pas le nôtre
          if (payload.new && payload.new.user_id !== user?.id) {
            fetchMessages();
          }
        }
      )
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
    };
  }, [ticketId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Récupérer les informations du ticket pour le contrôle à distance
  const fetchTicketInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          id,
          title,
          status,
          client:users!tickets_client_id_fkey(id, email, full_name)
        `)
        .eq('id', ticketId)
        .single();

      if (error) throw error;
      setTicketInfo(data);
    } catch (error) {
      console.error('Erreur lors du chargement des infos ticket:', error);
    }
  };

  // Fonction pour envoyer directement les instructions de contrôle à distance
  const sendRemoteControlInstructions = async () => {
    if (!user || !ticketInfo) return;

    try {
      setSending(true);
      
      // Message d'instructions RustDesk optimisé avec liens cliquables
      const instructions = `🚀 **CONTRÔLE À DISTANCE - RUSTDESK**

**🌐 TÉLÉCHARGEMENT DIRECT :**
https://github.com/rustdesk/rustdesk/releases/tag/1.4.0

**🔧 INSTRUCTIONS SIMPLES :**
1️⃣ Téléchargez et installez RustDesk
2️⃣ Lancez l'application
3️⃣ Notez votre ID et définissez un mot de passe
4️⃣ Communiquez-moi ces informations ci-dessous

**⚡ AVANTAGES RUSTDESK :**
• Open-source et gratuit
• Sécurisé et chiffré
• Contrôle total pour vous
• Aucun serveur tiers

**🔧 ALTERNATIVE - LIEN UNIVERSEL :**
https://github.com/rustdesk/rustdesk/releases/tag/1.4.0

**📞 Ticket #${ticketInfo.id.slice(0, 8)}**
Merci de me communiquer votre ID et mot de passe RustDesk dès que possible.`;

      // Envoyer le message
      await messageService.createMessage({
        ticket_id: ticketId,
        user_id: user!.id,
        content: instructions,
        is_internal: false,
        attachments: null
      });

      // Recharger les messages
      fetchMessages();
      
      // Ouvrir RustDesk Web pour l'agent
      window.open('https://github.com/rustdesk/rustdesk/releases/tag/1.4.0', '_blank', 'width=1200,height=800');
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi des instructions:', error);
      setError('Impossible d\'envoyer les instructions');
    } finally {
      setSending(false);
    }
  };

  // Initialiser le système de stockage hybride
  const initializeStorage = async () => {
    try {
      console.log('🔧 Initialisation du storage...');
      setStorageStatus('Diagnostic en cours...');
      
      const diagnosis = await hybridStorage.diagnoseStorage();
      
      if (diagnosis.supabaseAvailable && diagnosis.databaseAvailable) {
        setStorageMethod('hybrid');
        setStorageStatus('Stockage hybride prêt');
        setError(null);
      } else if (diagnosis.supabaseAvailable) {
        setStorageMethod('supabase');
        setStorageStatus('Supabase Storage prêt');
        setError(null);
      } else if (diagnosis.databaseAvailable) {
        setStorageMethod('database');
        setStorageStatus('Stockage base prêt (max 5MB)');
        setError(null);
      } else {
        setStorageMethod('none');
        setStorageStatus('Aucun stockage disponible');
        setError('Système de stockage non disponible');
      }
      
      console.log(`✅ Stockage initialisé: ${storageMethod}`);
      console.log(`💡 ${diagnosis.recommendation}`);
    } catch (error) {
      console.error('❌ Erreur initialisation stockage:', error);
      setStorageMethod('none');
      setStorageStatus('Erreur d\'initialisation');
      setError('Erreur de configuration du stockage');
    }
  };

  // Fonction pour valider un UUID
  const isValidUUID = (uuid: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await messageService.getTicketMessages(ticketId);
      setMessages(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
      setError('Impossible de charger les messages');
    } finally {
      setLoading(false);
    }
  };

  const uploadFiles = async () => {
    if (attachments.length === 0) return [];

    const uploadedFiles = [];
    
    for (const file of attachments) {
      try {
        // Créer un nom de fichier unique
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2);
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `messages/${ticketId}/${timestamp}-${randomId}-${cleanName}`;
        
        console.log('🔄 Upload fichier message hybride:', fileName);
        
        // Utiliser le système hybride
        const result = await hybridStorage.uploadFile(
          'message-attachments', 
          file, 
          fileName, 
          ticketId, 
          'message'
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
          ...(result.data || {})
        };

        console.log(`✅ Fichier uploadé (${result.method}):`, fileInfo);
        uploadedFiles.push(fileInfo);
      } catch (err) {
        console.error('❌ Erreur lors de l\'upload:', err);
        setError(`Erreur lors de l'upload de ${file.name}`);
      }
    }

    console.log('📁 Fichiers messages uploadés:', uploadedFiles);
    return uploadedFiles;
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && attachments.length === 0) || !user || sending) return;

    // Vérifier que le stockage est prêt si on a des fichiers
    if (attachments.length > 0 && storageMethod === 'none') {
      setError(`Le stockage de fichiers n'est pas disponible: ${storageStatus}`);
      return;
    }

    try {
      setSending(true);
      setError(null);

      // Uploader les fichiers d'abord
      const uploadedFiles = await uploadFiles();

      let messageContent = newMessage.trim();
      if (!messageContent && uploadedFiles.length > 0) {
        messageContent = `${uploadedFiles.length} fichier(s) joint(s)`;
      }

      // IA centralisée : analyse le message utilisateur
      let aiSuggestion = '';
      let aiReferences: string[] = [];
      try {
        // 1. Chercher dans la FAQ
        const faqs = await faqService.getAll();
        const faqMatch = faqs.find((f: any) => messageContent && (f.question.toLowerCase().includes(messageContent.toLowerCase()) || (f.answer && f.answer.toLowerCase().includes(messageContent.toLowerCase()))));
        if (faqMatch) {
          aiReferences.push(`FAQ : ${faqMatch.question}\n${faqMatch.answer}`);
        }
        // 2. Chercher dans la base de connaissance
        const articles = await knowledgeBaseService.getPublishedArticles();
        const kbMatch = articles.find((a: any) => messageContent && (a.title.toLowerCase().includes(messageContent.toLowerCase()) || (a.content && a.content.toLowerCase().includes(messageContent.toLowerCase()))));
        if (kbMatch) {
          aiReferences.push(`Base de connaissance : ${kbMatch.title}\n${kbMatch.content?.slice(0, 300)}...`);
        }
        // 3. Suggérer la création d'un ticket si la question semble complexe ou non résolue
        if (!faqMatch && !kbMatch && messageContent.length > 20) {
          aiSuggestion = "Je n'ai pas trouvé de réponse directe à votre question. Voulez-vous créer un ticket pour qu'un agent vous aide ?";
        }
      } catch (e) {
        // Ignore les erreurs de recherche
      }

      // Envoi du message utilisateur
      const messageData = {
        ticket_id: ticketId,
        user_id: user.id,
        content: messageContent,
        is_internal: isInternal && (user.role === 'agent' || user.role === 'admin'),
        attachments: uploadedFiles.length > 0 ? uploadedFiles : null
      };
      const createdMessage = await messageService.createMessage(messageData);
      setMessages(prev => [...prev, createdMessage]);
      setNewMessage('');
      setAttachments([]);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Réponse IA dans le chat (UI pro, suggestion ticket)
      if (aiReferences.length > 0 || aiSuggestion) {
        let aiContent = '';
        if (aiReferences.length > 0) {
          aiContent += '🔎 <b>Voici ce que j\'ai trouvé pour vous :</b><br/>';
          aiContent += aiReferences.map(ref => `<div class='rounded-lg bg-blue-50 border border-blue-200 p-3 my-2 text-sm text-blue-900'>${ref.replace(/\n/g, '<br/>')}</div>`).join('');
        }
        if (aiSuggestion) {
          aiContent += (aiContent ? '<br/>' : '') + `<div class='rounded-xl border border-yellow-300 bg-yellow-50 p-4 my-3 flex items-center space-x-3'>` +
            `<span class='text-yellow-700 font-semibold text-base'>${aiSuggestion}</span>` +
            `<button onclick='window.dispatchEvent(new CustomEvent("create-ticket-from-chat",{detail:{content: ${JSON.stringify(messageContent)}}}))' class='ml-4 px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold shadow hover:from-yellow-500 hover:to-orange-500 transition'>Créer un ticket</button>` +
          `</div>`;
        }
        await messageService.createMessage({
          ticket_id: ticketId,
          user_id: '68496c98-c438-4791-a50a-fb4e15928ada', // Compte IA unique
          content: aiContent,
          is_internal: false
        });
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi du message:', error);
      setError('Impossible d\'envoyer le message');
    } finally {
      setSending(false);
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editContent.trim()) return;

    try {
      await messageService.updateMessage(messageId, editContent.trim());
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, content: editContent.trim(), updated_at: new Date().toISOString() }
            : msg
        )
      );
      setEditingMessage(null);
      setEditContent('');
    } catch (error) {
      console.error('Erreur lors de la modification du message:', error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) return;

    try {
      await messageService.deleteMessage(messageId);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId
            ? { ...msg, content: '[Message supprimé]', updated_at: new Date().toISOString() }
            : msg
        )
      );
    } catch (error) {
      console.error('Erreur lors de la suppression du message:', error);
    }
  };

  const canEditMessage = (message: Message) => {
    if (!user) return false;
    if (message.user_id !== user.id) return false;
    
    const messageTime = new Date(message.created_at);
    const now = new Date();
    const diffInMinutes = (now.getTime() - messageTime.getTime()) / (1000 * 60);
    
    return diffInMinutes <= 15; // Éditable pendant 15 minutes
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getUserInitials = (user: any) => {
    if (user?.full_name) {
      return user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || '?';
  };

  const getUserRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500';
      case 'agent': return 'bg-blue-500';
      case 'client': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Vérifier la taille des fichiers selon la méthode de stockage
    const maxSize = storageMethod === 'database' ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB pour base, 10MB pour Supabase
    
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        setError(`Le fichier "${file.name}" est trop volumineux (max ${storageMethod === 'database' ? '5MB' : '10MB'})`);
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

  const downloadFile = async (file: any) => {
    try {
      console.log('📥 Tentative de téléchargement hybride:', file);
      
      const success = await hybridStorage.downloadFile(file);
      
      if (!success) {
        setError('Impossible de télécharger le fichier');
      }
    } catch (error) {
      console.error('❌ Erreur lors du téléchargement:', error);
      setError('Erreur lors du téléchargement');
    }
  };

  const getStorageIcon = () => {
    switch (storageMethod) {
      case 'hybrid': return <div className="flex items-center space-x-1"><Cloud className="w-3 h-3" /><Database className="w-3 h-3" /></div>;
      case 'supabase': return <Cloud className="w-3 h-3" />;
      case 'database': return <Database className="w-3 h-3" />;
      default: return <AlertTriangle className="w-3 h-3" />;
    }
  };

  const getStorageColor = () => {
    switch (storageMethod) {
      case 'hybrid': return 'text-blue-600';
      case 'supabase': return 'text-green-600';
      case 'database': return 'text-yellow-600';
      default: return 'text-red-600';
    }
  };

  // Fonction pour rendre les liens cliquables dans les messages
  // Affiche le markdown pour les messages IA, liens cliquables pour les autres
  const renderMessageContent = (content: string, isIA?: boolean) => {
    if (isIA) {
      return <div className="prose prose-invert max-w-none"><ReactMarkdown>{content}</ReactMarkdown></div>;
    }
    // Regex pour détecter les URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-300 underline hover:text-blue-100 break-all font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Si le ticketId n'est pas valide, afficher un message d'erreur
  if (!ticketId || ticketId === 'demo' || !isValidUUID(ticketId)) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[600px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur</h3>
          <p className="text-gray-500">
            ID de ticket invalide. Impossible de charger les messages.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[600px] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleUserClick = async (userId: string | undefined) => {
    if (!userId) return;
    const user = await userService.getUserProfileById(userId);
    setSelectedUser(user);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[600px] flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h3 className="font-semibold text-gray-900">Messages du ticket</h3>
            <div className={`flex items-center space-x-1 ${getStorageColor()}`}>
              {getStorageIcon()}
              <span className="text-xs">{storageStatus}</span>
            </div>
            
            {/* Bouton de contrôle à distance dans le header du chat */}
            {ticketInfo && (user?.role === 'agent' || user?.role === 'admin') && (
              <button
                onClick={sendRemoteControlInstructions}
                disabled={sending || ticketInfo.status === 'ferme'}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1 rounded-lg flex items-center space-x-1 transition-all text-sm shadow-sm hover:shadow-md transform hover:scale-105"
                title="Envoyer instructions contrôle à distance RustDesk"
              >
                {sending ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                ) : (
                  <Monitor className="w-3 h-3" />
                )}
                <span className="font-medium">Contrôle à Distance</span>
              </button>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>Aucun message pour ce ticket</p>
            <p className="text-sm">Soyez le premier à répondre !</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 ${
                message.user_id === user?.id ? 'justify-end' : 'justify-start'
              }`}
            >
              {/* Avatar à gauche uniquement pour les autres utilisateurs */}
              {message.user_id !== user?.id && (
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0 cursor-pointer hover:shadow-lg transition bg-white ${getUserRoleColor(message.user?.role || 'client')}`}
                  onClick={() => handleUserClick(message.user?.id)}
                  title={'Voir le profil utilisateur'}
                >
                  {message.user?.avatar_url ? (
                    <img 
                      src={message.user.avatar_url} 
                      alt={message.user.full_name} 
                      className="w-8 h-8 rounded-full object-cover bg-transparent"
                      style={{ backgroundColor: 'transparent' }}
                    />
                  ) : (
                    getUserInitials(message.user)
                  )}
                </div>
              )}

              <div
                className={`max-w-[70%] ${
                  message.user_id === user?.id ? 'order-first' : ''
                }`}
              >
                <div
                  className={`p-3 rounded-lg ${
                    message.user_id === user?.id
                      ? 'bg-blue-600 text-white'
                      : message.is_internal
                      ? 'bg-yellow-100 text-yellow-900 border border-yellow-200'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {message.user_id !== user?.id && (
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">
                        {message.user?.full_name || message.user?.email}
                        {message.is_internal && (
                          <span className="ml-2 px-2 py-0.5 bg-yellow-200 text-yellow-800 rounded text-xs">
                            Interne
                          </span>
                        )}
                      </span>
                      {canEditMessage(message) && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => {
                              setEditingMessage(message.id);
                              setEditContent(message.content);
                            }}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(message.id)}
                            className="p-1 hover:bg-red-200 rounded"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {editingMessage === message.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-gray-900 text-sm"
                        rows={3}
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditMessage(message.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Sauvegarder
                        </button>
                        <button
                          onClick={() => {
                            setEditingMessage(null);
                            setEditContent('');
                          }}
                          className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="whitespace-pre-wrap text-sm">
                        {message.user_id === '68496c98-c438-4791-a50a-fb4e15928ada' && /<button.+create-ticket-from-chat/.test(message.content || '') ? (
                          <span dangerouslySetInnerHTML={{ __html: message.content || '' }} />
                        ) : message.user_id === '68496c98-c438-4791-a50a-fb4e15928ada' ? (
                          renderMessageContent(message.content, true)
                        ) : (
                          renderMessageContent(message.content)
                        )}
                      </div>

                      {/* Affichage des fichiers joints */}
                      {message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {message.attachments.map((file: any, index: number) => (
                            <div 
                              key={index} 
                              className={`flex items-center justify-between p-2 rounded ${
                                message.user_id === user?.id 
                                  ? 'bg-blue-700 bg-opacity-50' 
                                  : 'bg-white border border-gray-200'
                              }`}
                            >
                              <div className="flex items-center space-x-2 flex-1 min-w-0">
                                <Paperclip className="w-4 h-4 flex-shrink-0" />
                                <span className="text-sm truncate">{file.originalName || file.name}</span>
                                <span className="text-xs opacity-75 flex-shrink-0">
                                  ({formatFileSize(file.size)})
                                </span>
                                {file.method && (
                                  <span className={`text-xs px-1 rounded ${
                                    file.method === 'supabase' ? 'bg-green-100 text-green-700' :
                                    file.method === 'database' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {file.method === 'supabase' ? 'Cloud' : 'DB'}
                                  </span>
                                )}
                                <span className="text-xs px-1 rounded bg-green-100 text-green-700">
                                  Sécurisé
                                </span>
                              </div>
                              <button 
                                onClick={() => downloadFile(file)}
                                className={`ml-2 p-1 rounded hover:bg-opacity-20 hover:bg-white flex-shrink-0 ${
                                  message.user_id === user?.id 
                                    ? 'text-white' 
                                    : 'text-gray-600 hover:text-gray-800'
                                }`}
                                title="Télécharger"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <p className={`text-xs ${
                      message.user_id === user?.id ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {formatMessageTime(message.created_at)}
                      {message.updated_at !== message.created_at && (
                        <span className="ml-1">(modifié)</span>
                      )}
                    </p>
                    
                    {canEditMessage(message) && message.user_id === user?.id && (
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setEditingMessage(message.id);
                            setEditContent(message.content);
                          }}
                          className="p-1 hover:bg-blue-700 rounded"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteMessage(message.id)}
                          className="p-1 hover:bg-blue-700 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Avatar à droite uniquement pour ses propres messages */}
              {message.user_id === user?.id && (
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium bg-white flex-shrink-0 cursor-pointer hover:shadow-lg transition`}
                  onClick={() => handleUserClick(user?.id)}
                  title={'Voir mon profil'}
                >
                  {user?.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt={user.full_name || undefined}
                      className="w-8 h-8 rounded-full object-cover bg-transparent"
                      style={{ backgroundColor: 'transparent' }}
                    />
                  ) : (
                    getUserInitials(user)
                  )}
                </div>
              )}
            </div>
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-200 flex-shrink-0">
        {/* Affichage des erreurs */}
        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Résultats des scans */}
        {scanResults.length > 0 && (
          <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Résultats de l'analyse antivirus</span>
              </div>
              <button
                onClick={() => setScanResults([])}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto">
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

        {/* Fichiers en attente */}
        {attachments.length > 0 && (
          <div className="mb-3 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">Fichiers à envoyer</span>
              <button
                onClick={() => setAttachments([])}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Tout supprimer
              </button>
            </div>
            <div className="space-y-1">
              {attachments.map((file, index) => (
                <div key={index} className="flex items-center justify-between bg-white rounded p-2">
                  <div className="flex items-center space-x-2">
                    <Paperclip className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                    <span className="text-xs bg-green-100 text-green-700 px-1 rounded">Sécurisé</span>
                  </div>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {(user?.role === 'agent' || user?.role === 'admin') && (
          <div className="mb-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">Message interne (visible uniquement par les agents)</span>
            </label>
          </div>
        )}

        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Tapez votre message..."
              className="w-full resize-none border border-gray-300 rounded-lg px-4 py-2 pr-20 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 max-h-32"
              rows={2}
              disabled={sending || scanning}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <div className="absolute bottom-2 right-2 flex items-center space-x-1">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.zip,.rar"
                disabled={storageMethod === 'none' || scanning}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className={`p-1 rounded ${
                  storageMethod !== 'none' && !scanning
                    ? 'text-gray-400 hover:text-gray-600' 
                    : 'text-gray-300 cursor-not-allowed'
                }`}
                title={storageMethod !== 'none' ? "Joindre un fichier" : `Stockage: ${storageStatus}`}
                disabled={storageMethod === 'none' || scanning}
              >
                {scanning ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                ) : (
                  <Paperclip className="w-4 h-4" />
                )}
              </button>
              <button className="p-1 text-gray-400 hover:text-gray-600">
                <Smile className="w-4 h-4" />
              </button>
            </div>
          </div>
          <button
            onClick={handleSendMessage}
            disabled={(!newMessage.trim() && attachments.length === 0) || sending || scanning}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[44px]"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {selectedUser && (
        <UserProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}

      {showCreateTicketModal && (
        <CreateTicketModal
          onClose={() => { setShowCreateTicketModal(false); setPrefillTicket(null); }}
          onTicketCreated={() => { setShowCreateTicketModal(false); setPrefillTicket(null); }}
          prefillDescription={prefillTicket || ''}
        />
      )}
    </div>
  );
};

export default MessageCenter;
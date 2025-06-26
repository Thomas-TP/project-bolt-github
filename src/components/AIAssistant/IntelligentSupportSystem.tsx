import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader, CheckCircle, Tag, AlertCircle, Clock, FileText, Save, Edit, X, ArrowRight } from 'lucide-react';
import { geminiService } from '../../utils/gemini';
import { ticketService } from '../../services/ticketService';
import { useUser } from '../../hooks/useUser';
import { supabase } from '../../utils/supabase';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface TicketDraft {
  title: string;
  description: string;
  category: string;
  priority: 'faible' | 'normale' | 'elevee' | 'urgente';
  tags: string[];
  similarTickets: any[];
  suggestedSolutions: string[];
}

interface Category {
  id: string;
  name: string;
  description: string;
}

const IntelligentSupportSystem: React.FC = () => {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Bonjour ! Je suis votre assistant IA. Pour vous aider efficacement, pourriez-vous me décrire votre problème en détail ? Plus vous me donnerez d'informations, mieux je pourrai vous aider.",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationStage, setConversationStage] = useState<'initial' | 'gathering' | 'confirming' | 'ticketCreation' | 'complete'>('initial');
  const [ticketDraft, setTicketDraft] = useState<TicketDraft>({
    title: '',
    description: '',
    category: '',
    priority: 'normale',
    tags: [],
    similarTickets: [],
    suggestedSolutions: []
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [showTicketPreview, setShowTicketPreview] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [ticketCreated, setTicketCreated] = useState(false);
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationHistory = useRef<string[]>([]);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des catégories:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setMessageCount(prev => prev + 1);

    // Add to conversation history
    conversationHistory.current.push(`User: ${inputValue}`);

    try {
      // If this is the first or second user message, check if it contains enough information to create a ticket
      if (messageCount < 2) {
        const hasEnoughInfo = checkForTicketCreation(inputValue);
        
        if (hasEnoughInfo) {
          // Skip the gathering phase and go straight to ticket creation
          await handleDirectTicketCreation(inputValue);
          return;
        }
      }
      
      // Determine the current stage and create a prompt accordingly
      let prompt = '';
      let aiResponse = '';
      
      if (conversationStage === 'initial') {
        // First user message - move to gathering information
        setConversationStage('gathering');
        prompt = createGatheringPrompt(inputValue);
        aiResponse = await geminiService.generateResponse(prompt);
      } else if (conversationStage === 'gathering' && messageCount >= 2) {
        // After a few exchanges, start preparing for ticket creation
        setConversationStage('confirming');
        prompt = createConfirmingPrompt(conversationHistory.current.join('\n'));
        aiResponse = await geminiService.generateResponse(prompt);
      } else if (conversationStage === 'confirming') {
        // User has responded to our confirmation - prepare ticket
        setConversationStage('ticketCreation');
        prompt = createTicketCreationPrompt(conversationHistory.current.join('\n'));
        aiResponse = await geminiService.generateResponse(prompt);
      } else {
        // Standard information gathering
        prompt = createGatheringPrompt(inputValue);
        aiResponse = await geminiService.generateResponse(prompt);
      }
      
      // Add to conversation history
      conversationHistory.current.push(`Assistant: ${aiResponse}`);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        sender: 'ai',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      // If we're in the ticket creation stage, parse the AI response to extract ticket details
      if (conversationStage === 'ticketCreation') {
        try {
          await parseTicketDetails(aiResponse);
          setShowTicketPreview(true);
        } catch (parseError) {
          console.error('Erreur lors de l\'analyse des détails du ticket:', parseError);
          setError('Impossible d\'analyser les détails du ticket. Veuillez réessayer.');
          
          // Add an error message to the conversation
          const errorMessage: Message = {
            id: (Date.now() + 2).toString(),
            content: "Je suis désolé, j'ai rencontré un problème lors de la génération du ticket. Pouvons-nous réessayer ? Veuillez me donner plus de détails sur votre problème.",
            sender: 'ai',
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, errorMessage]);
          
          // Reset to gathering stage
          setConversationStage('gathering');
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      setError('Une erreur est survenue lors de la communication avec l\'IA. Veuillez réessayer.');
      
      // Add an error message to the conversation
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: "Je suis désolé, j'ai rencontré un problème lors du traitement de votre message. Pourriez-vous reformuler ou essayer à nouveau plus tard ?",
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const checkForTicketCreation = (userInput: string): boolean => {
    // Check if the user input contains enough information to create a ticket directly
    const input = userInput.toLowerCase();
    
    // Check for specific patterns that indicate a complete problem description
    const hasHardwareProblem = input.includes('pc') && (input.includes('allume') || input.includes('démarre')) && input.includes('pas');
    const hasUrgency = input.includes('urgent') || input.includes('critique') || input.includes('bloqué');
    const hasDetails = input.length > 100 || (input.includes('windows') && input.includes('fixe'));
    
    return hasHardwareProblem && (hasUrgency || hasDetails);
  };

  const handleDirectTicketCreation = async (userInput: string) => {
    try {
      // Add a message indicating we're creating a ticket
      const processingMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Votre problème semble bien décrit. Je vais créer un ticket de support directement à partir de ces informations...",
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, processingMessage]);
      
      // Use the AI to analyze the conversation and create a ticket
      const ticketData = await geminiService.analyzeConversation(`User: ${userInput}`);
      
      // Update ticket draft with parsed data
      setTicketDraft({
        title: ticketData.title || '',
        description: ticketData.description || '',
        category: ticketData.category || '',
        priority: ticketData.priority || 'normale',
        tags: Array.isArray(ticketData.tags) ? ticketData.tags : [],
        similarTickets: [], // Will be populated later
        suggestedSolutions: Array.isArray(ticketData.suggestedSolutions) ? ticketData.suggestedSolutions : []
      });
      
      // Search for similar tickets
      await searchSimilarTickets(ticketData.title, ticketData.description);
      
      // Add a confirmation message
      const confirmationMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: "J'ai préparé un ticket de support basé sur votre description. Veuillez vérifier les détails et apporter des modifications si nécessaire avant de créer le ticket.",
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, confirmationMessage]);
      
      // Show ticket preview
      setConversationStage('ticketCreation');
      setShowTicketPreview(true);
    } catch (error) {
      console.error('Erreur lors de la création directe du ticket:', error);
      
      // Add an error message
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        content: "Je suis désolé, j'ai rencontré un problème lors de la création du ticket. Pourriez-vous me donner plus de détails sur votre problème ?",
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      // Continue with normal conversation flow
      setConversationStage('gathering');
    }
  };

  const createGatheringPrompt = (userInput: string) => {
    return `Tu es un assistant de support technique professionnel. L'utilisateur te décrit un problème technique. 
    Ton objectif est de recueillir suffisamment d'informations pour créer un ticket de support.
    
    Voici ce que l'utilisateur vient de dire: "${userInput}"
    
    Si tu as besoin de plus d'informations, pose des questions précises et pertinentes pour mieux comprendre:
    - La nature exacte du problème
    - Depuis quand le problème existe
    - Les étapes pour reproduire le problème
    - L'environnement (système d'exploitation, navigateur, etc.)
    - L'impact sur le travail de l'utilisateur
    
    Réponds de manière professionnelle et empathique. Ne simule pas la création d'un ticket pour l'instant.`;
  };

  const createConfirmingPrompt = (conversation: string) => {
    return `Tu es un assistant de support technique professionnel. Voici la conversation jusqu'à présent:
    
    ${conversation}
    
    Maintenant, résume le problème de l'utilisateur et demande-lui de confirmer ton résumé. 
    Indique que tu vas créer un ticket de support basé sur cette conversation.
    
    Ton résumé doit être concis mais complet, et inclure:
    - La nature du problème
    - Les symptômes principaux
    - L'impact sur l'utilisateur
    - Les informations techniques pertinentes
    
    Demande à l'utilisateur de confirmer ou de corriger ton résumé.`;
  };

  const createTicketCreationPrompt = (conversation: string) => {
    return `Tu es un assistant de support technique professionnel. Voici la conversation complète:
    
    ${conversation}
    
    Basé sur cette conversation, génère les détails d'un ticket de support au format JSON.
    
    Ton JSON doit avoir cette structure exacte:
    {
      "title": "Titre concis du problème",
      "description": "Description détaillée incluant toutes les informations pertinentes de la conversation",
      "category": "Choisir parmi: Technique, Réseau, Logiciel, Matériel, Accès, Formation, ou Autre",
      "priority": "Choisir parmi: faible, normale, elevee, urgente",
      "tags": ["tag1", "tag2", "tag3"],
      "suggestedSolutions": ["Solution potentielle 1", "Solution potentielle 2"]
    }
    
    Assure-toi que:
    - Le titre est clair et concis (max 100 caractères)
    - La description est détaillée et inclut toutes les informations importantes
    - La catégorie est appropriée au problème
    - La priorité reflète l'urgence et l'impact du problème
    - Les tags sont pertinents pour faciliter la recherche
    - Les solutions suggérées sont basées sur les informations disponibles
    
    Réponds UNIQUEMENT avec le JSON, sans texte supplémentaire.`;
  };

  const parseTicketDetails = async (aiResponse: string) => {
    try {
      console.log("AI Response to parse:", aiResponse);
      
      // Try to find JSON in the response
      let jsonStr = aiResponse;
      
      // If the response contains text before or after the JSON, extract just the JSON part
      const jsonStartIndex = aiResponse.indexOf('{');
      const jsonEndIndex = aiResponse.lastIndexOf('}');
      
      if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
        jsonStr = aiResponse.substring(jsonStartIndex, jsonEndIndex + 1);
      }
      
      console.log("Extracted JSON string:", jsonStr);
      
      // Parse the JSON
      const ticketData = JSON.parse(jsonStr);
      console.log("Parsed ticket data:", ticketData);
      
      // Validate required fields
      if (!ticketData.title || !ticketData.description) {
        throw new Error('Les champs obligatoires sont manquants dans les données du ticket');
      }
      
      // Update ticket draft with parsed data
      setTicketDraft({
        title: ticketData.title || '',
        description: ticketData.description || '',
        category: ticketData.category || '',
        priority: ticketData.priority || 'normale',
        tags: Array.isArray(ticketData.tags) ? ticketData.tags : [],
        similarTickets: [], // Will be populated later
        suggestedSolutions: Array.isArray(ticketData.suggestedSolutions) ? ticketData.suggestedSolutions : []
      });
      
      // Search for similar tickets
      await searchSimilarTickets(ticketData.title, ticketData.description);
      
      return ticketData;
    } catch (error) {
      console.error('Erreur lors de l\'analyse de la réponse JSON:', error);
      throw new Error('Impossible d\'analyser les détails du ticket. Veuillez réessayer.');
    }
  };

  const searchSimilarTickets = async (title: string, description: string) => {
    try {
      // This would be replaced with an actual API call to search for similar tickets
      const searchQuery = `${title} ${description}`.substring(0, 100);
      const similarTickets = await ticketService.searchTickets(searchQuery);
      
      // Update ticket draft with similar tickets
      setTicketDraft(prev => ({
        ...prev,
        similarTickets: similarTickets?.slice(0, 3) || []
      }));
    } catch (error) {
      console.error('Erreur lors de la recherche de tickets similaires:', error);
    }
  };

  const handleCreateTicket = async () => {
    if (!user) {
      setError('Vous devez être connecté pour créer un ticket');
      return;
    }

    try {
      setIsCreatingTicket(true);
      setError(null);

      const ticketData = {
        title: ticketDraft.title,
        description: ticketDraft.description,
        category: ticketDraft.category,
        priority: ticketDraft.priority,
        client_id: user.id,
        tags: ticketDraft.tags
      };

      const createdTicket = await ticketService.createTicket(ticketData);
      
      setCreatedTicketId(createdTicket.id);
      setTicketCreated(true);
      setConversationStage('complete');
      
      // Add confirmation message
      const confirmationMessage: Message = {
        id: Date.now().toString(),
        content: `✅ Votre ticket a été créé avec succès ! Numéro de référence: #${createdTicket.id.substring(0, 8)}. Vous pouvez suivre son évolution dans la section "Tickets".`,
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, confirmationMessage]);
      setShowTicketPreview(false);
    } catch (error) {
      console.error('Erreur lors de la création du ticket:', error);
      setError('Une erreur est survenue lors de la création du ticket. Veuillez réessayer.');
    } finally {
      setIsCreatingTicket(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'faible': return 'text-green-600 bg-green-50 border-green-200';
      case 'normale': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'elevee': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'urgente': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const renderTicketPreview = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-red-50 to-yellow-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-yellow-500 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Aperçu du ticket</h2>
            </div>
            <button
              onClick={() => setShowTicketPreview(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                <span>Titre du ticket</span>
                <button 
                  onClick={() => {
                    const newTitle = prompt('Modifiez le titre du ticket:', ticketDraft.title);
                    if (newTitle) setTicketDraft(prev => ({ ...prev, title: newTitle }));
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                >
                  <Edit className="w-3 h-3" />
                  <span>Modifier</span>
                </button>
              </label>
              <div className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-50">
                {ticketDraft.title}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                <span>Catégorie</span>
                <button 
                  onClick={() => {
                    // Create a select dropdown for categories
                    const select = document.createElement('select');
                    categories.forEach(cat => {
                      const option = document.createElement('option');
                      option.value = cat.name;
                      option.text = cat.name;
                      select.appendChild(option);
                    });
                    select.value = ticketDraft.category;
                    
                    // Create a custom dialog
                    const dialog = document.createElement('dialog');
                    dialog.style.padding = '20px';
                    dialog.style.borderRadius = '8px';
                    dialog.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                    
                    const heading = document.createElement('h3');
                    heading.textContent = 'Choisir une catégorie';
                    heading.style.marginBottom = '16px';
                    heading.style.fontWeight = 'bold';
                    
                    const buttonContainer = document.createElement('div');
                    buttonContainer.style.marginTop = '16px';
                    buttonContainer.style.display = 'flex';
                    buttonContainer.style.justifyContent = 'flex-end';
                    buttonContainer.style.gap = '8px';
                    
                    const cancelButton = document.createElement('button');
                    cancelButton.textContent = 'Annuler';
                    cancelButton.style.padding = '8px 16px';
                    cancelButton.style.borderRadius = '4px';
                    cancelButton.style.border = '1px solid #d1d5db';
                    
                    const confirmButton = document.createElement('button');
                    confirmButton.textContent = 'Confirmer';
                    confirmButton.style.padding = '8px 16px';
                    confirmButton.style.borderRadius = '4px';
                    confirmButton.style.backgroundColor = '#2563eb';
                    confirmButton.style.color = 'white';
                    confirmButton.style.border = 'none';
                    
                    buttonContainer.appendChild(cancelButton);
                    buttonContainer.appendChild(confirmButton);
                    
                    dialog.appendChild(heading);
                    dialog.appendChild(select);
                    dialog.appendChild(buttonContainer);
                    
                    document.body.appendChild(dialog);
                    dialog.showModal();
                    
                    cancelButton.onclick = () => {
                      dialog.close();
                      document.body.removeChild(dialog);
                    };
                    
                    confirmButton.onclick = () => {
                      setTicketDraft(prev => ({ ...prev, category: select.value }));
                      dialog.close();
                      document.body.removeChild(dialog);
                    };
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                >
                  <Edit className="w-3 h-3" />
                  <span>Modifier</span>
                </button>
              </label>
              <div className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-50">
                {ticketDraft.category || 'Non spécifié'}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                <span>Priorité</span>
                <button 
                  onClick={() => {
                    const priorities = [
                      { value: 'faible', label: 'Faible' },
                      { value: 'normale', label: 'Normale' },
                      { value: 'elevee', label: 'Élevée' },
                      { value: 'urgente', label: 'Urgente' }
                    ];
                    
                    // Create a select dropdown for priorities
                    const select = document.createElement('select');
                    priorities.forEach(p => {
                      const option = document.createElement('option');
                      option.value = p.value;
                      option.text = p.label;
                      select.appendChild(option);
                    });
                    select.value = ticketDraft.priority;
                    
                    // Create a custom dialog
                    const dialog = document.createElement('dialog');
                    dialog.style.padding = '20px';
                    dialog.style.borderRadius = '8px';
                    dialog.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                    
                    const heading = document.createElement('h3');
                    heading.textContent = 'Choisir une priorité';
                    heading.style.marginBottom = '16px';
                    heading.style.fontWeight = 'bold';
                    
                    const buttonContainer = document.createElement('div');
                    buttonContainer.style.marginTop = '16px';
                    buttonContainer.style.display = 'flex';
                    buttonContainer.style.justifyContent = 'flex-end';
                    buttonContainer.style.gap = '8px';
                    
                    const cancelButton = document.createElement('button');
                    cancelButton.textContent = 'Annuler';
                    cancelButton.style.padding = '8px 16px';
                    cancelButton.style.borderRadius = '4px';
                    cancelButton.style.border = '1px solid #d1d5db';
                    
                    const confirmButton = document.createElement('button');
                    confirmButton.textContent = 'Confirmer';
                    confirmButton.style.padding = '8px 16px';
                    confirmButton.style.borderRadius = '4px';
                    confirmButton.style.backgroundColor = '#2563eb';
                    confirmButton.style.color = 'white';
                    confirmButton.style.border = 'none';
                    
                    buttonContainer.appendChild(cancelButton);
                    buttonContainer.appendChild(confirmButton);
                    
                    dialog.appendChild(heading);
                    dialog.appendChild(select);
                    dialog.appendChild(buttonContainer);
                    
                    document.body.appendChild(dialog);
                    dialog.showModal();
                    
                    cancelButton.onclick = () => {
                      dialog.close();
                      document.body.removeChild(dialog);
                    };
                    
                    confirmButton.onclick = () => {
                      setTicketDraft(prev => ({ ...prev, priority: select.value as any }));
                      dialog.close();
                      document.body.removeChild(dialog);
                    };
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                >
                  <Edit className="w-3 h-3" />
                  <span>Modifier</span>
                </button>
              </label>
              <div className={`w-full border rounded-lg px-4 py-3 ${getPriorityColor(ticketDraft.priority)}`}>
                {ticketDraft.priority.charAt(0).toUpperCase() + ticketDraft.priority.slice(1)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                <span>Description</span>
                <button 
                  onClick={() => {
                    // Create a textarea for description
                    const textarea = document.createElement('textarea');
                    textarea.value = ticketDraft.description;
                    textarea.rows = 10;
                    textarea.style.width = '100%';
                    textarea.style.padding = '8px';
                    textarea.style.borderRadius = '4px';
                    textarea.style.border = '1px solid #d1d5db';
                    textarea.style.marginBottom = '16px';
                    
                    // Create a custom dialog
                    const dialog = document.createElement('dialog');
                    dialog.style.padding = '20px';
                    dialog.style.borderRadius = '8px';
                    dialog.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                    dialog.style.width = '80%';
                    dialog.style.maxWidth = '600px';
                    
                    const heading = document.createElement('h3');
                    heading.textContent = 'Modifier la description';
                    heading.style.marginBottom = '16px';
                    heading.style.fontWeight = 'bold';
                    
                    const buttonContainer = document.createElement('div');
                    buttonContainer.style.display = 'flex';
                    buttonContainer.style.justifyContent = 'flex-end';
                    buttonContainer.style.gap = '8px';
                    
                    const cancelButton = document.createElement('button');
                    cancelButton.textContent = 'Annuler';
                    cancelButton.style.padding = '8px 16px';
                    cancelButton.style.borderRadius = '4px';
                    cancelButton.style.border = '1px solid #d1d5db';
                    
                    const confirmButton = document.createElement('button');
                    confirmButton.textContent = 'Confirmer';
                    confirmButton.style.padding = '8px 16px';
                    confirmButton.style.borderRadius = '4px';
                    confirmButton.style.backgroundColor = '#2563eb';
                    confirmButton.style.color = 'white';
                    confirmButton.style.border = 'none';
                    
                    buttonContainer.appendChild(cancelButton);
                    buttonContainer.appendChild(confirmButton);
                    
                    dialog.appendChild(heading);
                    dialog.appendChild(textarea);
                    dialog.appendChild(buttonContainer);
                    
                    document.body.appendChild(dialog);
                    dialog.showModal();
                    
                    cancelButton.onclick = () => {
                      dialog.close();
                      document.body.removeChild(dialog);
                    };
                    
                    confirmButton.onclick = () => {
                      setTicketDraft(prev => ({ ...prev, description: textarea.value }));
                      dialog.close();
                      document.body.removeChild(dialog);
                    };
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                >
                  <Edit className="w-3 h-3" />
                  <span>Modifier</span>
                </button>
              </label>
              <div className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 max-h-60 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm">{ticketDraft.description}</pre>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                <span>Tags</span>
                <button 
                  onClick={() => {
                    const tagsStr = prompt('Entrez les tags séparés par des virgules:', ticketDraft.tags.join(', '));
                    if (tagsStr !== null) {
                      const newTags = tagsStr.split(',').map(tag => tag.trim()).filter(Boolean);
                      setTicketDraft(prev => ({ ...prev, tags: newTags }));
                    }
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center space-x-1"
                >
                  <Edit className="w-3 h-3" />
                  <span>Modifier</span>
                </button>
              </label>
              <div className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-50">
                <div className="flex flex-wrap gap-2">
                  {ticketDraft.tags.length > 0 ? (
                    ticketDraft.tags.map((tag, index) => (
                      <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded flex items-center">
                        <Tag className="w-3 h-3 mr-1" />
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 text-sm">Aucun tag</span>
                  )}
                </div>
              </div>
            </div>

            {ticketDraft.similarTickets.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tickets similaires trouvés
                </label>
                <div className="space-y-2">
                  {ticketDraft.similarTickets.map((ticket, index) => (
                    <div key={index} className="border border-yellow-200 rounded-lg p-3 bg-yellow-50">
                      <div className="font-medium text-yellow-800">{ticket.title}</div>
                      <div className="text-xs text-yellow-600 mt-1">
                        Statut: {ticket.status} | Créé le: {new Date(ticket.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ticketDraft.suggestedSolutions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Solutions suggérées
                </label>
                <div className="space-y-2">
                  {ticketDraft.suggestedSolutions.map((solution, index) => (
                    <div key={index} className="border border-green-200 rounded-lg p-3 bg-green-50">
                      <div className="text-sm text-green-800">{solution}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowTicketPreview(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Retour à la conversation
              </button>
              <button
                onClick={handleCreateTicket}
                disabled={isCreatingTicket}
                className="px-6 py-2 bg-gradient-to-r from-red-600 to-yellow-500 text-white rounded-lg hover:from-red-700 hover:to-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isCreatingTicket ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Création...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Créer le ticket</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-[600px] flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-yellow-50 rounded-t-xl">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-red-600 to-yellow-500 rounded-full flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Assistant IA</h3>
            <p className="text-sm text-gray-600">Décrivez votre problème pour créer un ticket</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start space-x-3 ${
              message.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.sender === 'ai' && (
              <div className="w-8 h-8 bg-gradient-to-r from-red-600 to-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              <p className={`text-xs mt-1 ${
                message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {message.timestamp.toLocaleTimeString('fr-FR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>

            {message.sender === 'user' && (
              <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-red-600 to-yellow-500 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-100 rounded-lg p-3">
              <Loader className="w-5 h-5 animate-spin text-gray-600" />
            </div>
          </div>
        )}

        {ticketCreated && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-800 font-medium">Ticket créé avec succès !</p>
              <p className="text-green-700 text-sm mt-1">
                Votre ticket #{createdTicketId?.substring(0, 8)} a été créé. Vous pouvez le suivre dans la section "Tickets".
              </p>
              <button
                onClick={() => {
                  // Navigate to ticket details
                  localStorage.setItem('selectedTicketId', createdTicketId || '');
                  localStorage.setItem('activeSection', 'tickets');
                  window.location.reload();
                }}
                className="mt-2 text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded flex items-center space-x-1 w-fit"
              >
                <ArrowRight className="w-3 h-3" />
                <span>Voir le ticket</span>
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-white" />
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Décrivez votre problème en détail..."
            className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-red-500 focus:border-red-500 max-h-32"
            rows={2}
            disabled={isLoading || ticketCreated}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading || ticketCreated}
            className="bg-gradient-to-r from-red-600 to-yellow-500 text-white p-2 rounded-lg hover:from-red-700 hover:to-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        {conversationStage === 'confirming' && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <span>L'assistant prépare un résumé de votre problème...</span>
          </div>
        )}
        
        {conversationStage === 'ticketCreation' && !showTicketPreview && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center space-x-2">
            <FileText className="w-4 h-4 text-green-500" />
            <span>Génération du ticket en cours...</span>
          </div>
        )}
      </div>

      {showTicketPreview && renderTicketPreview()}
    </div>
  );
};

export default IntelligentSupportSystem;
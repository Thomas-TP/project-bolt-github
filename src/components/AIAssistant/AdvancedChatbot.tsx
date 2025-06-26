import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader, FileText, Plus, Zap, Lightbulb, X, Paperclip, Smile, Maximize2, Minimize2, RotateCcw, MessageSquare } from 'lucide-react';
import { geminiService } from '../../utils/gemini';
import IntelligentSupportSystem from './IntelligentSupportSystem';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'text' | 'suggestion' | 'action' | 'error';
  actions?: {
    label: string;
    action: () => void;
  }[];
}

interface Suggestion {
  id: string;
  text: string;
}

const AdvancedChatbot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Bonjour ! Je suis votre assistant IA amélioré. Comment puis-je vous aider aujourd\'hui ?',
      sender: 'ai',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTicketCreator, setShowTicketCreator] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([
    { id: '1', text: 'Comment créer un ticket ?' },
    { id: '2', text: 'Je n\'arrive pas à me connecter' },
    { id: '3', text: 'Comment réinitialiser mon mot de passe ?' }
  ]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Simuler l'effet de frappe pour le premier message
    const timer = setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [
          ...prev,
          {
            id: '2',
            content: 'Voici quelques questions fréquentes que vous pourriez me poser, ou posez-moi directement votre question !',
            sender: 'ai',
            timestamp: new Date(),
            type: 'suggestion'
          }
        ]);
      }, 1500);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Check if the message is about creating a ticket
      const lowerCaseInput = inputValue.toLowerCase();
      const ticketKeywords = ['ticket', 'problème', 'probleme', 'aide', 'support', 'créer', 'creer', 'nouveau', 'demande'];
      
      const isTicketRequest = ticketKeywords.some(keyword => lowerCaseInput.includes(keyword));
      
      if (isTicketRequest) {
        // Simulate typing delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsTyping(false);
        
        // Suggest creating a ticket
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "Il semble que vous ayez un problème technique. Souhaitez-vous créer un ticket de support ? Notre assistant IA vous guidera à travers le processus.",
          sender: 'ai',
          timestamp: new Date(),
          type: 'action',
          actions: [
            {
              label: 'Créer un ticket',
              action: () => setShowTicketCreator(true)
            },
            {
              label: 'Non merci, continuer la discussion',
              action: () => {
                setMessages(prev => [
                  ...prev,
                  {
                    id: Date.now().toString(),
                    content: "D'accord, continuons notre conversation. Comment puis-je vous aider autrement ?",
                    sender: 'ai',
                    timestamp: new Date(),
                    type: 'text'
                  }
                ]);
              }
            }
          ]
        };
        
        setMessages(prev => [...prev, aiMessage]);
      } else {
        // Generate dynamic suggestions based on user input
        generateSuggestions(inputValue);
        
        // Normal response with typing effect
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsTyping(false);
        
        const aiResponse = await geminiService.generateResponse(inputValue);
        
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: aiResponse,
          sender: 'ai',
          timestamp: new Date(),
          type: 'text'
        };

        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      setIsTyping(false);
      
      // Error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Désolé, je rencontre des difficultés à traiter votre demande. Veuillez réessayer ou créer un ticket de support pour une assistance plus approfondie.",
        sender: 'ai',
        timestamp: new Date(),
        type: 'error'
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSuggestions = (userInput: string) => {
    // Analyse simple du message utilisateur pour générer des suggestions contextuelles
    const input = userInput.toLowerCase();
    
    if (input.includes('mot de passe') || input.includes('login') || input.includes('connexion')) {
      setSuggestions([
        { id: '1', text: 'Comment réinitialiser mon mot de passe ?' },
        { id: '2', text: 'Je n\'arrive pas à me connecter' },
        { id: '3', text: 'Comment changer mon adresse email ?' }
      ]);
    } else if (input.includes('ticket') || input.includes('problème') || input.includes('probleme')) {
      setSuggestions([
        { id: '1', text: 'Comment créer un ticket ?' },
        { id: '2', text: 'Comment suivre l\'état de mon ticket ?' },
        { id: '3', text: 'Comment ajouter des informations à mon ticket ?' }
      ]);
    } else if (input.includes('fichier') || input.includes('document') || input.includes('upload')) {
      setSuggestions([
        { id: '1', text: 'Comment joindre un fichier à mon ticket ?' },
        { id: '2', text: 'Quels types de fichiers sont acceptés ?' },
        { id: '3', text: 'Taille maximale des fichiers ?' }
      ]);
    } else {
      // Suggestions par défaut
      setSuggestions([
        { id: '1', text: 'Comment contacter le support ?' },
        { id: '2', text: 'Quelles sont les heures d\'ouverture ?' },
        { id: '3', text: 'Comment accéder à la base de connaissances ?' }
      ]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCreateTicket = () => {
    setShowTicketCreator(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    
    // Simuler "l'IA est en train d'écrire" quand l'utilisateur tape
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    const timeout = setTimeout(() => {
      // Ne rien faire, juste pour l'effet
    }, 500);
    
    setTypingTimeout(timeout);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    // Focus sur l'input après avoir sélectionné une suggestion
    const textarea = document.getElementById('chat-input') as HTMLTextAreaElement;
    if (textarea) {
      textarea.focus();
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const resetConversation = () => {
    if (confirm('Êtes-vous sûr de vouloir réinitialiser la conversation ? Tout l\'historique sera perdu.')) {
      setMessages([
        {
          id: '1',
          content: 'Bonjour ! Je suis votre assistant IA amélioré. Comment puis-je vous aider aujourd\'hui ?',
          sender: 'ai',
          timestamp: new Date(),
          type: 'text'
        },
        {
          id: '2',
          content: 'Voici quelques questions fréquentes que vous pourriez me poser, ou posez-moi directement votre question !',
          sender: 'ai',
          timestamp: new Date(),
          type: 'suggestion'
        }
      ]);
    }
  };

  const renderMessageContent = (message: Message) => {
    if (message.type === 'suggestion') {
      return (
        <div>
          <p className="whitespace-pre-wrap mb-3">{message.content}</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => handleSuggestionClick(suggestion.text)}
                className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-sm transition-colors"
              >
                {suggestion.text}
              </button>
            ))}
          </div>
        </div>
      );
    } else if (message.type === 'action') {
      return (
        <div>
          <p className="whitespace-pre-wrap mb-3">{message.content}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {message.actions?.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  index === 0 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      );
    } else if (message.type === 'error') {
      return (
        <div className="text-red-600">
          <p className="whitespace-pre-wrap">{message.content}</p>
          <div className="flex mt-2">
            <button
              onClick={handleCreateTicket}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm transition-colors flex items-center space-x-1"
            >
              <FileText className="w-4 h-4" />
              <span>Créer un ticket</span>
            </button>
          </div>
        </div>
      );
    }
    
    return <p className="whitespace-pre-wrap">{message.content}</p>;
  };

  if (showTicketCreator) {
    return <IntelligentSupportSystem />;
  }

  return (
    <div 
      className={`bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col ${
        isFullscreen 
          ? 'fixed inset-0 z-50 rounded-none' 
          : 'h-[600px]'
      }`}
      ref={chatContainerRef}
    >
      <div className="p-4 border-b border-gray-200 bg-blue-50 rounded-t-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Assistant IA Avancé</h3>
            <p className="text-sm text-gray-600">Powered by Gemini</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={resetConversation}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            title="Réinitialiser la conversation"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            title={isFullscreen ? "Quitter le mode plein écran" : "Mode plein écran"}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <button
            onClick={handleCreateTicket}
            className="bg-gradient-to-r from-red-600 to-yellow-500 hover:from-red-700 hover:to-yellow-600 text-white px-3 py-1 rounded-lg flex items-center space-x-1 text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Créer un ticket</span>
          </button>
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
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.type === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-800'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {renderMessageContent(message)}
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

        {isTyping && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '600ms' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <textarea
            id="chat-input"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Tapez votre message..."
            className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 max-h-32"
            rows={1}
            disabled={isLoading}
          />
          <div className="flex flex-col space-y-2">
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
            <button
              onClick={handleCreateTicket}
              className="bg-red-600 text-white p-2 rounded-lg hover:bg-red-700 transition-colors"
              title="Créer un ticket"
            >
              <FileText className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-2 text-gray-500">
            <button className="p-1 hover:text-gray-700 transition-colors">
              <Paperclip className="w-4 h-4" />
            </button>
            <button className="p-1 hover:text-gray-700 transition-colors">
              <Smile className="w-4 h-4" />
            </button>
            <button className="p-1 hover:text-gray-700 transition-colors">
              <Lightbulb className="w-4 h-4" />
            </button>
          </div>
          
          <div className="text-xs text-gray-500 flex items-center space-x-1">
            <Zap className="w-3 h-3" />
            <span>Powered by Gemini</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedChatbot;
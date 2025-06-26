import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader, FileText, Plus } from 'lucide-react';
import { geminiService } from '../../utils/gemini';
import IntelligentSupportSystem from './IntelligentSupportSystem';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const ChatBot: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Bonjour ! Je suis votre assistant IA. Comment puis-je vous aider aujourd\'hui ?',
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTicketCreator, setShowTicketCreator] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

    try {
      // Check if the message is about creating a ticket
      const lowerCaseInput = inputValue.toLowerCase();
      const ticketKeywords = ['ticket', 'problème', 'probleme', 'aide', 'support', 'créer', 'creer', 'nouveau', 'demande'];
      
      const isTicketRequest = ticketKeywords.some(keyword => lowerCaseInput.includes(keyword));
      
      if (isTicketRequest) {
        // Suggest creating a ticket
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: "Il semble que vous ayez un problème technique. Souhaitez-vous créer un ticket de support ? Notre assistant IA vous guidera à travers le processus.",
          sender: 'ai',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, aiMessage]);
        
        // Add a button message
        setTimeout(() => {
          const buttonMessage: Message = {
            id: (Date.now() + 2).toString(),
            content: "TICKET_CREATION_BUTTON",
            sender: 'ai',
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, buttonMessage]);
        }, 500);
      } else {
        // Normal response
        const aiResponse = await geminiService.generateResponse(inputValue);
        
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: aiResponse,
          sender: 'ai',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      
      // Error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Désolé, je rencontre des difficultés à traiter votre demande. Veuillez réessayer ou créer un ticket de support pour une assistance plus approfondie.",
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
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

  const renderMessageContent = (message: Message) => {
    if (message.content === "TICKET_CREATION_BUTTON") {
      return (
        <div className="bg-gradient-to-r from-red-50 to-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-gray-800 mb-3">Voulez-vous créer un ticket de support avec l'aide de notre assistant IA ?</p>
          <button 
            onClick={handleCreateTicket}
            className="bg-gradient-to-r from-red-600 to-yellow-500 hover:from-red-700 hover:to-yellow-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Créer un ticket</span>
          </button>
        </div>
      );
    }
    
    return <p className="whitespace-pre-wrap">{message.content}</p>;
  };

  if (showTicketCreator) {
    return <IntelligentSupportSystem />;
  }

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-[600px] flex flex-col">
      <div className="p-4 border-b border-gray-200 bg-blue-50 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Assistant IA</h3>
              <p className="text-sm text-gray-600">En ligne - Powered by Gemini</p>
            </div>
          </div>
          
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

        {isLoading && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-100 rounded-lg p-3">
              <Loader className="w-5 h-5 animate-spin text-gray-600" />
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
            placeholder="Tapez votre message..."
            className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 max-h-32"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
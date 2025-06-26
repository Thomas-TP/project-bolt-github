import React, { useState, useEffect, useRef } from 'react';
import { Search, BookOpen, Eye, Star, Plus, Calendar, Edit, Trash2, Filter, Play, Download, ThumbsUp, ThumbsDown, MessageSquare, X } from 'lucide-react';
import { knowledgeBaseService } from '../../services/knowledgeBaseService';
import { useUser } from '../../hooks/useUser';
import { Database } from '../../lib/supabase-types';
import CreateArticleModal from './CreateArticleModal';
import ArticleDetailModal from './ArticleDetailModal';

type KnowledgeArticle = Database['public']['Tables']['knowledge_base']['Row'] & {
  author?: { id: string; full_name: string; email: string };
};

interface Tutorial {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  duration: string;
  category: string;
}

const InteractiveKnowledgeBase: React.FC = () => {
  // ... rest of the component code ...
};

// Composant Share pour l'icône
const Share = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
    <polyline points="16 6 12 2 8 6"/>
    <line x1="12" y1="2" x2="12" y2="15"/>
  </svg>
);

export default InteractiveKnowledgeBase;
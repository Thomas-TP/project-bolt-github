import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Clock, Target, Calendar, Download, Filter, RefreshCw, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { ticketService } from '../../services/ticketService';
import { userService } from '../../services/userService';
import { useUser } from '../../hooks/useUser';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement } from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';

// Enregistrer les composants Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const AdvancedAnalyticsDashboard: React.FC = () => {
  // ... [rest of the component code remains exactly the same]
};

// Composant Ticket pour l'icône
const Ticket = ({ className }: { className?: string }) => (
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
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
    <path d="M13 5v2"/>
    <path d="M13 17v2"/>
    <path d="M13 11v2"/>
  </svg>
);

export default AdvancedAnalyticsDashboard;
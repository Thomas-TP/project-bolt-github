import { automationsService } from './automationsService';
import { geminiService } from '../utils/gemini';
import { messageService } from './messageService';
import { faqService } from './faqService';
import stringSimilarity from 'string-similarity';

/**
 * Vérifie les règles d'automatisation et exécute l'action si une règle match le ticket.
 * Retourne true si une action IA a été envoyée (pour ne pas envoyer le message automatique de base).
 */
export interface TicketAutomationInput {
  id: string;
  title: string;
  description: string;
  message?: string;
  // ...autres champs utiles
}

export async function handleAutomationsOnTicketCreate(ticket: TicketAutomationInput) {
  // Charger toutes les règles actives
  const rules = await automationsService.list();
  const SIMILARITY_THRESHOLD = 0.7;
  const matching = rules.find(rule => {
    if (!rule.enabled) return false;
    const { keyword, location } = rule.trigger;
    if (!keyword) return false;
    let text = '';
    if (location === 'title') text = ticket.title;
    else if (location === 'description') text = ticket.description;
    else if (location === 'message' && ticket.message) text = ticket.message;
    else return false;
    // Fuzzy match
    const similarity = stringSimilarity.compareTwoStrings(text.toLowerCase(), keyword.toLowerCase());
    return similarity >= SIMILARITY_THRESHOLD || text.toLowerCase().includes(keyword.toLowerCase());
  });
  if (!matching) return false;

  // Exécuter l'action
  if (matching.action.type === 'ia_reply') {
    let prompt = matching.action.iaPrompt?.trim() || '';
    let faqBlock = '';
    if (matching.action.faqId) {
      try {
        const faq = (await faqService.getAll() || []).find(f => f.id === matching.action.faqId);
        if (faq) {
          faqBlock = `\n\nFAQ à prendre en compte :\nQ : ${faq.question}\nR : ${faq.answer}`;
        }
      } catch {}
    }
    // Ajoute le contexte ticket, la FAQ et la consigne markdown/concision
    if (!prompt) {
      prompt = `Voici un ticket client :\nTitre : ${ticket.title}\nDescription : ${ticket.description}\nID : ${ticket.id}${ticket.message ? `\nMessage : ${ticket.message}` : ''}${faqBlock}\nDonne une réponse professionnelle, utile, concise et rassurante, adaptée au contexte du ticket.\nSois concis, ne divague pas.\nTu peux utiliser le markdown (titres, listes, liens, gras, italique, tableaux, code, etc) pour structurer la réponse.`;
    } else {
      // Ajoute la consigne markdown/concision si l'admin a mis un prompt custom
      prompt += `\n\nSois concis, ne divague pas. Tu peux utiliser le markdown (titres, listes, liens, gras, italique, tableaux, code, etc) pour structurer la réponse.`;
      // Ajoute le contexte ticket et la FAQ si pas déjà inclus
      if (!/ticket|titre|description|message|id/i.test(prompt)) {
        prompt = `Contexte du ticket :\nTitre : ${ticket.title}\nDescription : ${ticket.description}\nID : ${ticket.id}${ticket.message ? `\nMessage : ${ticket.message}` : ''}${faqBlock}\n` + prompt;
      } else if (faqBlock && !/faq|q :|r :/i.test(prompt)) {
        prompt += faqBlock;
      }
    }
    let aiResponse = '';
    try {
      aiResponse = await geminiService.generateResponse(prompt);
    } catch (e) {
      aiResponse = '';
    }
    if (!aiResponse || aiResponse.trim() === '') {
      aiResponse = `Merci pour votre demande ! Un agent va prendre en charge votre ticket très prochainement.`;
    }
    await messageService.createMessage({
      ticket_id: ticket.id,
      user_id: '68496c98-c438-4791-a50a-fb4e15928ada', // Compte IA
      content: aiResponse,
      is_internal: false
    });
    return true;
  }
  // TODO: gérer status_change, assign_agent...
  return false;
}

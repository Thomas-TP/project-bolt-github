// Script Node.js pour insérer des exemples de FAQ (format markdown)
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://holvmacfhxfteqcirfyt.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvbHZtYWNmaHhmdGVxY2lyZnl0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTY2NTc3NiwiZXhwIjoyMDY1MjQxNzc2fQ.ttiZsOrNRuXBBgosH8AEfvH-bxp2lZcKcl-K-Wm2tgc';
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const faqs = [
  {
    question: "Comment créer un ticket de support ?",
    answer: `Cliquez sur **Tickets** dans la barre latérale, puis sur **Nouveau ticket**. Remplissez le formulaire avec le maximum de détails et validez. Un agent prendra en charge votre demande rapidement.`,
    images: []
  },
  {
    question: "Comment suivre l’avancement de mon ticket ?",
    answer: `Dans la section **Tickets**, vous pouvez voir la liste de vos demandes, leur statut (_ouvert_, _en cours_, _résolu_…) et échanger avec l’agent via la messagerie intégrée.`,
    images: []
  },
  {
    question: "Comment joindre une pièce jointe à un ticket ?",
    answer: `Lors de la création ou de la réponse à un ticket, utilisez le bouton **Joindre un fichier** pour ajouter des documents ou des images à votre demande.`,
    images: []
  },
  {
    question: "Comment réinitialiser mon mot de passe ?",
    answer: `Sur la page de connexion, cliquez sur **Mot de passe oublié ?** et suivez les instructions envoyées par email pour réinitialiser votre mot de passe.`,
    images: []
  },
  {
    question: "Quels sont les délais de réponse du support ?",
    answer: `Nos agents s’engagent à répondre à toute demande sous 24h ouvrées. Les tickets urgents sont traités en priorité.`,
    images: []
  },
  {
    question: "Puis-je modifier ou supprimer un ticket après sa création ?",
    answer: `Vous pouvez modifier les informations d’un ticket tant qu’il n’est pas résolu. Pour supprimer un ticket, contactez un administrateur.`,
    images: []
  },
  {
    question: "Comment contacter un agent en direct ?",
    answer: `Utilisez la messagerie du ticket ou, pour les urgences, contactez le support via le chat en ligne ou le numéro affiché dans la section **Contact**.`,
    images: []
  }
];

async function insertFaqs() {
  for (const faq of faqs) {
    const { error } = await supabase.from('faq').insert([faq]);
    if (error) {
      console.error('Erreur insertion FAQ:', error);
    } else {
      console.log('FAQ insérée :', faq.question);
    }
  }
  console.log('Insertion FAQ terminée.');
}

insertFaqs();

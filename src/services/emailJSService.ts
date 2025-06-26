import emailjs from '@emailjs/browser';
import { supabase } from '../utils/supabase';

export interface EmailJSConfig {
  serviceId: string;
  templateId: string; // Default template for tickets
  userId: string;
  enabled: boolean;
  invitationTemplateId?: string; // Template for invitations
}

export const emailJSService = {
  init: (userId: string) => {
    emailjs.init(userId);
  },

  getServiceConfig: async (): Promise<EmailJSConfig | null> => {
    try {
      const { data: serviceIdSetting, error: serviceIdError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'emailjs_service_id')
        .single();

      const { data: templateIdSetting, error: templateIdError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'emailjs_template_id')
        .single();

      const { data: userIdSetting, error: userIdError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'emailjs_user_id')
        .single();

      const { data: enabledSetting, error: enabledError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'emailjs_enabled')
        .single();

      const { data: invitationTemplateIdSetting, error: invitationTemplateIdError } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'emailjs_invitation_template_id')
        .single();

      if (serviceIdError || templateIdError || userIdError || enabledError) {
        console.error('Error fetching EmailJS config:', serviceIdError || templateIdError || userIdError || enabledError);
        return null;
      }

      return {
        serviceId: serviceIdSetting?.value || '',
        templateId: templateIdSetting?.value || '',
        userId: userIdSetting?.value || '',
        enabled: enabledSetting?.value === 'true',
        invitationTemplateId: invitationTemplateIdSetting?.value || '',
      };
    } catch (error) {
      console.error('Unexpected error fetching EmailJS config:', error);
      return null;
    }
  },

  sendEmail: async (
    serviceId: string,
    templateId: string,
    templateParams: Record<string, any>,
    userId: string
  ) => {
    try {
      console.log('📧 Envoi email via EmailJS...');
      console.log('Paramètres:', { serviceId, templateId, userId });
      console.log('Template params:', templateParams);
      
      emailjs.init(userId);
      
      const sanitizedParams = Object.entries(templateParams).reduce((acc, [key, value]) => {
        acc[key] = String(value || '');
        return acc;
      }, {} as Record<string, string>);
      
      if (!sanitizedParams.to_email) {
        throw new Error('L\'adresse email du destinataire est vide');
      }
      
      console.log('Paramètres sanitisés:', sanitizedParams);
      
      const response = await emailjs.send(
        serviceId,
        templateId,
        sanitizedParams
      );
      
      console.log('✅ Email envoyé avec succès:', response);
      return { success: true, response };
    } catch (error: any) {
      console.error('❌ Erreur envoi EmailJS:', error);
      return { 
        success: false, 
        error: error.text || error.message || 'Erreur inconnue',
        status: error.status
      };
    }
  },

  sendTicketNotification: async (
    config: EmailJSConfig,
    ticketData: {
      to_email: string;
      to_name: string;
      ticket_id: string;
      ticket_title: string;
      ticket_description: string;
      client_name: string;
      agent_name?: string;
    }
  ) => {
    if (!config.enabled) {
      console.log('📧 EmailJS désactivé');
      return { success: false, error: 'EmailJS désactivé' };
    }

    return await emailJSService.sendEmail(
      config.serviceId,
      config.templateId,
      ticketData,
      config.userId
    );
  },

  sendTestEmail: async (
    config: EmailJSConfig,
    testEmail: string
  ) => {
    if (!config.serviceId || !config.templateId || !config.userId) {
      return { success: false, error: 'Configuration incomplète' };
    }
    
    if (!testEmail) {
      return { success: false, error: 'Adresse email de test non spécifiée' };
    }
    
    const templateParams = {
      to_email: testEmail,
      to_name: 'Utilisateur Test',
      ticket_id: 'TEST-001',
      ticket_title: 'Test de configuration EmailJS',
      ticket_description: 'Ceci est un test de la configuration EmailJS.',
      client_name: 'Utilisateur Test',
      agent_name: 'Support Test',
      reply_to: testEmail
    };
    
    console.log('Envoi test avec paramètres:', templateParams);
    
    return await emailJSService.sendEmail(
      config.serviceId,
      config.templateId,
      templateParams,
      config.userId
    );
  }
};
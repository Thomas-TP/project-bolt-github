import { supabase } from '../utils/supabase';
import { emailJSService } from './emailJSService';

export const securityService = {
  /**
   * Sends a security notification email directly using EmailJS
   * This bypasses the database trigger mechanism
   */
  async sendSecurityNotification(
    subject: string,
    message: string,
    details: Record<string, string>
  ): Promise<boolean> {
    try {
      console.log('🚨 Sending direct security notification email');
      
      // Variables déclarées en dehors du try
      let securityEmail = '';
      let emailJSConfig: any = null;
      
      // Get security notification email from settings - SÉCURISÉ
      try {
        const { data: emailSetting, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'security_notification_email')
          .maybeSingle(); // Utilise maybeSingle() au lieu de single()
        
        if (error) {
          console.error('Error fetching security notification email:', error);
          console.error('Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          
          // Fallback : essayer de continuer sans email de sécurité
          console.warn('Continuing without security email due to database error');
          return false;
        }
        
        if (!emailSetting || !emailSetting.value) {
          console.warn('No security notification email configured - using fallback');
          // Fallback vers un email par défaut ou désactiver l'envoi
          return false;
        }

        // Parse the email value (might be JSON string)
        try {
          securityEmail = JSON.parse(emailSetting.value);
        } catch (e) {
          // If not JSON, use as is
          securityEmail = emailSetting.value.replace(/^"|"$/g, '');
        }
        
        if (!securityEmail) {
          console.error('Invalid security notification email');
          return false;
        }
        
        console.log(`📧 Security notification will be sent to: ${securityEmail}`);
        
        // Get EmailJS configuration
        emailJSConfig = await emailJSService.getServiceConfig();
        
        if (!emailJSConfig || !emailJSConfig.serviceId || !emailJSConfig.userId) {
          console.error('EmailJS configuration is incomplete');
          return false;
        }
      } catch (globalError) {
        console.error('Error in security notification setup:', globalError);
        return false;
      }
      
      // Format details as HTML
      let detailsHtml = '<ul>';
      for (const [key, value] of Object.entries(details)) {
        detailsHtml += `<li><strong>${key}:</strong> ${value}</li>`;
      }
      detailsHtml += '</ul>';
      
      // Create email content
      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <div style="background-color: #f44336; color: white; padding: 10px; text-align: center; border-radius: 5px 5px 0 0;">
            <h1 style="margin: 0;">🚨 ALERTE DE SÉCURITÉ</h1>
          </div>
          
          <div style="padding: 20px;">
            <p><strong>${message}</strong></p>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeeba; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h3 style="margin-top: 0; color: #856404;">Détails de l'alerte</h3>
              ${detailsHtml}
            </div>
            
            <p>Cette alerte a été générée automatiquement par le système de sécurité.</p>
            
            <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <h3 style="margin-top: 0; color: #155724;">Actions recommandées</h3>
              <ol style="padding-left: 20px; margin-bottom: 0;">
                <li>Vérifier les journaux d'audit pour d'autres activités suspectes</li>
                <li>Contacter l'utilisateur concerné pour l'informer de la situation</li>
                <li>Recommander une analyse antivirus complète si nécessaire</li>
              </ol>
            </div>
            
            <p style="margin-top: 30px; font-size: 12px; color: #6c757d; text-align: center;">
              Ce message a été généré automatiquement par le système de sécurité HelpDesk.
              <br>Ne pas répondre à cet email.
            </p>
          </div>
        </div>
      `;
      
      // Send email directly via EmailJS
      const emailResult = await emailJSService.sendEmail(
        emailJSConfig.serviceId,
        emailJSConfig.templateId, // Using the default template
        {
          to_email: securityEmail,
          to_name: 'Administrateur Sécurité',
          subject: subject,
          message: emailContent,
          from_name: 'Système de Sécurité HelpDesk',
          reply_to: securityEmail
        },
        emailJSConfig.userId
      );
      
      if (emailResult.success) {
        console.log('✅ Security notification email sent successfully');
        return true;
      } else {
        console.error('❌ Failed to send security notification email:', emailResult.error);
        return false;
      }
      
    } catch (error) {
      console.error('Error sending security notification:', error);
      return false;
    }
  },
  
  /**
   * Logs a security event in the database
   */
  async logSecurityEvent(
    eventType: string,
    description: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    details?: Record<string, any>
  ): Promise<void> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No authenticated user for security logging');
        return;
      }
      
      // Create notification for all admins
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id, // This will be filtered by RLS to only show to admins
          title: `🚨 Alerte de sécurité: ${eventType}`,
          message: description,
          type: severity === 'critical' ? 'error' : 
                severity === 'high' ? 'warning' : 'info',
          action_url: '/settings/security'
        });
      
      console.log(`✅ Security event logged: ${eventType}`);
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }
};
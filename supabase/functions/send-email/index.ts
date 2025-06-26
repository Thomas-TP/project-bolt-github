import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2.39.1"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface EmailRequest {
  to: string
  subject: string
  text?: string
  html: string
  templateName?: string
  variables?: Record<string, string>
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Get SMTP settings from system_settings table
    const { data: emailSettings, error: settingsError } = await supabaseClient
      .from("system_settings")
      .select("key, value")
      .in("key", [
        "smtp_from_email",
        "smtp_from_name",
        "email_notifications",
        "resend_api_key"
      ])

    if (settingsError) {
      throw new Error(`Error fetching email settings: ${settingsError.message}`)
    }

    // Convert settings to a map
    const settings = emailSettings.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string>)

    // Check if email is enabled
    if (settings.email_notifications !== "true") {
      throw new Error("Email notifications are not enabled in system settings")
    }

    // Parse request body
    const { to, subject, text, html, templateName, variables } = await req.json() as EmailRequest

    // If templateName is provided, get the template from the database
    let emailHtml = html
    let emailSubject = subject

    if (templateName) {
      const { data: template, error: templateError } = await supabaseClient
        .from("email_templates")
        .select("subject, body")
        .eq("name", templateName)
        .eq("is_active", true)
        .single()

      if (templateError) {
        throw new Error(`Error fetching email template: ${templateError.message}`)
      }

      if (!template) {
        throw new Error(`Email template "${templateName}" not found or not active`)
      }

      emailSubject = template.subject
      emailHtml = template.body

      // Replace variables in subject and body
      if (variables) {
        for (const [key, value] of Object.entries(variables)) {
          emailSubject = emailSubject.replace(new RegExp(`{${key}}`, "g"), value)
          emailHtml = emailHtml.replace(new RegExp(`{${key}}`, "g"), value)
        }
      }
    }

    // Determine the from email address
    let fromEmail = "onboarding@resend.dev" // Default Resend address
    let fromName = settings.smtp_from_name || "HelpDesk Support"
    
    // Use custom domain if configured and valid
    if (settings.smtp_from_email && !settings.smtp_from_email.includes("gmail.com")) {
      fromEmail = settings.smtp_from_email
    }

    // Create the email payload
    const emailPayload = {
      from: `${fromName} <${fromEmail}>`,
      to,
      subject: emailSubject,
      html: emailHtml,
      text: text || emailHtml.replace(/<[^>]*>/g, ""), // Strip HTML for text version
    }

    console.log("Sending email with Resend API:", {
      to: emailPayload.to,
      subject: emailPayload.subject,
      from: emailPayload.from
    })

    // Use Resend API to send email
    let emailResult
    let status = "sent"
    let errorMessage = null

    try {
      // Use the API key from settings or fallback to hardcoded one
      const RESEND_API_KEY = settings.resend_api_key || "re_aF4Gs4pG_LncTYXwQeHwmQMAuBuDEUqZy"
      
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: emailPayload.from,
          to: emailPayload.to,
          subject: emailPayload.subject,
          html: emailPayload.html,
          text: emailPayload.text
        })
      })
      
      if (!resendResponse.ok) {
        const errorData = await resendResponse.json()
        throw new Error(`Resend API error: ${JSON.stringify(errorData)}`)
      }
      
      emailResult = await resendResponse.json()
      console.log("Resend API response:", emailResult)
      
    } catch (error) {
      console.error("Error sending email with Resend:", error)
      status = "failed"
      errorMessage = error.message
    }

    // Log the email attempt
    const { data: logData, error: logError } = await supabaseClient
      .from("email_logs")
      .insert({
        template_id: templateName ? null : null, // Would need to get template ID if using template
        recipient: to,
        subject: emailSubject,
        body: emailHtml,
        status: status,
        error_message: errorMessage,
        related_to: variables?.related_to || null,
        related_id: variables?.related_id || null,
      })
      .select()
      .single()

    if (logError) {
      console.error("Error logging email:", logError)
    }

    if (status === "failed") {
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage || "Failed to send email",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully with Resend API",
        messageId: emailResult?.id,
        logId: logData?.id
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )
  } catch (error) {
    console.error("Error in send-email function:", error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    )
  }
})
</parameter>
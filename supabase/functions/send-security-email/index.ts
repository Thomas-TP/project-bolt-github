import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2.39.1"
import { SMTPClient } from "npm:emailjs@4.0.3"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Get security notification email from settings
    const { data: emailSetting, error: emailSettingError } = await supabaseClient
      .from("system_settings")
      .select("value")
      .eq("key", "security_notification_email")
      .maybeSingle() // Utilise maybeSingle() au lieu de single()

    if (emailSettingError) {
      console.error("Error fetching security email:", emailSettingError)
      throw new Error(`Error fetching security email: ${emailSettingError.message}`)
    }

    if (!emailSetting || !emailSetting.value) {
      throw new Error("No security notification email configured")
    }

    // Parse the email value (might be JSON string)
    let securityEmail = ""
    try {
      securityEmail = JSON.parse(emailSetting.value)
    } catch (e) {
      // If not JSON, use as is
      securityEmail = emailSetting.value.replace(/^"|"$/g, "")
    }

    if (!securityEmail) {
      throw new Error("No security notification email configured")
    }

    // Get unsent security emails
    const { data: pendingEmails, error: emailsError } = await supabaseClient
      .from("email_logs")
      .select("*")
      .eq("status", "sent")
      .eq("related_to", "security")
      .order("sent_at", { ascending: false })
      .limit(10)

    if (emailsError) {
      throw new Error(`Error fetching pending emails: ${emailsError.message}`)
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No pending security emails to send",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      )
    }

    // Get SMTP settings
    const { data: smtpSettings, error: smtpError } = await supabaseClient
      .from("system_settings")
      .select("key, value")
      .in("key", [
        "smtp_host",
        "smtp_port",
        "smtp_username",
        "smtp_password",
        "smtp_from_email",
        "smtp_from_name",
      ])

    if (smtpError) {
      throw new Error(`Error fetching SMTP settings: ${smtpError.message}`)
    }

    // Convert settings to a map
    const settings = smtpSettings.reduce((acc, setting) => {
      try {
        acc[setting.key] = JSON.parse(setting.value)
      } catch (e) {
        acc[setting.key] = setting.value.replace(/^"|"$/g, "")
      }
      return acc
    }, {} as Record<string, string>)

    // Configure SMTP client
    const smtpClient = new SMTPClient({
      user: settings.smtp_username || "user",
      password: settings.smtp_password || "password",
      host: settings.smtp_host || "smtp.example.com",
      port: parseInt(settings.smtp_port) || 587,
      ssl: false,
    })

    // Process each pending email
    const results = []
    for (const email of pendingEmails) {
      try {
        // Send email
        await smtpClient.sendAsync({
          from: `${settings.smtp_from_name || "Security Alert"} <${settings.smtp_from_email || "security@example.com"}>`,
          to: securityEmail,
          subject: email.subject,
          text: email.body.replace(/<[^>]*>/g, ""), // Strip HTML for text version
          attachment: [
            { data: email.body, alternative: true },
          ],
        })

        // Update email status
        const { error: updateError } = await supabaseClient
          .from("email_logs")
          .update({ status: "sent" })
          .eq("id", email.id)

        if (updateError) {
          throw new Error(`Error updating email status: ${updateError.message}`)
        }

        results.push({
          id: email.id,
          status: "sent",
          recipient: securityEmail,
        })
      } catch (error) {
        console.error(`Error sending email ${email.id}:`, error)

        // Update email status to failed
        await supabaseClient
          .from("email_logs")
          .update({
            status: "failed",
            error_message: error.message || "Unknown error",
          })
          .eq("id", email.id)

        results.push({
          id: email.id,
          status: "failed",
          error: error.message || "Unknown error",
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${pendingEmails.length} security emails`,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )
  } catch (error) {
    console.error("Error in send-security-email function:", error)

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
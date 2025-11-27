import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Webhook } from "https://esm.sh/svix@1.15.0";
import { Resend } from "https://esm.sh/resend@6.0.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

interface InboundEmailPayload {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  reply_to?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
    size: number;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get webhook secret
    const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");
    
    if (!webhookSecret) {
      console.error("RESEND_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get webhook headers for signature verification
    const svixId = req.headers.get("svix-id");
    const svixTimestamp = req.headers.get("svix-timestamp");
    const svixSignature = req.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      console.error("Missing webhook signature headers");
      return new Response(
        JSON.stringify({ error: "Missing webhook signature" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get raw body for signature verification
    const body = await req.text();
    
    // Verify webhook signature
    const wh = new Webhook(webhookSecret);
    let verifiedPayload: any;
    
    try {
      verifiedPayload = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(
        JSON.stringify({ error: "Invalid webhook signature" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    
    // Resend sends the email data in the 'data' property
    const webhookData = verifiedPayload.data || verifiedPayload;
    
    console.log("Received email webhook - full payload:", JSON.stringify(webhookData, null, 2));
    
    // For Resend inbound emails, use the receiving API endpoint
    let emailHtml = webhookData.html || "";
    let emailText = webhookData.text || "";
    
    // If no body content in webhook, fetch from Resend API
    if (!emailHtml && !emailText && webhookData.email_id) {
      try {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        console.log("Fetching email content for ID:", webhookData.email_id);
        
        // Use the correct REST API endpoint for received emails
        const emailResponse = await fetch(
          `https://api.resend.com/emails/receiving/${webhookData.email_id}`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
            },
          }
        );

        if (emailResponse.ok) {
          const emailData = await emailResponse.json();
          console.log("Fetched email data successfully");
          emailHtml = emailData.html || "";
          emailText = emailData.text || "";
        } else {
          const errorText = await emailResponse.text();
          console.error("Failed to fetch email:", emailResponse.status, errorText);
        }
      } catch (fetchError) {
        console.error("Error fetching email content:", fetchError);
      }
    }
    
    console.log("Final email body:", {
      hasHtml: !!emailHtml,
      hasText: !!emailText,
      htmlLength: emailHtml?.length || 0,
      textLength: emailText?.length || 0,
    });

    const payload: InboundEmailPayload = {
      from: webhookData.from,
      to: Array.isArray(webhookData.to) ? webhookData.to : [webhookData.to],
      subject: webhookData.subject,
      html: emailHtml,
      text: emailText,
      reply_to: webhookData.reply_to,
      cc: webhookData.cc,
      bcc: webhookData.bcc,
      attachments: webhookData.attachments,
    };

    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Extract recipient email address
    const toEmail = (Array.isArray(payload.to) ? payload.to[0] : payload.to).toLowerCase();
    
    // Find the email address or alias
    const { data: emailAddress, error: emailError } = await supabaseAdmin
      .from("email_addresses")
      .select("id, user_id, is_alias, alias_for_id")
      .eq("full_email", toEmail)
      .single();

    if (emailError || !emailAddress) {
      console.error("Email address not found:", toEmail, emailError);
      return new Response(
        JSON.stringify({ 
          error: "Recipient email address not found",
          email: toEmail 
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Found email address for user:", emailAddress.user_id);

    // If this is an alias, get the target email address
    let targetEmailAddressId = emailAddress.id;
    if (emailAddress.is_alias && emailAddress.alias_for_id) {
      console.log("Email is an alias, forwarding to:", emailAddress.alias_for_id);
      targetEmailAddressId = emailAddress.alias_for_id;
    }

    // Get the Inbox folder for this user
    const { data: inboxFolder, error: folderError } = await supabaseAdmin
      .from("folders")
      .select("id")
      .eq("type", "inbox")
      .eq("user_id", emailAddress.user_id)
      .single();

    if (folderError || !inboxFolder) {
      console.error("Inbox folder not found for user:", emailAddress.user_id);
      return new Response(
        JSON.stringify({ error: "Inbox folder not found" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Process attachments if any
    const attachments = payload.attachments?.map(att => ({
      name: att.filename,
      size: att.size,
      contentType: att.contentType,
      // Note: In production, you'd want to upload the attachment content to storage
      // and store the path instead of the content directly
    })) || [];

    // Parse CC and BCC if present
    const ccAddresses = payload.cc 
      ? (Array.isArray(payload.cc) ? payload.cc : payload.cc.split(",").map(e => e.trim())) 
      : [];
    const bccAddresses = payload.bcc 
      ? (Array.isArray(payload.bcc) ? payload.bcc : payload.bcc.split(",").map(e => e.trim())) 
      : [];

    // Check if this is a reply to an existing thread
    let threadId = null;
    const isReply = payload.subject.toLowerCase().startsWith('re:');
    
    if (isReply) {
      // Extract the original subject by removing "Re:" prefix
      const originalSubject = payload.subject.replace(/^re:\s*/i, '').trim();
      
      // Try to find an existing thread with matching subject and participants
      const { data: existingEmail } = await supabaseAdmin
        .from("emails")
        .select("thread_id, id")
        .eq("user_id", emailAddress.user_id)
        .or(`from_address.eq.${payload.from},to_addresses.cs.{${payload.from}}`)
        .ilike("subject", `%${originalSubject}%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (existingEmail) {
        // Use the existing thread_id, or use the email's id as the new thread_id
        threadId = existingEmail.thread_id || existingEmail.id;
      }
    }

    // Store the received email in the database
    const { data: insertedEmail, error: insertError } = await supabaseAdmin
      .from("emails")
      .insert({
        user_id: emailAddress.user_id,
        email_address_id: targetEmailAddressId,
        folder_id: inboxFolder.id,
        from_address: payload.from,
        to_addresses: Array.isArray(payload.to) ? payload.to : [payload.to],
        cc_addresses: ccAddresses,
        bcc_addresses: bccAddresses,
        subject: payload.subject,
        body_html: payload.html,
        body_text: payload.text,
        reply_to: payload.reply_to,
        attachments: attachments,
        received_at: new Date().toISOString(),
        is_read: false,
        is_draft: false,
        thread_id: threadId,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error storing email:", insertError);
      throw new Error(`Failed to store email: ${insertError.message}`);
    }

    console.log("Email stored successfully:", insertedEmail.id);

    // Send notification email if user has notifications enabled for this email address
    try {
      const { data: userSettings } = await supabaseAdmin
        .from("user_settings")
        .select("notifications_enabled, notification_new_email")
        .eq("email_address_id", targetEmailAddressId)
        .maybeSingle();

      if (userSettings?.notifications_enabled && userSettings?.notification_new_email) {
        // Get user's primary email to send notification
        const { data: primaryEmail } = await supabaseAdmin
          .from("email_addresses")
          .select("full_email")
          .eq("user_id", emailAddress.user_id)
          .eq("is_primary", true)
          .single();

        if (primaryEmail) {
          const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
          
          const emailPreview = payload.text?.substring(0, 150) || payload.html?.substring(0, 150) || "";
          
          await resend.emails.send({
            from: "AfuChat Notifications <notifications@afuchat.com>",
            to: [primaryEmail.full_email],
            subject: `New email from ${payload.from}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a1a1a;">You have a new email!</h2>
                <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>To:</strong> ${toEmail}</p>
                  <p style="margin: 5px 0;"><strong>From:</strong> ${payload.from}</p>
                  <p style="margin: 5px 0;"><strong>Subject:</strong> ${payload.subject}</p>
                  <p style="margin: 15px 0 5px 0;"><strong>Preview:</strong></p>
                  <p style="color: #666; margin: 5px 0;">${emailPreview}${emailPreview.length >= 150 ? '...' : ''}</p>
                </div>
                <p style="color: #666; font-size: 14px;">
                  Log in to your AfuChat account to read the full message.
                </p>
              </div>
            `,
          });
          
          console.log("Notification email sent to:", primaryEmail.full_email);
        }
      }
    } catch (notificationError) {
      // Log but don't fail the email reception if notification fails
      console.error("Failed to send notification email:", notificationError);
    }

    // Send push notifications
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      
      const notificationResponse = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          email_address_id: targetEmailAddressId,
          email_id: insertedEmail.id,
          from_address: payload.from,
          subject: payload.subject,
        }),
      });

      if (notificationResponse.ok) {
        console.log('Push notification sent successfully');
      } else {
        console.error('Failed to send push notification:', await notificationResponse.text());
      }
    } catch (pushError) {
      console.error('Error sending push notification:', pushError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        email_id: insertedEmail.id,
        message: "Email received and stored"
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in receive-email function:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return new Response(
      JSON.stringify({ 
        error: "Failed to process email",
        code: "EMAIL_RECEIVE_ERROR"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

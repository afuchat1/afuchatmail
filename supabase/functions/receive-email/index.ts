import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InboundEmailPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  reply_to?: string;
  cc?: string;
  bcc?: string;
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
    // Create admin client to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload: InboundEmailPayload = await req.json();
    
    console.log("Received email:", {
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
    });

    // Extract recipient email address
    const toEmail = payload.to.toLowerCase();
    
    // Find the user who owns this email address
    const { data: emailAddress, error: emailError } = await supabaseAdmin
      .from("email_addresses")
      .select("id, user_id")
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
    const ccAddresses = payload.cc ? payload.cc.split(",").map(e => e.trim()) : [];
    const bccAddresses = payload.bcc ? payload.bcc.split(",").map(e => e.trim()) : [];

    // Store the received email in the database
    const { data: insertedEmail, error: insertError } = await supabaseAdmin
      .from("emails")
      .insert({
        user_id: emailAddress.user_id,
        email_address_id: emailAddress.id,
        folder_id: inboxFolder.id,
        from_address: payload.from,
        to_addresses: [payload.to],
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
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error storing email:", insertError);
      throw new Error(`Failed to store email: ${insertError.message}`);
    }

    console.log("Email stored successfully:", insertedEmail.id);

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
    console.error("Error in receive-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

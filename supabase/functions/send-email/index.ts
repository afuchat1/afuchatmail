import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendEmailRequest {
  from_address: string;
  to_addresses: string[];
  cc_addresses?: string[];
  bcc_addresses?: string[];
  subject: string;
  body_html: string;
  body_text: string;
  reply_to?: string;
  attachments?: Array<{
    name: string;
    size: number;
    path: string;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create Supabase client with service role for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Create client with user's JWT to verify authentication
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify the JWT and get user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      throw new Error(`Authentication failed: ${userError?.message || "Invalid token"}`);
    }

    console.log("Authenticated user:", user.id);


    const emailData: SendEmailRequest = await req.json();
    console.log("Sending email from:", emailData.from_address, "to:", emailData.to_addresses);

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: emailData.from_address,
      to: emailData.to_addresses,
      cc: emailData.cc_addresses,
      bcc: emailData.bcc_addresses,
      subject: emailData.subject,
      html: emailData.body_html,
      text: emailData.body_text,
      replyTo: emailData.reply_to,
    });

    console.log("Email sent successfully:", emailResponse);

    // Get the email_address_id
    const { data: emailAddress } = await supabaseAdmin
      .from("email_addresses")
      .select("id")
      .eq("full_email", emailData.from_address)
      .eq("user_id", user.id)
      .single();

    // Get the Sent folder for this user
    const { data: sentFolder } = await supabaseAdmin
      .from("folders")
      .select("id")
      .eq("type", "sent")
      .eq("user_id", user.id)
      .maybeSingle();

    console.log("Sent folder:", sentFolder);
    console.log("Email address:", emailAddress);

    // Store in database using admin client with explicit user_id
    const { data: insertedEmail, error: insertError } = await supabaseAdmin
      .from("emails")
      .insert({
        user_id: user.id,
        email_address_id: emailAddress?.id,
        folder_id: sentFolder?.id,
        from_address: emailData.from_address,
        to_addresses: emailData.to_addresses,
        cc_addresses: emailData.cc_addresses || [],
        bcc_addresses: emailData.bcc_addresses || [],
        subject: emailData.subject,
        body_html: emailData.body_html,
        body_text: emailData.body_text,
        reply_to: emailData.reply_to,
        attachments: emailData.attachments || [],
        sent_at: new Date().toISOString(),
        is_read: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error storing email in database:", insertError);
      throw new Error(`Failed to store email: ${insertError.message}`);
    }

    console.log("Email stored successfully:", insertedEmail?.id);

    return new Response(JSON.stringify({ 
      success: true, 
      email_sent: emailResponse,
      email_stored: insertedEmail 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
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

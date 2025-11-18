import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

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
      reply_to: emailData.reply_to,
    });

    console.log("Email sent successfully:", emailResponse);

    // Get the email_address_id
    const { data: emailAddress } = await supabase
      .from("email_addresses")
      .select("id")
      .eq("full_email", emailData.from_address)
      .eq("user_id", user.id)
      .single();

    // Get the Sent folder
    const { data: sentFolder } = await supabase
      .from("folders")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", "sent")
      .single();

    // Store in database
    const { error: insertError } = await supabase
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
        sent_at: new Date().toISOString(),
        is_read: true,
      });

    if (insertError) {
      console.error("Error storing email:", insertError);
    }

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

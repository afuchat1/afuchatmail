import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { action, body, subject, context, reply_to_body } = await req.json();

    let systemPrompt = "";
    let userPrompt = "";

    switch (action) {
      case "autocomplete":
        systemPrompt =
          "You are an email autocomplete assistant. Given the email draft so far, suggest a natural continuation of 1-2 sentences. Only output the suggested continuation text, nothing else. Be concise and professional.";
        userPrompt = `Subject: ${subject || "(no subject)"}\n\nDraft so far:\n${body}`;
        break;

      case "smart_reply":
        systemPrompt =
          "You are an email smart reply assistant. Given the email content, generate exactly 3 short reply suggestions (1-2 sentences each). Return them as a JSON array of strings. Only output the JSON array, no markdown.";
        userPrompt = `Email from: ${context || "someone"}\nSubject: ${subject || "(no subject)"}\n\nEmail body:\n${reply_to_body || body}`;
        break;

      case "improve_tone":
        systemPrompt =
          "You are an email writing assistant. Rewrite the given email text to sound more professional, polished, and clear while preserving the meaning. Only output the improved text, nothing else.";
        userPrompt = body;
        break;

      case "fix_grammar":
        systemPrompt =
          "You are a grammar and spelling checker. Fix all grammar, spelling, and punctuation errors in the given text. Only output the corrected text, nothing else. If it's already correct, return it unchanged.";
        userPrompt = body;
        break;

      case "make_shorter":
        systemPrompt =
          "You are an email writing assistant. Make the given email text shorter and more concise while preserving the key message. Only output the shortened text, nothing else.";
        userPrompt = body;
        break;

      case "make_longer":
        systemPrompt =
          "You are an email writing assistant. Expand the given email text to be more detailed and thorough while keeping a professional tone. Only output the expanded text, nothing else.";
        userPrompt = body;
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: false,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // For smart_reply, parse JSON array
    if (action === "smart_reply") {
      try {
        // Try to extract JSON array from the response
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        const suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [content];
        return new Response(
          JSON.stringify({ suggestions }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch {
        return new Response(
          JSON.stringify({ suggestions: [content] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ result: content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-email-assist error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

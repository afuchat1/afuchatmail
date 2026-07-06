import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ENGAGERA_ENDPOINT = "https://rhnsjqqtdzlkvqazfcbg.supabase.co/functions/v1/chat";

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ENGAGERA_API_KEY = Deno.env.get("ENGAGERA_API_KEY")
      ?.trim()
      .replace(/^['\"]|['\"]$/g, "");
    if (!ENGAGERA_API_KEY) throw new Error("ENGAGERA_API_KEY is not configured");

    const { action, body, subject, context, reply_to_body } = await req.json();

    let systemPrompt = "";
    let userPrompt = "";
    // Pick the best Engagera model per action. "engagera-pro" is a solid default;
    // "engagera-reason" for tasks that benefit from deeper thinking.
    let model = "engagera-pro";

    switch (action) {
      case "autocomplete":
        systemPrompt =
          "You are an email autocomplete assistant. Given the email draft so far, suggest a natural continuation of 1-2 sentences. Only output the suggested continuation text, nothing else. Be concise and professional.";
        userPrompt = `Subject: ${subject || "(no subject)"}\n\nDraft so far:\n${body}`;
        model = "engagera-lite";
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

    const response = await fetch(ENGAGERA_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ENGAGERA_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return jsonResponse({ error: "Rate limit exceeded. Please try again in a moment." });
      }
      if (response.status === 401 || response.status === 403) {
        return jsonResponse({ error: "Engagera authentication failed. Please check the API key." });
      }
      if (response.status === 402) {
        return jsonResponse({
          error: "AI credits are exhausted. Please add credits to your Engagera account, then try again.",
          billingRequired: true,
        });
      }
      const errText = await response.text();
      console.error("Engagera error:", response.status, errText);
      return jsonResponse({
        error: "AI assistant is temporarily unavailable. Please try again shortly.",
        fallback: response.status >= 500,
      });
    }

    const data = await response.json();
    // Engagera returns { message: { role, content }, model, usage, ... }
    const content: string =
      data?.message?.content ??
      data?.choices?.[0]?.message?.content ??
      "";

    if (action === "smart_reply") {
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        const suggestions = jsonMatch ? JSON.parse(jsonMatch[0]) : [content];
        return jsonResponse({ suggestions });
      } catch {
        return jsonResponse({ suggestions: [content] });
      }
    }

    return jsonResponse({ result: content });
  } catch (e) {
    console.error("ai-email-assist error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" });
  }
});

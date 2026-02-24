import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useAIEmailAssist() {
  const [loading, setLoading] = useState(false);
  const [autocompleteText, setAutocompleteText] = useState("");
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const { toast } = useToast();
  const abortRef = useRef<AbortController | null>(null);

  const callAI = useCallback(
    async (payload: Record<string, string>) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("ai-email-assist", {
          body: payload,
        });
        if (controller.signal.aborted) return null;
        if (error) throw error;
        if (data?.error) {
          toast({
            title: "AI Assistant",
            description: data.error,
            variant: "destructive",
          });
          return null;
        }
        return data;
      } catch (err: any) {
        if (controller.signal.aborted) return null;
        toast({
          title: "AI error",
          description: err.message || "Something went wrong",
          variant: "destructive",
        });
        return null;
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [toast]
  );

  const getAutocomplete = useCallback(
    async (body: string, subject: string) => {
      if (!body || body.length < 10) {
        setAutocompleteText("");
        return;
      }
      const data = await callAI({ action: "autocomplete", body, subject });
      if (data?.result) setAutocompleteText(data.result);
    },
    [callAI]
  );

  const getSmartReplies = useCallback(
    async (emailBody: string, subject: string, from: string) => {
      setSmartReplies([]);
      const data = await callAI({
        action: "smart_reply",
        reply_to_body: emailBody,
        subject,
        context: from,
      });
      if (data?.suggestions) setSmartReplies(data.suggestions.slice(0, 3));
    },
    [callAI]
  );

  const improveTone = useCallback(
    async (body: string) => {
      const data = await callAI({ action: "improve_tone", body });
      return data?.result || null;
    },
    [callAI]
  );

  const fixGrammar = useCallback(
    async (body: string) => {
      const data = await callAI({ action: "fix_grammar", body });
      return data?.result || null;
    },
    [callAI]
  );

  const makeShorter = useCallback(
    async (body: string) => {
      const data = await callAI({ action: "make_shorter", body });
      return data?.result || null;
    },
    [callAI]
  );

  const makeLonger = useCallback(
    async (body: string) => {
      const data = await callAI({ action: "make_longer", body });
      return data?.result || null;
    },
    [callAI]
  );

  const clearAutocomplete = useCallback(() => setAutocompleteText(""), []);

  return {
    loading,
    autocompleteText,
    smartReplies,
    getAutocomplete,
    getSmartReplies,
    improveTone,
    fixGrammar,
    makeShorter,
    makeLonger,
    clearAutocomplete,
  };
}

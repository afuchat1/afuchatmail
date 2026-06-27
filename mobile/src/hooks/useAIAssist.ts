import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface AIAssistResult {
  loading: boolean;
  smartReplies: string[];
  autocompleteText: string;
  getSmartReplies: (emailBody: string, subject: string) => Promise<void>;
  getAutocomplete: (body: string, subject: string) => Promise<void>;
  improveTone: (text: string) => Promise<string | null>;
  fixGrammar: (text: string) => Promise<string | null>;
  makeShorter: (text: string) => Promise<string | null>;
  makeLonger: (text: string) => Promise<string | null>;
  clearAutocomplete: () => void;
  clearSmartReplies: () => void;
}

async function callAI(action: string, content: string, subject?: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-email-assist', {
      body: { action, content, subject: subject ?? '' },
    });
    if (error) return null;
    return data?.result ?? data?.text ?? null;
  } catch {
    return null;
  }
}

export function useAIAssist(): AIAssistResult {
  const [loading, setLoading] = useState(false);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [autocompleteText, setAutocompleteText] = useState('');

  const getSmartReplies = useCallback(async (emailBody: string, subject: string) => {
    setLoading(true);
    try {
      const result = await callAI('smart_replies', emailBody, subject);
      if (result) {
        const replies = result.split('\n').filter((l: string) => l.trim()).slice(0, 3);
        setSmartReplies(replies);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const getAutocomplete = useCallback(async (body: string, subject: string) => {
    try {
      const result = await callAI('autocomplete', body, subject);
      if (result) setAutocompleteText(result.trim());
    } catch {}
  }, []);

  const improveTone = useCallback(async (text: string): Promise<string | null> => {
    setLoading(true);
    try { return await callAI('improve_tone', text); }
    finally { setLoading(false); }
  }, []);

  const fixGrammar = useCallback(async (text: string): Promise<string | null> => {
    setLoading(true);
    try { return await callAI('fix_grammar', text); }
    finally { setLoading(false); }
  }, []);

  const makeShorter = useCallback(async (text: string): Promise<string | null> => {
    setLoading(true);
    try { return await callAI('make_shorter', text); }
    finally { setLoading(false); }
  }, []);

  const makeLonger = useCallback(async (text: string): Promise<string | null> => {
    setLoading(true);
    try { return await callAI('make_longer', text); }
    finally { setLoading(false); }
  }, []);

  const clearAutocomplete = useCallback(() => setAutocompleteText(''), []);
  const clearSmartReplies = useCallback(() => setSmartReplies([]), []);

  return {
    loading, smartReplies, autocompleteText,
    getSmartReplies, getAutocomplete,
    improveTone, fixGrammar, makeShorter, makeLonger,
    clearAutocomplete, clearSmartReplies,
  };
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Email, Folder } from '../types';

export function useFolders(userId: string | undefined) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('folders')
      .select('*')
      .eq('user_id', userId)
      .then(({ data }) => {
        setFolders(data ?? []);
        setLoading(false);
      });
  }, [userId]);

  return { folders, loading };
}

export function useEmails(userId: string | undefined, folderId: string | undefined) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    if (!userId || !folderId) return;
    const { data } = await supabase
      .from('emails')
      .select('*')
      .eq('user_id', userId)
      .eq('folder_id', folderId)
      .is('deleted_at', null)
      .order('received_at', { ascending: false, nullsFirst: false })
      .limit(50);
    setEmails(data ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [userId, folderId]);

  useEffect(() => { fetch(); }, [fetch]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    fetch();
  }, [fetch]);

  const markRead = useCallback(async (emailId: string) => {
    await supabase.from('emails').update({ is_read: true }).eq('id', emailId);
    setEmails(prev => prev.map(e => e.id === emailId ? { ...e, is_read: true } : e));
  }, []);

  const toggleStar = useCallback(async (emailId: string, current: boolean) => {
    await supabase.from('emails').update({ is_starred: !current }).eq('id', emailId);
    setEmails(prev => prev.map(e => e.id === emailId ? { ...e, is_starred: !current } : e));
  }, []);

  const moveToTrash = useCallback(async (emailId: string, trashFolderId: string) => {
    await supabase.from('emails')
      .update({ folder_id: trashFolderId, deleted_at: new Date().toISOString() })
      .eq('id', emailId);
    setEmails(prev => prev.filter(e => e.id !== emailId));
  }, []);

  return { emails, loading, refreshing, refresh, markRead, toggleStar, moveToTrash };
}

export function useEmail(emailId: string | undefined) {
  const [email, setEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!emailId) return;
    supabase.from('emails').select('*').eq('id', emailId).single()
      .then(({ data }) => {
        setEmail(data);
        setLoading(false);
      });
  }, [emailId]);

  return { email, loading };
}

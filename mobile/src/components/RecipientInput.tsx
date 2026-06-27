import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, TextInput, FlatList, Text, TouchableOpacity,
  StyleSheet, Image, ViewStyle,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/colors';

interface Contact {
  email: string;
  name?: string;
  avatar_url?: string;
  initial: string;
  bgColor: string;
}

const AVATAR_COLORS = [
  '#EA4335', '#FF6D00', '#FBBC04', '#34A853',
  '#00BCD4', '#1A73E8', '#9C27B0', '#E91E63',
];
function colorFor(email: string): string {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function parseAddr(s: string): { name?: string; email: string } {
  const m = s.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim() || undefined, email: m[2].trim().toLowerCase() };
  return { email: s.trim().toLowerCase() };
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}

// Same logic as website's RecipientAutocomplete.tsx
export function RecipientInput({ value, onChange, placeholder, style }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Load contacts from email history (same as website)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('emails')
          .select('from_address, to_addresses, cc_addresses')
          .eq('user_id', user.id)
          .order('received_at', { ascending: false })
          .limit(500);

        const map = new Map<string, Contact>();
        for (const row of data ?? []) {
          const add = (raw: string) => {
            if (!raw) return;
            const { email, name } = parseAddr(raw);
            if (!email || map.has(email)) return;
            map.set(email, {
              email, name,
              initial: (name || email)[0]?.toUpperCase() ?? '?',
              bgColor: colorFor(email),
            });
          };
          add(row.from_address as string);
          (row.to_addresses as string[] | null)?.forEach(add);
          ((row as any).cc_addresses as string[] | null)?.forEach(add);
        }

        // Augment with AfuChat avatars (same as website)
        const emails = Array.from(map.keys());
        if (emails.length > 0) {
          const { data: addrs } = await supabase
            .from('email_addresses').select('full_email, user_id').in('full_email', emails);
          const userIds = [...new Set((addrs ?? []).map(a => a.user_id).filter(Boolean))];
          if (userIds.length > 0) {
            const { data: profs } = await supabase
              .from('profiles').select('id, full_name, avatar_url').in('id', userIds);
            const profById = new Map((profs ?? []).map(p => [p.id, p]));
            for (const a of addrs ?? []) {
              const p = a.user_id ? profById.get(a.user_id) : undefined;
              const c = map.get((a.full_email ?? '').toLowerCase());
              if (c && p) {
                if ((p as any).avatar_url) c.avatar_url = (p as any).avatar_url;
                if (!c.name && (p as any).full_name) c.name = (p as any).full_name;
              }
            }
          }
        }
        if (!cancelled) setContacts(Array.from(map.values()));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // Get current token being typed (after last comma)
  const { tokens, prefix } = useMemo(() => {
    const lastComma = value.lastIndexOf(',');
    const before = lastComma >= 0 ? value.slice(0, lastComma + 1) : '';
    const cur = lastComma >= 0 ? value.slice(lastComma + 1) : value;
    return { tokens: before, prefix: cur.trim().toLowerCase() };
  }, [value]);

  const suggestions = useMemo(() => {
    if (!prefix || prefix.length < 1) return [];
    const existing = new Set(tokens.split(',').map(s => parseAddr(s).email).filter(Boolean));
    return contacts
      .filter(c => !existing.has(c.email))
      .filter(c => c.email.includes(prefix) || (c.name?.toLowerCase().includes(prefix) ?? false))
      .slice(0, 6);
  }, [contacts, prefix, tokens]);

  const choose = (c: Contact) => {
    const formatted = c.name ? `${c.name} <${c.email}>` : c.email;
    const sep = tokens && !tokens.endsWith(' ') ? ' ' : '';
    onChange(`${tokens}${sep}${formatted}, `);
    setShowDropdown(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <View style={[styles.wrap, style]}>
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={v => { onChange(v); setShowDropdown(true); }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        placeholder={placeholder}
        placeholderTextColor={colors.textHint}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />
      {showDropdown && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={c => c.email}
            scrollEnabled={false}
            renderItem={({ item: c }) => (
              <TouchableOpacity style={styles.suggestion} onPress={() => choose(c)}>
                {c.avatar_url ? (
                  <Image source={{ uri: c.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: c.bgColor }]}>
                    <Text style={styles.avatarText}>{c.initial}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionName} numberOfLines={1}>
                    {c.name ?? c.email}
                  </Text>
                  {c.name && (
                    <Text style={styles.suggestionEmail} numberOfLines={1}>{c.email}</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', zIndex: 100 },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    padding: 0,
    minHeight: 40,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: -16,
    right: -16,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 16,
    zIndex: 999,
    overflow: 'hidden',
  },
  suggestion: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  avatar: {
    width: 34, height: 34, borderRadius: 17, flexShrink: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  suggestionName: { fontSize: 14, fontWeight: '600', color: colors.text },
  suggestionEmail: { fontSize: 12, color: colors.textFaint },
});

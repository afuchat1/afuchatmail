import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, StatusBar, Share, Alert, TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useEmail } from '../hooks/useEmails';
import { colors } from '../lib/colors';
import { RootStackParamList } from '../types';

type Route = RouteProp<RootStackParamList, 'EmailDetail'>;

function getInitials(from: string): string {
  const name = from.split('<')[0].trim().replace(/"/g, '');
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name[0] ?? '?').toUpperCase();
}

const avatarColors = ['#6366F1', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'];
function getAvatarColor(from: string): string {
  let sum = 0;
  for (let i = 0; i < from.length; i++) sum += from.charCodeAt(i);
  return avatarColors[sum % avatarColors.length];
}

export default function EmailDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { emailId } = route.params;
  const { email, loading } = useEmail(emailId);
  const [starred, setStarred] = useState(false);

  useEffect(() => {
    if (email) {
      setStarred(email.is_starred);
      if (!email.is_read) {
        supabase.from('emails').update({ is_read: true }).eq('id', emailId);
      }
    }
  }, [email, emailId]);

  const toggleStar = async () => {
    const next = !starred;
    setStarred(next);
    await supabase.from('emails').update({ is_starred: next }).eq('id', emailId);
  };

  const handleShare = async () => {
    if (!email) return;
    await Share.share({ message: `${email.subject}\n\n${email.body_text ?? ''}` });
  };

  const handleReply = () => {
    if (!email) return;
    (navigation as any).navigate('Compose', { replyTo: email });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!email) {
    return (
      <View style={styles.center}>
        <Ionicons name="mail-unread-outline" size={48} color={colors.textFaint} />
        <Text style={styles.errorText}>Email not found.</Text>
      </View>
    );
  }

  const fromName =
    email.from_address.split('<')[0].trim().replace(/"/g, '') || email.from_address;
  const initials = getInitials(email.from_address);
  const avatarColor = getAvatarColor(email.from_address);
  const dateStr = email.received_at
    ? format(new Date(email.received_at), 'EEE, MMM d, yyyy · h:mm a')
    : '';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
          <Text style={styles.backLabel}>Inbox</Text>
        </TouchableOpacity>
        <View style={styles.navActions}>
          <TouchableOpacity style={styles.navIconBtn} onPress={toggleStar}>
            <Ionicons
              name={starred ? 'star' : 'star-outline'}
              size={22}
              color={starred ? colors.starred : colors.textFaint}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navIconBtn}>
            <Ionicons name="archive-outline" size={21} color={colors.textFaint} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navIconBtn}>
            <Ionicons name="trash-outline" size={21} color={colors.textFaint} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navIconBtn} onPress={handleShare}>
            <Ionicons name="ellipsis-horizontal" size={21} color={colors.textFaint} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Subject */}
        <Text style={styles.subject}>{email.subject || '(no subject)'}</Text>

        {/* Sender card */}
        <View style={styles.senderCard}>
          <View style={[styles.senderAvatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.senderInitials}>{initials}</Text>
          </View>
          <View style={styles.senderInfo}>
            <Text style={styles.senderName}>{fromName}</Text>
            <Text style={styles.senderMeta}>to me · {dateStr}</Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={colors.textFaint} />
        </View>

        {/* Recipients detail */}
        {email.to_addresses && email.to_addresses.length > 0 && (
          <View style={styles.metaCard}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>To</Text>
              <Text style={styles.metaValue}>{email.to_addresses.join(', ')}</Text>
            </View>
            {email.cc_addresses && email.cc_addresses.length > 0 && (
              <>
                <View style={styles.metaDivider} />
                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>CC</Text>
                  <Text style={styles.metaValue}>{email.cc_addresses.join(', ')}</Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Body */}
        <View style={styles.bodyCard}>
          <Text style={styles.body}>{email.body_text || '(No content)'}</Text>
        </View>

        {/* Attachments */}
        {email.attachments && email.attachments.length > 0 && (
          <View style={styles.attachCard}>
            <Text style={styles.attachTitle}>
              Attachments ({email.attachments.length})
            </Text>
            {email.attachments.map((att, i) => (
              <TouchableOpacity key={i} style={[styles.attachRow, i > 0 && styles.attachRowBorder]}>
                <View style={styles.attachIcon}>
                  <Ionicons name="document-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.attachName}>{att.name}</Text>
                  <Text style={styles.attachSize}>
                    {att.size ? `${(att.size / 1024).toFixed(1)} KB` : 'PDF'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Reply / Forward */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleReply}>
            <Ionicons name="arrow-undo-outline" size={17} color={colors.textMuted} />
            <Text style={styles.actionBtnText}>Reply</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="arrow-redo-outline" size={17} color={colors.textMuted} />
            <Text style={styles.actionBtnText}>Forward</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Inline reply bar */}
      <View style={styles.replyBar}>
        <View style={[styles.replyAvatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.replyAvatarText}>A</Text>
        </View>
        <TouchableOpacity style={styles.replyInput} onPress={handleReply}>
          <Text style={styles.replyPlaceholder}>Reply to {fromName}…</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sendBtn} onPress={handleReply}>
          <Ionicons name="send" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    gap: 12,
  },
  errorText: { color: colors.textFaint, fontSize: 16 },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: colors.bg,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 6 },
  backLabel: { color: colors.primary, fontSize: 16, fontWeight: '500' },
  navActions: { flexDirection: 'row', gap: 2 },
  navIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },

  subject: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
    lineHeight: 28,
    marginBottom: 14,
  },

  senderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  senderAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  senderInitials: { color: '#fff', fontWeight: '700', fontSize: 16 },
  senderInfo: { flex: 1 },
  senderName: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 },
  senderMeta: { fontSize: 12, color: colors.textDim },

  metaCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  metaRow: { flexDirection: 'row', padding: 12, alignItems: 'flex-start', gap: 12 },
  metaLabel: { color: colors.textFaint, width: 28, fontSize: 13, fontWeight: '600', paddingTop: 1 },
  metaValue: { color: colors.textDim, flex: 1, fontSize: 13, lineHeight: 18 },
  metaDivider: { height: 1, backgroundColor: colors.borderLight, marginHorizontal: 12 },

  bodyCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  body: { fontSize: 15, color: colors.textMuted, lineHeight: 24 },

  attachCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  attachTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textDim,
    padding: 14,
    paddingBottom: 8,
    letterSpacing: 0.3,
  },
  attachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingTop: 10,
    gap: 12,
  },
  attachRowBorder: { borderTopWidth: 1, borderTopColor: colors.borderLight },
  attachIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachName: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 2 },
  attachSize: { fontSize: 12, color: colors.textFaint },

  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  actionBtnText: { color: colors.textMuted, fontWeight: '600', fontSize: 15 },

  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  replyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  replyAvatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  replyInput: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  replyPlaceholder: { color: colors.textFaint, fontSize: 14 },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});

import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, StatusBar, Share, Alert, Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useEmail, useThreadEmails } from '../hooks/useEmails';
import { useAuth } from '../hooks/useAuth';
import { useAIAssist } from '../hooks/useAIAssist';
import { SnoozeModal } from '../components/SnoozeModal';
import { colors } from '../lib/colors';
import { RootStackParamList, Email, Attachment } from '../types';

type Route = RouteProp<RootStackParamList, 'EmailDetail'>;

// ─── Helpers (same as EmailViewer.tsx) ───────────────────────────────────

const parseFromAddress = (raw: string): { name: string; email: string } => {
  if (!raw) return { name: '', email: '' };
  const match = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  const email = raw.trim();
  const local = email.split('@')[0] || email;
  return { name: local, email };
};

const avatarColors = [
  '#1A73E8', '#EA4335', '#34A853', '#FBBC04',
  '#9C27B0', '#FF6D00', '#00BCD4', '#E91E63',
];
function getAvatarColor(from: string): string {
  let sum = 0;
  for (let i = 0; i < from.length; i++) sum += from.charCodeAt(i);
  return avatarColors[sum % avatarColors.length];
}

function normalizeAttachments(raw: unknown): Attachment[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(a => a?.name) as Attachment[];
  if (typeof raw === 'string') {
    try { return normalizeAttachments(JSON.parse(raw)); } catch { return []; }
  }
  return [];
}

const FILE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  pdf: 'document-text',
  doc: 'document', docx: 'document',
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image',
  mp4: 'videocam', mp3: 'musical-note',
  zip: 'archive', xlsx: 'grid', xls: 'grid',
};
function getFileIcon(name: string): keyof typeof Ionicons.glyphMap {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return FILE_ICONS[ext] ?? 'document-outline';
}

// ─── Single email bubble ──────────────────────────────────────────────────

interface EmailBubbleProps {
  email: Email;
  expanded: boolean;
  isLast: boolean;
  onToggle: () => void;
  onStar: () => void;
  onReply: () => void;
  onSnooze: () => void;
}

function EmailBubble({ email, expanded, isLast, onToggle, onStar, onReply, onSnooze }: EmailBubbleProps) {
  const { name, email: fromEmail } = parseFromAddress(email.from_address);
  const avatarColor = getAvatarColor(email.from_address);
  const initials = (name?.[0] || fromEmail?.[0] || '?').toUpperCase();
  const attachments = normalizeAttachments(email.attachments);

  const dateStr = email.received_at
    ? format(new Date(email.received_at), 'EEE, MMM d · h:mm a')
    : email.created_at
      ? format(new Date(email.created_at), 'EEE, MMM d · h:mm a')
      : '';

  const relativeDate = email.received_at || email.created_at
    ? formatDistanceToNow(new Date(email.received_at || email.created_at!), { addSuffix: true })
    : '';

  return (
    <View style={styles.bubble}>
      <TouchableOpacity style={styles.bubbleSenderRow} onPress={onToggle} activeOpacity={0.7}>
        <View style={[styles.bubbleAvatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.bubbleAvatarText}>{initials}</Text>
        </View>
        <View style={styles.bubbleSenderInfo}>
          <Text style={styles.bubbleSenderName}>{name || fromEmail}</Text>
          {!expanded && (
            <Text style={styles.bubblePreview} numberOfLines={1}>
              {(email.body_text ?? '').replace(/\s+/g, ' ').trim()}
            </Text>
          )}
          {expanded && <Text style={styles.bubbleSenderEmail}>{dateStr}</Text>}
        </View>
        <View style={styles.bubbleMetaRight}>
          {!expanded && <Text style={styles.bubbleRelDate}>{relativeDate}</Text>}
          <TouchableOpacity onPress={onStar} style={styles.bubbleIconBtn}>
            <Ionicons
              name={email.is_starred ? 'star' : 'star-outline'}
              size={18}
              color={email.is_starred ? colors.starred : colors.textHint}
            />
          </TouchableOpacity>
          {expanded && (
            <>
              <TouchableOpacity onPress={onSnooze} style={styles.bubbleIconBtn}>
                <Ionicons name="alarm-outline" size={18} color={colors.textHint} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onReply} style={styles.bubbleIconBtn}>
                <Ionicons name="arrow-undo-outline" size={18} color={colors.textDim} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>

      {/* Body — only when expanded */}
      {expanded && (
        <>
          <View style={styles.bubbleBody}>
            <Text style={styles.bubbleBodyText}>{email.body_text || '(No content)'}</Text>
          </View>

          {/* Attachments (same as EmailViewer attachment rendering + download) */}
          {attachments.length > 0 && (
            <View style={styles.bubbleAttachments}>
              <View style={styles.attachDivider} />
              <Text style={styles.attachTitle}>
                {attachments.length} Attachment{attachments.length !== 1 ? 's' : ''}
              </Text>
              {attachments.map((att, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.attachRow}
                  onPress={() => handleDownloadAttachment(att)}
                  activeOpacity={0.7}
                >
                  <View style={styles.attachIconWrap}>
                    <Ionicons name={getFileIcon(att.name)} size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.attachName} numberOfLines={1}>{att.name}</Text>
                    {att.size > 0 && (
                      <Text style={styles.attachSize}>{(att.size / 1024).toFixed(0)} KB</Text>
                    )}
                  </View>
                  <Ionicons name="download-outline" size={16} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {isLast && (
            <View style={styles.bubbleActions}>
              <TouchableOpacity style={styles.bubbleActionBtn} onPress={onReply}>
                <Ionicons name="arrow-undo-outline" size={16} color={colors.primary} />
                <Text style={styles.bubbleActionText}>Reply</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
}

// Same as EmailViewer.handleDownloadAttachment - download from Supabase Storage
async function handleDownloadAttachment(att: Attachment) {
  if (!att.path) { Alert.alert('Error', 'Attachment path is missing.'); return; }
  try {
    const { data, error } = await supabase.storage.from('email-attachments').download(att.path);
    if (error) throw error;
    Alert.alert('Downloaded', `${att.name} saved successfully.`);
  } catch (e: any) {
    Alert.alert('Download failed', e?.message);
  }
}

// ─── EmailDetailScreen ────────────────────────────────────────────────────

export default function EmailDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<Route>();
  const { emailId } = route.params;
  const { user } = useAuth();

  const { email, loading } = useEmail(emailId);
  const { threadEmails, loadingThread } = useThreadEmails(email);

  const { loading: aiLoading, smartReplies, getSmartReplies, clearSmartReplies } = useAIAssist();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set([emailId]));
  const [isTrash, setIsTrash] = useState(false);
  const [showSnooze, setShowSnooze] = useState(false);
  const [snoozeEmailId, setSnoozeEmailId] = useState<string>(emailId);
  const [smartRepliesLoaded, setSmartRepliesLoaded] = useState(false);

  // Auto-expand latest email in thread
  useEffect(() => {
    if (threadEmails.length > 0) {
      const latest = threadEmails[threadEmails.length - 1];
      setExpandedIds(new Set([latest.id]));

      // Load AI smart replies for latest email (same as EmailViewer)
      if (!smartRepliesLoaded && latest.body_text) {
        setSmartRepliesLoaded(true);
        getSmartReplies(latest.body_text, latest.subject || '');
      }
    }
  }, [threadEmails]);

  // Mark as read on open
  useEffect(() => {
    if (email && !email.is_read) {
      supabase.from('emails').update({ is_read: true }).eq('id', emailId);
    }
  }, [email, emailId]);

  // Check if in trash
  useEffect(() => {
    if (!email?.folder_id || !user) return;
    supabase.from('folders').select('type').eq('id', email.folder_id).single()
      .then(({ data }) => setIsTrash(data?.type === 'trash'));
  }, [email?.folder_id, user]);

  const toggleStar = async (e: Email) => {
    await supabase.from('emails').update({ is_starred: !e.is_starred }).eq('id', e.id);
  };

  const handleDelete = async () => {
    if (!user || !email) return;
    if (isTrash) {
      Alert.alert('Delete permanently?', 'This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('emails').delete().eq('id', email.id);
          navigation.goBack();
        }},
      ]);
    } else {
      const { data: trashFolder } = await supabase
        .from('folders').select('id').eq('user_id', user.id).eq('type', 'trash').single();
      if (!trashFolder) return;
      await supabase.from('emails').update({
        folder_id: trashFolder.id,
        original_folder_id: email.folder_id,
        deleted_at: new Date().toISOString(),
      }).eq('id', email.id);
      navigation.goBack();
    }
  };

  const handleRestore = async () => {
    if (!user || !email) return;
    const targetFolderId = email.original_folder_id ?? (
      await supabase.from('folders').select('id').eq('user_id', user.id).eq('type', 'inbox').single()
        .then(({ data }) => data?.id)
    );
    if (!targetFolderId) return;
    await supabase.from('emails').update({
      folder_id: targetFolderId, deleted_at: null, original_folder_id: null,
    }).eq('id', email.id);
    navigation.goBack();
  };

  const handleReply = (e: Email) => {
    navigation.navigate('Compose', {
      replyTo: { ...e, subject: e.subject?.startsWith('Re:') ? e.subject : `Re: ${e.subject ?? ''}` } as any,
    });
  };

  const handleShare = async () => {
    if (!email) return;
    await Share.share({ message: `${email.subject}\n\n${email.body_text ?? ''}` });
  };

  const handleSmartReply = (replyText: string) => {
    if (!email) return;
    navigation.navigate('Compose', {
      replyTo: { ...email, subject: `Re: ${email.subject}` } as any,
      initialBody: replyText,
    } as any);
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
        <Ionicons name="mail-unread-outline" size={56} color={colors.textHint} />
        <Text style={styles.errorText}>Email not found</Text>
      </View>
    );
  }

  const displayEmails = threadEmails.length > 0 ? threadEmails : [email];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgCard} />

      {/* Top action bar — matches EmailViewer: snooze, star, reply, restore, delete */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topBarBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textDim} />
        </TouchableOpacity>
        <View style={styles.topBarActions}>
          {/* Snooze (same as EmailViewer Clock button) */}
          <TouchableOpacity style={styles.topBarBtn} onPress={() => { setSnoozeEmailId(emailId); setShowSnooze(true); }}>
            <Ionicons name="alarm-outline" size={22} color={colors.textDim} />
          </TouchableOpacity>
          {/* Star */}
          <TouchableOpacity style={styles.topBarBtn} onPress={() => toggleStar(email)}>
            <Ionicons
              name={email.is_starred ? 'star' : 'star-outline'}
              size={22}
              color={email.is_starred ? colors.starred : colors.textDim}
            />
          </TouchableOpacity>
          {/* Restore (shown if in trash, same as EmailViewer) */}
          {isTrash && (
            <TouchableOpacity style={styles.topBarBtn} onPress={handleRestore}>
              <Ionicons name="arrow-undo-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          )}
          {/* Reply (only if not in trash) */}
          {!isTrash && (
            <TouchableOpacity style={styles.topBarBtn} onPress={() => handleReply(email)}>
              <Ionicons name="arrow-undo-outline" size={22} color={colors.textDim} />
            </TouchableOpacity>
          )}
          {/* Delete */}
          <TouchableOpacity
            style={styles.topBarBtn}
            onPress={handleDelete}
          >
            <Ionicons
              name="trash-outline"
              size={22}
              color={isTrash ? colors.danger : colors.textDim}
            />
          </TouchableOpacity>
          {/* More */}
          <TouchableOpacity style={styles.topBarBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color={colors.textDim} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Subject */}
        <View style={styles.subjectRow}>
          <Text style={styles.subject}>{email.subject || '(no subject)'}</Text>
          {email.is_important && (
            <View style={styles.importantBadge}>
              <Ionicons name="bookmark" size={12} color="#fff" />
            </View>
          )}
          {email.snoozed_until && new Date(email.snoozed_until) > new Date() && (
            <View style={styles.snoozedBadge}>
              <Ionicons name="alarm-outline" size={12} color={colors.primary} />
              <Text style={styles.snoozedBadgeText}>
                Snoozed until {format(new Date(email.snoozed_until), 'EEE h:mm a')}
              </Text>
            </View>
          )}
        </View>

        {/* Trash notice (same as EmailViewer) */}
        {isTrash && (
          <View style={styles.trashNotice}>
            <Ionicons name="trash-outline" size={14} color="#92400E" />
            <Text style={styles.trashNoticeText}>
              This email is in the trash.{' '}
              <Text style={styles.trashRestoreLink} onPress={handleRestore}>Restore it</Text>
            </Text>
          </View>
        )}

        {/* Thread emails */}
        {loadingThread && displayEmails.length <= 1 ? (
          <View style={{ padding: 16, alignItems: 'center' }}>
            <ActivityIndicator color={colors.primary} size="small" />
          </View>
        ) : (
          <View style={styles.threadContainer}>
            {displayEmails.map((e, idx) => (
              <EmailBubble
                key={e.id}
                email={e}
                expanded={expandedIds.has(e.id)}
                isLast={idx === displayEmails.length - 1}
                onToggle={() => {
                  setExpandedIds(prev => {
                    const next = new Set(prev);
                    if (next.has(e.id)) next.delete(e.id); else next.add(e.id);
                    return next;
                  });
                }}
                onStar={() => toggleStar(e)}
                onReply={() => handleReply(e)}
                onSnooze={() => { setSnoozeEmailId(e.id); setShowSnooze(true); }}
              />
            ))}
          </View>
        )}

        {/* AI Smart replies (same as EmailViewer smart reply chips) */}
        {smartReplies.length > 0 && (
          <View style={styles.smartRepliesSection}>
            <View style={styles.smartRepliesHeader}>
              <Ionicons name="sparkles" size={14} color={colors.primary} />
              <Text style={styles.smartRepliesTitle}>Smart replies</Text>
              {aiLoading && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 6 }} />}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.smartRepliesScroll}>
              {smartReplies.map((reply, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.smartReplyChip}
                  onPress={() => handleSmartReply(reply)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.smartReplyText} numberOfLines={2}>{reply}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* AI loading placeholder */}
        {aiLoading && smartReplies.length === 0 && (
          <View style={styles.smartRepliesLoading}>
            <Ionicons name="sparkles" size={14} color={colors.primary} />
            <Text style={styles.smartRepliesLoadingText}>Generating smart replies…</Text>
          </View>
        )}

        {/* Reply / Forward bottom buttons */}
        <View style={styles.bottomActions}>
          <TouchableOpacity style={styles.bottomActionBtn} onPress={() => handleReply(email)}>
            <Ionicons name="arrow-undo-outline" size={18} color={colors.primary} />
            <Text style={styles.bottomActionText}>Reply</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.bottomActionBtn, { borderColor: colors.border }]}
            onPress={() => navigation.navigate('Compose', {
              replyTo: { ...email, subject: `Fwd: ${email.subject}`, from_address: '' } as any,
            })}
          >
            <Ionicons name="arrow-redo-outline" size={18} color={colors.textDim} />
            <Text style={[styles.bottomActionText, { color: colors.textDim }]}>Forward</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Snooze modal (same as SnoozeDialog) */}
      <SnoozeModal
        visible={showSnooze}
        onClose={() => setShowSnooze(false)}
        emailId={snoozeEmailId}
        onSnooze={() => navigation.goBack()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, gap: 12 },
  errorText: { color: colors.textFaint, fontSize: 16 },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: Platform.OS === 'ios' ? 50 : 8,
    paddingBottom: 4,
    backgroundColor: colors.bgCard, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  topBarBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  topBarActions: { flexDirection: 'row' },

  scroll: { flex: 1 },

  subjectRow: {
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, gap: 8,
  },
  subject: { fontSize: 20, fontWeight: '700', color: colors.text, lineHeight: 28, letterSpacing: -0.3 },
  importantBadge: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center',
  },
  snoozedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.primaryLight, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4, marginTop: 4, alignSelf: 'flex-start',
  },
  snoozedBadgeText: { fontSize: 11, color: colors.primary, fontWeight: '600' },

  trashNotice: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#FEF3C7', borderRadius: 8, padding: 10,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  trashNoticeText: { fontSize: 13, color: '#92400E', flex: 1 },
  trashRestoreLink: { fontWeight: '700', textDecorationLine: 'underline' },

  threadContainer: { paddingHorizontal: 12, gap: 4, paddingBottom: 8 },

  bubble: {
    backgroundColor: colors.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  bubbleSenderRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 10 },
  bubbleAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bubbleAvatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  bubbleSenderInfo: { flex: 1 },
  bubbleSenderName: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  bubbleSenderEmail: { fontSize: 12, color: colors.textFaint },
  bubblePreview: { fontSize: 13, color: colors.textFaint },
  bubbleMetaRight: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 0 },
  bubbleRelDate: { fontSize: 11, color: colors.textFaint },
  bubbleIconBtn: { padding: 4 },

  bubbleBody: { paddingHorizontal: 14, paddingBottom: 14 },
  bubbleBodyText: { fontSize: 14, color: colors.textMuted, lineHeight: 24, letterSpacing: 0.1 },

  bubbleAttachments: { paddingHorizontal: 14, paddingBottom: 14 },
  attachDivider: { height: 1, backgroundColor: colors.border, marginBottom: 10 },
  attachTitle: { fontSize: 12, fontWeight: '600', color: colors.textDim, marginBottom: 8 },
  attachRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.bgSection, borderRadius: 8, padding: 10, marginBottom: 4,
    borderWidth: 1, borderColor: colors.border,
  },
  attachIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  attachName: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 1 },
  attachSize: { fontSize: 11, color: colors.textFaint },

  bubbleActions: { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 4 },
  bubbleActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: colors.primary,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'flex-start',
  },
  bubbleActionText: { color: colors.primary, fontWeight: '600', fontSize: 14 },

  smartRepliesSection: {
    paddingHorizontal: 12, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: colors.border,
    gap: 10,
  },
  smartRepliesHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  smartRepliesTitle: { fontSize: 12, fontWeight: '700', color: colors.textDim, textTransform: 'uppercase', letterSpacing: 0.5 },
  smartRepliesScroll: { gap: 8, paddingBottom: 4 },
  smartReplyChip: {
    backgroundColor: colors.bgCard, borderRadius: 16,
    borderWidth: 1, borderColor: colors.primary + '60',
    paddingHorizontal: 14, paddingVertical: 10, maxWidth: 220,
  },
  smartReplyText: { fontSize: 13, color: colors.primary, fontWeight: '500', lineHeight: 18 },

  smartRepliesLoading: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  smartRepliesLoadingText: { fontSize: 13, color: colors.textFaint, fontStyle: 'italic' },

  bottomActions: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 12, paddingTop: 8, paddingBottom: 4,
  },
  bottomActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13, borderRadius: 24,
    borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.bgCard,
  },
  bottomActionText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
});

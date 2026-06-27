import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, StatusBar, Modal, FlatList,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useEmailAddresses } from '../hooks/useEmails';
import { useAIAssist } from '../hooks/useAIAssist';
import { RecipientInput } from '../components/RecipientInput';
import { colors } from '../lib/colors';
import { RootStackParamList, Email } from '../types';

type Route = RouteProp<RootStackParamList, 'Compose'>;

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_text: string;
  category: string | null;
}

// Same as EmailComposer.tsx: build a quoted reply body
function buildReplyBody(original: Email): string {
  const date = original.received_at || original.created_at || '';
  const dateStr = date ? new Date(date).toLocaleString() : '';
  const header = `\n\n\n— On ${dateStr}, ${original.from_address} wrote:`;
  const body = (original.body_text ?? '').split('\n').map((l: string) => `> ${l}`).join('\n');
  return header + '\n' + body;
}

const AI_ACTIONS: { key: 'improve_tone' | 'fix_grammar' | 'make_shorter' | 'make_longer'; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'improve_tone', label: 'Improve tone',  icon: 'sparkles-outline' },
  { key: 'fix_grammar',  label: 'Fix grammar',   icon: 'checkmark-circle-outline' },
  { key: 'make_shorter', label: 'Shorter',        icon: 'resize-outline' },
  { key: 'make_longer',  label: 'Longer',         icon: 'expand-outline' },
];

export default function ComposeScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { user } = useAuth();
  const replyTo = route.params?.replyTo;

  const { addresses } = useEmailAddresses(user?.id);
  const { loading: aiLoading, autocompleteText, getAutocomplete, improveTone, fixGrammar, makeShorter, makeLonger, clearAutocomplete } = useAIAssist();

  const [fromAddressId, setFromAddressId] = useState<string | null>(null);
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [sending, setSending] = useState(false);
  const [signature, setSignature] = useState('');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const bodyRef = useRef<TextInput>(null);
  const autocompleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-fill for reply (same as EmailComposer)
  useEffect(() => {
    if (!replyTo) return;
    setTo(replyTo.reply_to || replyTo.from_address || '');
    const subj = replyTo.subject ?? '';
    setSubject(subj.startsWith('Re:') ? subj : `Re: ${subj}`);
    setBody(buildReplyBody(replyTo));
  }, [replyTo?.id]);

  // Set primary email as from address
  useEffect(() => {
    if (addresses.length > 0 && !fromAddressId) {
      const primary = addresses.find(a => a.is_primary) ?? addresses[0];
      if (primary) setFromAddressId(primary.id);
    }
  }, [addresses]);

  // Load user signature & templates
  useEffect(() => {
    if (!user) return;
    loadSignatureAndTemplates();
  }, [user, fromAddressId]);

  const loadSignatureAndTemplates = async () => {
    if (!user) return;
    try {
      // Signature (from user_settings for selected address)
      if (fromAddressId) {
        const { data: settings } = await (supabase as any)
          .from('user_settings').select('email_signature').eq('email_address_id', fromAddressId).maybeSingle();
        if (settings?.email_signature) setSignature(settings.email_signature);
      }

      // Check admin + load templates (same as EmailComposer.checkAdminAndFetchTemplates)
      const { data: roleRow } = await supabase
        .from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
      const admin = !!roleRow;
      setIsAdmin(admin);
      if (admin) {
        const { data } = await supabase.from('email_templates').select('id, name, subject, body_text, category').order('name');
        setTemplates(data ?? []);
      }
    } catch {}
  };

  const fromAddress = addresses.find(a => a.id === fromAddressId);

  // Debounced AI autocomplete (same as EmailComposer)
  const handleBodyChange = useCallback((text: string) => {
    setBody(text);
    clearAutocomplete();
    if (autocompleteTimer.current) clearTimeout(autocompleteTimer.current);
    autocompleteTimer.current = setTimeout(() => {
      if (text.length > 15) getAutocomplete(text, subject);
    }, 900);
  }, [subject, getAutocomplete, clearAutocomplete]);

  const applyTemplate = (t: EmailTemplate) => {
    setSubject(t.subject);
    setBody(t.body_text);
    setShowTemplates(false);
  };

  // AI action handlers (same as EmailComposer.handleAIAction)
  const handleAIAction = async (action: 'improve_tone' | 'fix_grammar' | 'make_shorter' | 'make_longer') => {
    if (!body.trim()) {
      Alert.alert('Nothing to improve', 'Write something first.');
      return;
    }
    let result: string | null = null;
    switch (action) {
      case 'improve_tone': result = await improveTone(body); break;
      case 'fix_grammar':  result = await fixGrammar(body);  break;
      case 'make_shorter': result = await makeShorter(body); break;
      case 'make_longer':  result = await makeLonger(body);  break;
    }
    if (result) setBody(result);
  };

  const handleSend = async () => {
    if (!to.trim()) { Alert.alert('Missing recipient', 'Please enter at least one recipient.'); return; }
    if (!subject.trim()) {
      Alert.alert('No subject', 'Send without a subject?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send anyway', onPress: doSend },
      ]);
      return;
    }
    doSend();
  };

  const doSend = async () => {
    setSending(true);
    try {
      const payload: Record<string, unknown> = {
        to: to.split(',').map((s: string) => s.trim()).filter(Boolean),
        subject: subject.trim(),
        body_text: body.trim(),
        body_html: `<p>${body.trim().replace(/\n/g, '<br>')}</p>`,
        from_address_id: fromAddressId,
      };
      if (cc) payload.cc = cc.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (bcc) payload.bcc = bcc.split(',').map((s: string) => s.trim()).filter(Boolean);
      if (replyTo?.thread_id) payload.reply_to_thread_id = replyTo.thread_id;
      if (replyTo?.id) payload.in_reply_to_id = replyTo.id;
      if (scheduledAt) payload.scheduled_at = new Date(scheduledAt).toISOString();
      const { error } = await supabase.functions.invoke('send-email', { body: payload });
      if (error) throw error;
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Send failed', e?.message ?? 'Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleDiscard = () => {
    if (to || subject || body.trim()) {
      Alert.alert('Discard draft?', 'Your message will be discarded.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
      ]);
    } else {
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgCard} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleDiscard} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color={colors.textDim} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{replyTo ? 'Reply' : 'New message'}</Text>
        <View style={styles.headerRight}>
          {/* Schedule button */}
          <TouchableOpacity style={styles.scheduleBtn} onPress={() => setShowSchedule(true)}>
            <Ionicons name="time-outline" size={20} color={scheduledAt ? colors.primary : colors.textDim} />
          </TouchableOpacity>
          {/* Templates button (admin only, same as EmailComposer) */}
          {isAdmin && (
            <TouchableOpacity style={styles.scheduleBtn} onPress={() => setShowTemplates(true)}>
              <Ionicons name="document-text-outline" size={20} color={colors.textDim} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.sendBtn, (!to.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={sending || !to.trim()}
          >
            {sending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name="send" size={18} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* Scheduled send banner */}
      {!!scheduledAt && (
        <View style={styles.scheduleBanner}>
          <Ionicons name="time-outline" size={14} color={colors.primary} />
          <Text style={styles.scheduleBannerText}>
            Scheduled: {new Date(scheduledAt).toLocaleString()}
          </Text>
          <TouchableOpacity onPress={() => setScheduledAt('')} style={{ padding: 2 }}>
            <Ionicons name="close" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* From */}
        {addresses.length > 0 && (
          <>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>From</Text>
              {addresses.length === 1 ? (
                <Text style={styles.fieldStatic}>{fromAddress?.full_email ?? ''}</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {addresses.map(a => (
                    <TouchableOpacity
                      key={a.id}
                      style={[styles.fromChip, fromAddressId === a.id && styles.fromChipActive]}
                      onPress={() => setFromAddressId(a.id)}
                    >
                      <Text style={[styles.fromChipText, fromAddressId === a.id && styles.fromChipTextActive]}>
                        {a.full_email}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
            <View style={styles.divider} />
          </>
        )}

        {/* To — RecipientInput with autocomplete */}
        <View style={[styles.field, { zIndex: 300 }]}>
          <Text style={styles.fieldLabel}>To</Text>
          <RecipientInput
            value={to}
            onChange={setTo}
            placeholder="Recipients"
            style={{ flex: 1 }}
          />
          <TouchableOpacity onPress={() => setShowCcBcc(v => !v)} style={styles.ccBtn}>
            <Text style={styles.ccBtnText}>{showCcBcc ? 'Hide' : 'Cc/Bcc'}</Text>
          </TouchableOpacity>
        </View>

        {/* Cc / Bcc */}
        {showCcBcc && (
          <>
            <View style={styles.divider} />
            <View style={[styles.field, { zIndex: 200 }]}>
              <Text style={styles.fieldLabel}>Cc</Text>
              <RecipientInput value={cc} onChange={setCc} placeholder="Cc" style={{ flex: 1 }} />
            </View>
            <View style={styles.divider} />
            <View style={[styles.field, { zIndex: 100 }]}>
              <Text style={styles.fieldLabel}>Bcc</Text>
              <RecipientInput value={bcc} onChange={setBcc} placeholder="Bcc" style={{ flex: 1 }} />
            </View>
          </>
        )}

        <View style={styles.divider} />

        {/* Subject */}
        <View style={styles.field}>
          <TextInput
            style={[styles.fieldInput, styles.subjectInput]}
            placeholder="Subject"
            placeholderTextColor={colors.textHint}
            value={subject}
            onChangeText={setSubject}
            returnKeyType="next"
            onSubmitEditing={() => bodyRef.current?.focus()}
          />
        </View>

        <View style={styles.divider} />

        {/* AI autocomplete suggestion */}
        {!!autocompleteText && (
          <TouchableOpacity
            style={styles.autocompleteSuggestion}
            onPress={() => { setBody(body + autocompleteText + ' '); clearAutocomplete(); }}
          >
            <Ionicons name="sparkles" size={14} color={colors.primary} />
            <Text style={styles.autocompleteText} numberOfLines={2}>{autocompleteText}</Text>
            <View style={styles.autocompleteAcceptBadge}>
              <Text style={styles.autocompleteAcceptText}>Tab</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Body */}
        <TextInput
          ref={bodyRef}
          style={styles.bodyInput}
          placeholder="Compose email"
          placeholderTextColor={colors.textHint}
          value={body}
          onChangeText={handleBodyChange}
          multiline
          textAlignVertical="top"
          autoCorrect
          autoCapitalize="sentences"
        />

        {/* Signature (same as EmailComposer — loaded from user_settings) */}
        {!!signature && (
          <View style={styles.signatureBlock}>
            <View style={styles.signatureDivider} />
            <Text style={styles.signatureText}>{signature}</Text>
          </View>
        )}
        {!signature && (
          <View style={styles.signature}>
            <Text style={styles.signatureDefault}>{'— '}<Text style={{ color: colors.primary }}>AfuChat Mail</Text></Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* AI loading overlay on body */}
      {aiLoading && (
        <View style={styles.aiLoadingOverlay}>
          <View style={styles.aiLoadingPill}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.aiLoadingText}>AI is working…</Text>
          </View>
        </View>
      )}

      {/* Toolbar (same as EmailComposer bottom toolbar — matches website) */}
      <View style={styles.toolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarContent}>
          {/* Attach */}
          <TouchableOpacity style={styles.toolbarBtn}>
            <Ionicons name="attach-outline" size={22} color={colors.textDim} />
          </TouchableOpacity>
          {/* AI actions (same as EmailComposer AI toolbar) */}
          {AI_ACTIONS.map(action => (
            <TouchableOpacity
              key={action.key}
              style={styles.toolbarAIBtn}
              onPress={() => handleAIAction(action.key)}
              disabled={aiLoading}
            >
              <Ionicons name={action.icon} size={15} color={colors.primary} />
              <Text style={styles.toolbarAIText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Templates bottom sheet */}
      <Modal visible={showTemplates} animationType="slide" transparent onRequestClose={() => setShowTemplates(false)}>
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowTemplates(false)} />
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.bottomSheetTitle}>Choose template</Text>
            {templates.length === 0 ? (
              <View style={styles.noTemplates}>
                <Ionicons name="document-text-outline" size={40} color={colors.textHint} />
                <Text style={styles.noTemplatesText}>No templates available</Text>
              </View>
            ) : (
              <FlatList
                data={templates}
                keyExtractor={t => t.id}
                renderItem={({ item: t }) => (
                  <TouchableOpacity style={styles.templateRow} onPress={() => applyTemplate(t)}>
                    <View style={styles.templateIconWrap}>
                      <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.templateName}>{t.name}</Text>
                      <Text style={styles.templateSubject} numberOfLines={1}>{t.subject}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textHint} />
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.templateDivider} />}
              />
            )}
            <View style={{ height: Platform.OS === 'ios' ? 24 : 16 }} />
          </View>
        </View>
      </Modal>

      {/* Scheduled send modal */}
      <Modal visible={showSchedule} animationType="slide" transparent onRequestClose={() => setShowSchedule(false)}>
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowSchedule(false)} />
          <View style={[styles.bottomSheet, { paddingHorizontal: 20 }]}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.bottomSheetTitle}>Schedule send</Text>
            <Text style={styles.scheduleSubtitle}>Enter date & time to send later</Text>
            <TextInput
              style={styles.scheduleInput}
              value={scheduledAt}
              onChangeText={setScheduledAt}
              placeholder="YYYY-MM-DD HH:MM"
              placeholderTextColor={colors.textHint}
              keyboardType="numbers-and-punctuation"
            />
            <View style={styles.scheduleActions}>
              <TouchableOpacity style={styles.scheduleCancelBtn} onPress={() => { setScheduledAt(''); setShowSchedule(false); }}>
                <Text style={styles.scheduleCancelText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.scheduleSetBtn}
                onPress={() => setShowSchedule(false)}
              >
                <Text style={styles.scheduleSetText}>Set time</Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: Platform.OS === 'ios' ? 24 : 16 }} />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgCard },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.bgCard, gap: 4,
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: colors.text, marginLeft: 4 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  scheduleBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  sendBtnDisabled: { opacity: 0.4 },

  scheduleBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primaryLight, paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  scheduleBannerText: { flex: 1, fontSize: 12, color: colors.primary, fontWeight: '500' },

  form: { flex: 1 },
  field: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13, gap: 8, minHeight: 50,
  },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },
  fieldLabel: { width: 40, fontSize: 14, color: colors.textFaint },
  fieldStatic: { flex: 1, fontSize: 15, color: colors.text },
  fieldInput: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },
  subjectInput: { fontWeight: '500' },
  ccBtn: { paddingHorizontal: 4 },
  ccBtnText: { color: colors.primary, fontSize: 13, fontWeight: '600' },

  fromChip: {
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5,
  },
  fromChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  fromChipText: { fontSize: 12, color: colors.textDim },
  fromChipTextActive: { color: colors.primary, fontWeight: '600' },

  autocompleteSuggestion: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 8, padding: 10,
    backgroundColor: colors.primaryLight, borderRadius: 10,
    borderWidth: 1, borderColor: colors.primary + '40',
  },
  autocompleteText: { flex: 1, fontSize: 13, color: colors.primary, fontStyle: 'italic' },
  autocompleteAcceptBadge: {
    borderWidth: 1, borderColor: colors.primary + '60',
    borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  autocompleteAcceptText: { fontSize: 10, fontWeight: '700', color: colors.primary },

  bodyInput: {
    fontSize: 15, color: colors.text, lineHeight: 24,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
    minHeight: 220,
  },

  signatureBlock: { paddingHorizontal: 16, paddingBottom: 12 },
  signatureDivider: { height: 1, backgroundColor: colors.border, marginBottom: 10 },
  signatureText: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  signature: { paddingHorizontal: 16, paddingBottom: 12 },
  signatureDefault: { fontSize: 13, color: colors.textHint },

  aiLoadingOverlay: {
    position: 'absolute', bottom: 80, left: 0, right: 0,
    alignItems: 'center', pointerEvents: 'none',
  },
  aiLoadingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.text, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
  },
  aiLoadingText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  toolbar: {
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.bgCard,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8, paddingTop: 4,
  },
  toolbarContent: { paddingHorizontal: 8, gap: 4, alignItems: 'center' },
  toolbarBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  toolbarAIBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.primaryLight, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 2,
  },
  toolbarAIText: { fontSize: 12, fontWeight: '600', color: colors.primary },

  bottomSheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  bottomSheet: {
    backgroundColor: colors.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 0, maxHeight: '70%',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 20,
  },
  bottomSheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: colors.bgSurface,
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  bottomSheetTitle: {
    fontSize: 17, fontWeight: '700', color: colors.text,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  noTemplates: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  noTemplatesText: { color: colors.textFaint, fontSize: 14 },
  templateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
  },
  templateIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  templateName: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 2 },
  templateSubject: { fontSize: 12, color: colors.textFaint },
  templateDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 20 },

  scheduleSubtitle: { fontSize: 13, color: colors.textFaint, paddingHorizontal: 0, marginTop: -4, marginBottom: 16 },
  scheduleInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.text, backgroundColor: colors.bgSection,
    marginBottom: 16,
  },
  scheduleActions: { flexDirection: 'row', gap: 10 },
  scheduleCancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  scheduleCancelText: { fontWeight: '600', color: colors.textDim },
  scheduleSetBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    backgroundColor: colors.primary, alignItems: 'center',
  },
  scheduleSetText: { color: '#fff', fontWeight: '700' },
});

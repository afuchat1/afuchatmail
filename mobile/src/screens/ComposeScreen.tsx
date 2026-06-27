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

type BodyMode = 'text' | 'html';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_text: string;
  body_html: string;
  category: string | null;
}

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
  const [bodyMode, setBodyMode] = useState<BodyMode>('text');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [sending, setSending] = useState(false);
  const [signature, setSignature] = useState('');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const bodyRef = useRef<TextInput>(null);
  const autocompleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!replyTo) return;
    setTo(replyTo.reply_to || replyTo.from_address || '');
    const subj = replyTo.subject ?? '';
    setSubject(subj.startsWith('Re:') ? subj : `Re: ${subj}`);
    setBody(buildReplyBody(replyTo));
  }, [replyTo?.id]);

  useEffect(() => {
    if (addresses.length > 0 && !fromAddressId) {
      const primary = addresses.find(a => a.is_primary) ?? addresses[0];
      if (primary) setFromAddressId(primary.id);
    }
  }, [addresses]);

  useEffect(() => {
    if (!user) return;
    loadSignatureAndTemplates();
  }, [user, fromAddressId]);

  const loadSignatureAndTemplates = async () => {
    if (!user) return;
    try {
      if (fromAddressId) {
        const { data: settings } = await (supabase as any)
          .from('user_settings').select('email_signature').eq('email_address_id', fromAddressId).maybeSingle();
        if (settings?.email_signature) setSignature(settings.email_signature);
      }
      // Load templates for ALL users (not admin-only)
      const { data } = await supabase
        .from('email_templates')
        .select('id, name, subject, body_text, body_html, category')
        .order('name');
      setTemplates(data ?? []);
    } catch {}
  };

  const fromAddress = addresses.find(a => a.id === fromAddressId);

  const handleBodyChange = useCallback((text: string) => {
    setBody(text);
    if (bodyMode === 'text') {
      clearAutocomplete();
      if (autocompleteTimer.current) clearTimeout(autocompleteTimer.current);
      autocompleteTimer.current = setTimeout(() => {
        if (text.length > 15) getAutocomplete(text, subject);
      }, 900);
    }
  }, [subject, getAutocomplete, clearAutocomplete, bodyMode]);

  const applyTemplate = (t: EmailTemplate) => {
    setSubject(t.subject);
    if (t.body_html && t.body_html.trim().startsWith('<')) {
      setBody(t.body_html);
      setBodyMode('html');
    } else {
      setBody(t.body_text ?? '');
      setBodyMode('text');
    }
    setShowTemplates(false);
  };

  const toggleBodyMode = () => {
    if (bodyMode === 'text') {
      const html = `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #333; line-height: 1.6;">\n${body.trim().replace(/\n/g, '<br />')}\n</div>`;
      setBody(html);
      setBodyMode('html');
    } else {
      const stripped = body.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      setBody(stripped.trim());
      setBodyMode('text');
    }
  };

  const handleAIAction = async (action: 'improve_tone' | 'fix_grammar' | 'make_shorter' | 'make_longer') => {
    if (bodyMode === 'html') {
      Alert.alert('Switch to Text mode', 'AI tools work in Text mode. Switch to Text first.');
      return;
    }
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
      let body_html: string;
      let body_text: string;

      if (bodyMode === 'html') {
        body_html = body.trim();
        body_text = body.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      } else {
        body_text = body.trim();
        const sigPart = signature ? `\n\n—\n${signature}` : '';
        const fullText = body_text + sigPart;
        body_html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.6;">${fullText.replace(/\n/g, '<br />')}</div>`;
      }

      const payload: Record<string, unknown> = {
        to: to.split(',').map((s: string) => s.trim()).filter(Boolean),
        subject: subject.trim(),
        body_text,
        body_html,
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
          <TouchableOpacity style={styles.scheduleBtn} onPress={() => setShowSchedule(true)}>
            <Ionicons name="time-outline" size={20} color={scheduledAt ? colors.primary : colors.textDim} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.scheduleBtn} onPress={() => setShowTemplates(true)}>
            <Ionicons name="document-text-outline" size={20} color={colors.textDim} />
          </TouchableOpacity>
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

        {/* To */}
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

        {/* Body mode toggle */}
        <View style={styles.modeSwitcher}>
          <TouchableOpacity
            style={[styles.modeTab, bodyMode === 'text' && styles.modeTabActive]}
            onPress={() => bodyMode !== 'text' && toggleBodyMode()}
          >
            <Ionicons name="text-outline" size={14} color={bodyMode === 'text' ? colors.primary : colors.textFaint} />
            <Text style={[styles.modeTabText, bodyMode === 'text' && styles.modeTabTextActive]}>Text</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, bodyMode === 'html' && styles.modeTabActive]}
            onPress={() => bodyMode !== 'html' && toggleBodyMode()}
          >
            <Ionicons name="code-slash-outline" size={14} color={bodyMode === 'html' ? '#e07b00' : colors.textFaint} />
            <Text style={[styles.modeTabText, bodyMode === 'html' && styles.modeTabTextHtml]}>HTML</Text>
          </TouchableOpacity>
        </View>

        {/* HTML mode info banner */}
        {bodyMode === 'html' && (
          <View style={styles.htmlBanner}>
            <Ionicons name="code-slash" size={14} color="#e07b00" />
            <Text style={styles.htmlBannerText}>HTML mode — paste your custom branded template</Text>
          </View>
        )}

        {/* AI autocomplete (text mode only) */}
        {bodyMode === 'text' && !!autocompleteText && (
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

        {/* Body input */}
        <TextInput
          ref={bodyRef}
          style={[styles.bodyInput, bodyMode === 'html' && styles.bodyInputHtml]}
          placeholder={bodyMode === 'html' ? '<!DOCTYPE html>\n<html>\n  <body>\n    <!-- Your branded HTML here -->\n  </body>\n</html>' : 'Compose email'}
          placeholderTextColor={colors.textHint}
          value={body}
          onChangeText={handleBodyChange}
          multiline
          textAlignVertical="top"
          autoCorrect={bodyMode === 'text'}
          autoCapitalize={bodyMode === 'text' ? 'sentences' : 'none'}
          spellCheck={bodyMode === 'text'}
          keyboardType="default"
        />

        {/* Signature (text mode only) */}
        {bodyMode === 'text' && !!signature && (
          <View style={styles.signatureBlock}>
            <View style={styles.signatureDivider} />
            <Text style={styles.signatureText}>{signature}</Text>
          </View>
        )}
        {bodyMode === 'text' && !signature && (
          <View style={styles.signature}>
            <Text style={styles.signatureDefault}>{'— '}<Text style={{ color: colors.primary }}>AfuChat Mail</Text></Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* AI loading overlay */}
      {aiLoading && (
        <View style={styles.aiLoadingOverlay}>
          <View style={styles.aiLoadingPill}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.aiLoadingText}>AI is working…</Text>
          </View>
        </View>
      )}

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarContent}>
          <TouchableOpacity style={styles.toolbarBtn}>
            <Ionicons name="attach-outline" size={22} color={colors.textDim} />
          </TouchableOpacity>
          {bodyMode === 'text' && AI_ACTIONS.map(action => (
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
          {bodyMode === 'html' && (
            <TouchableOpacity
              style={styles.toolbarAIBtn}
              onPress={() => setShowTemplates(true)}
            >
              <Ionicons name="color-palette-outline" size={15} color="#e07b00" />
              <Text style={[styles.toolbarAIText, { color: '#e07b00' }]}>Branded templates</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Templates bottom sheet */}
      <Modal visible={showTemplates} animationType="slide" transparent onRequestClose={() => setShowTemplates(false)}>
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowTemplates(false)} />
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.bottomSheetTitle}>Email templates</Text>
            <Text style={styles.bottomSheetSub}>Templates with HTML branding will open in HTML mode</Text>
            {templates.length === 0 ? (
              <View style={styles.noTemplates}>
                <Ionicons name="document-text-outline" size={40} color={colors.textHint} />
                <Text style={styles.noTemplatesText}>No templates yet</Text>
                <Text style={styles.noTemplatesSubText}>Create branded templates in Settings → Templates</Text>
              </View>
            ) : (
              <FlatList
                data={templates}
                keyExtractor={t => t.id}
                renderItem={({ item: t }) => {
                  const hasHtml = t.body_html && t.body_html.trim().startsWith('<');
                  return (
                    <TouchableOpacity style={styles.templateRow} onPress={() => applyTemplate(t)}>
                      <View style={[styles.templateIconWrap, hasHtml && styles.templateIconWrapHtml]}>
                        <Ionicons
                          name={hasHtml ? 'code-slash-outline' : 'document-text-outline'}
                          size={20}
                          color={hasHtml ? '#e07b00' : colors.primary}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.templateName}>{t.name}</Text>
                        <Text style={styles.templateSubject} numberOfLines={1}>{t.subject}</Text>
                        {hasHtml && (
                          <View style={styles.htmlBadge}>
                            <Text style={styles.htmlBadgeText}>HTML</Text>
                          </View>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.textHint} />
                    </TouchableOpacity>
                  );
                }}
                ItemSeparatorComponent={() => <View style={styles.templateDivider} />}
              />
            )}
            <View style={{ height: Platform.OS === 'ios' ? 24 : 16 }} />
          </View>
        </View>
      </Modal>

      {/* Schedule modal */}
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
              <TouchableOpacity style={styles.scheduleSetBtn} onPress={() => setShowSchedule(false)}>
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

  modeSwitcher: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 10,
    backgroundColor: colors.bgSection,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  modeTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, gap: 5,
  },
  modeTabActive: { backgroundColor: colors.bgCard },
  modeTabText: { fontSize: 13, fontWeight: '600', color: colors.textFaint },
  modeTabTextActive: { color: colors.primary },
  modeTabTextHtml: { color: '#e07b00' },

  htmlBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, marginBottom: 6,
    backgroundColor: '#FFF3E0', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#FFB74D40',
  },
  htmlBannerText: { fontSize: 12, color: '#e07b00', fontWeight: '500', flex: 1 },

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
  bodyInputHtml: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 20,
    color: '#1a1a2e',
    backgroundColor: '#F8F9FF',
    marginHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C5CAE9',
    paddingHorizontal: 12,
    paddingTop: 12,
    minHeight: 300,
  },

  signatureBlock: { paddingHorizontal: 16, paddingBottom: 12 },
  signatureDivider: { height: 1, backgroundColor: colors.border, marginBottom: 10 },
  signatureText: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  signature: { paddingHorizontal: 16, paddingBottom: 12 },
  signatureDefault: { fontSize: 13, color: colors.textHint },

  aiLoadingOverlay: {
    position: 'absolute', bottom: 80, left: 0, right: 0,
    alignItems: 'center',
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
  toolbarBtn: {
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22,
  },
  toolbarAIBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 20,
    backgroundColor: colors.primaryLight,
  },
  toolbarAIText: { fontSize: 12, fontWeight: '600', color: colors.primary },

  bottomSheetOverlay: { flex: 1, backgroundColor: '#00000040', justifyContent: 'flex-end' },
  bottomSheet: {
    backgroundColor: colors.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 8, maxHeight: '80%',
  },
  bottomSheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border,
    alignSelf: 'center', marginBottom: 12,
  },
  bottomSheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text, paddingHorizontal: 20, marginBottom: 4 },
  bottomSheetSub: { fontSize: 12, color: colors.textFaint, paddingHorizontal: 20, marginBottom: 12 },

  templateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
  },
  templateIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  templateIconWrapHtml: { backgroundColor: '#FFF3E0' },
  templateName: { fontSize: 15, fontWeight: '600', color: colors.text },
  templateSubject: { fontSize: 12, color: colors.textDim, marginTop: 1 },
  templateDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: 20 },
  htmlBadge: {
    marginTop: 4, alignSelf: 'flex-start',
    backgroundColor: '#FFF3E0', borderRadius: 5,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  htmlBadgeText: { fontSize: 10, fontWeight: '700', color: '#e07b00' },

  noTemplates: { alignItems: 'center', paddingVertical: 36, gap: 8 },
  noTemplatesText: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
  noTemplatesSubText: { fontSize: 12, color: colors.textFaint, textAlign: 'center', paddingHorizontal: 24 },

  scheduleSubtitle: { fontSize: 13, color: colors.textDim, marginBottom: 16 },
  scheduleInput: {
    backgroundColor: colors.bgSection, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: colors.text, marginBottom: 16,
  },
  scheduleActions: { flexDirection: 'row', gap: 12 },
  scheduleCancelBtn: {
    flex: 1, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },
  scheduleCancelText: { fontSize: 15, fontWeight: '600', color: colors.textDim },
  scheduleSetBtn: {
    flex: 2, backgroundColor: colors.primary,
    borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },
  scheduleSetText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

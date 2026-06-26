import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../lib/colors';
import { RootStackParamList } from '../types';

type Route = RouteProp<RootStackParamList, 'Compose'>;

export default function ComposeScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { user } = useAuth();
  const replyTo = route.params?.replyTo;

  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [sending, setSending] = useState(false);
  const [fromEmail, setFromEmail] = useState('');

  useEffect(() => {
    if (replyTo) {
      setTo(replyTo.from_address);
      setSubject(`Re: ${replyTo.subject ?? ''}`);
      const quote = `\n\n—\nOn ${replyTo.received_at ?? replyTo.created_at}, ${replyTo.from_address} wrote:\n${replyTo.body_text ?? ''}`;
      setBody(quote);
    }
  }, [replyTo]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('email_addresses')
      .select('full_email')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .single()
      .then(({ data }) => { if (data) setFromEmail(data.full_email); });
  }, [user]);

  const handleSend = async () => {
    if (!to.trim()) { Alert.alert('Error', 'Please enter a recipient.'); return; }
    if (!subject.trim()) { Alert.alert('Error', 'Please enter a subject.'); return; }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: [to.trim()],
          cc: cc ? [cc.trim()] : [],
          subject: subject.trim(),
          body_text: body.trim(),
          reply_to_id: replyTo?.id,
        },
      });
      if (error) {
        Alert.alert('Send Failed', error.message);
      } else {
        Alert.alert('Sent!', 'Your email was sent successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to send email.');
    } finally {
      setSending(false);
    }
  };

  const toolbarItems = [
    { icon: 'attach-outline' as const, label: 'Attach' },
    { icon: 'image-outline' as const, label: 'Photo' },
    { icon: 'happy-outline' as const, label: 'Emoji' },
    { icon: 'at-outline' as const, label: 'Mention' },
    { icon: 'mic-outline' as const, label: 'Voice' },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Message</Text>
        <TouchableOpacity
          style={[styles.sendBtn, !to && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={sending || !to}
        >
          {sending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.sendText}>Send</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Fields card */}
        <View style={styles.fieldsCard}>
          {fromEmail ? (
            <View style={[styles.field, styles.fieldBorder]}>
              <Text style={styles.fieldLabel}>From</Text>
              <Text style={styles.fieldValueStatic}>{fromEmail}</Text>
            </View>
          ) : null}

          <View style={[styles.field, styles.fieldBorder]}>
            <Text style={styles.fieldLabel}>To</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="recipient@example.com"
              placeholderTextColor={colors.textFaint}
              value={to}
              onChangeText={setTo}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <TouchableOpacity onPress={() => setShowCc(!showCc)}>
              <Text style={styles.ccToggle}>CC/BCC</Text>
            </TouchableOpacity>
          </View>

          {showCc && (
            <View style={[styles.field, styles.fieldBorder]}>
              <Text style={styles.fieldLabel}>Cc</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="Optional"
                placeholderTextColor={colors.textFaint}
                value={cc}
                onChangeText={setCc}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Subject</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="Email subject"
              placeholderTextColor={colors.textFaint}
              value={subject}
              onChangeText={setSubject}
            />
          </View>
        </View>

        {/* Body */}
        <TextInput
          style={styles.bodyInput}
          placeholder="Write your message here…"
          placeholderTextColor={colors.textFaint}
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
        />

        {/* Signature */}
        <View style={styles.signature}>
          <Text style={styles.signatureDash}>—</Text>
          <Text style={styles.signatureText}>
            Sent with <Text style={{ color: colors.primary, fontWeight: '600' }}>AfuChat Mail</Text>
          </Text>
          {fromEmail ? <Text style={styles.signatureEmail}>{fromEmail}</Text> : null}
        </View>
      </ScrollView>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        {toolbarItems.map(item => (
          <TouchableOpacity key={item.label} style={styles.toolbarBtn}>
            <Ionicons name={item.icon} size={22} color={colors.textDim} />
            <Text style={styles.toolbarLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  cancelBtn: { paddingVertical: 4, paddingHorizontal: 4 },
  cancelText: { color: colors.primary, fontSize: 16, fontWeight: '500' },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    minWidth: 64,
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  form: { flex: 1 },
  fieldsCard: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    margin: 16,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  fieldBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  fieldLabel: { color: colors.textFaint, fontSize: 14, fontWeight: '600', width: 52 },
  fieldValueStatic: { color: colors.textDim, flex: 1, fontSize: 15 },
  fieldInput: { flex: 1, color: colors.text, fontSize: 15, padding: 0 },
  ccToggle: { color: colors.primary, fontSize: 13, fontWeight: '600' },
  bodyInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
    paddingHorizontal: 16,
    minHeight: 200,
  },
  signature: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 4 },
  signatureDash: { color: colors.textFaint, fontSize: 14, marginBottom: 2 },
  signatureText: { color: colors.textFaint, fontSize: 13 },
  signatureEmail: { color: colors.border, fontSize: 13, marginTop: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  toolbarBtn: { alignItems: 'center', gap: 3 },
  toolbarLabel: { fontSize: 10, color: colors.textFaint },
});

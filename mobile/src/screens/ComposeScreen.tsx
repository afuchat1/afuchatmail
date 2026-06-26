import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
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
      const quote = `\n\n---\nOn ${replyTo.received_at ?? replyTo.created_at}, ${replyTo.from_address} wrote:\n${replyTo.body_text ?? ''}`;
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
      .then(({ data }) => {
        if (data) setFromEmail(data.full_email);
      });
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Message</Text>
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={sending}>
          {sending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.sendText}>Send</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
        {fromEmail ? (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>From</Text>
            <Text style={styles.fieldValue}>{fromEmail}</Text>
          </View>
        ) : null}

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>To</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="recipient@example.com"
            placeholderTextColor={colors.textDim}
            value={to}
            onChangeText={setTo}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <TouchableOpacity onPress={() => setShowCc(!showCc)}>
            <Text style={styles.ccToggle}>Cc</Text>
          </TouchableOpacity>
        </View>

        {showCc && (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Cc</Text>
            <TextInput
              style={styles.fieldInput}
              placeholder="cc@example.com"
              placeholderTextColor={colors.textDim}
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
            placeholderTextColor={colors.textDim}
            value={subject}
            onChangeText={setSubject}
          />
        </View>

        <TextInput
          style={styles.bodyInput}
          placeholder="Write your message…"
          placeholderTextColor={colors.textDim}
          value={body}
          onChangeText={setBody}
          multiline
          textAlignVertical="top"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  cancelBtn: { padding: 4 },
  cancelText: { color: colors.textMuted, fontSize: 16 },
  title: { color: colors.text, fontSize: 17, fontWeight: '600' },
  sendBtn: {
    backgroundColor: colors.primary, borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 8, minWidth: 64, alignItems: 'center',
  },
  sendText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  form: { flex: 1 },
  field: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  fieldLabel: { color: colors.textDim, width: 52, fontSize: 14, fontWeight: '500' },
  fieldValue: { color: colors.textMuted, flex: 1, fontSize: 15 },
  fieldInput: { flex: 1, color: colors.text, fontSize: 15, padding: 0 },
  ccToggle: { color: colors.primary, fontSize: 14, fontWeight: '500', paddingLeft: 8 },
  bodyInput: {
    flex: 1, color: colors.text, fontSize: 15, lineHeight: 24,
    padding: 16, minHeight: 300,
  },
});

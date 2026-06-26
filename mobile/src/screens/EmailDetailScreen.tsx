import React, { useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, StatusBar, Share, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useEmail } from '../hooks/useEmails';
import { colors } from '../lib/colors';
import { RootStackParamList } from '../types';

type Route = RouteProp<RootStackParamList, 'EmailDetail'>;

export default function EmailDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { emailId } = route.params;
  const { email, loading } = useEmail(emailId);

  useEffect(() => {
    if (email && !email.is_read) {
      supabase.from('emails').update({ is_read: true }).eq('id', emailId);
    }
  }, [email, emailId]);

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
        <Text style={styles.errorText}>Email not found.</Text>
      </View>
    );
  }

  const dateStr = email.received_at
    ? format(new Date(email.received_at), 'EEE, MMM d, yyyy h:mm a')
    : '';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.actionBtn}>
            <Text style={styles.actionIcon}>↗</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subject}>{email.subject || '(no subject)'}</Text>

        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>From</Text>
            <Text style={styles.metaValue} numberOfLines={2}>{email.from_address}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>To</Text>
            <Text style={styles.metaValue}>{email.to_addresses?.join(', ')}</Text>
          </View>
          {email.cc_addresses && email.cc_addresses.length > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>CC</Text>
                <Text style={styles.metaValue}>{email.cc_addresses.join(', ')}</Text>
              </View>
            </>
          )}
          <View style={styles.divider} />
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValue}>{dateStr}</Text>
          </View>
        </View>

        {email.attachments && email.attachments.length > 0 && (
          <View style={styles.attachmentsCard}>
            <Text style={styles.attachmentsTitle}>📎 Attachments ({email.attachments.length})</Text>
            {email.attachments.map((att, i) => (
              <View key={i} style={styles.attachmentRow}>
                <Text style={styles.attachmentName}>{att.name}</Text>
                <Text style={styles.attachmentSize}>
                  {att.size ? `${(att.size / 1024).toFixed(1)} KB` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.bodyCard}>
          <Text style={styles.body}>
            {email.body_text || '(No content)'}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.replyBtn} onPress={handleReply}>
          <Text style={styles.replyIcon}>↩</Text>
          <Text style={styles.replyBtnText}>Reply</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.forwardBtn}
          onPress={() => Alert.alert('Forward', 'Forward not yet implemented')}
        >
          <Text style={styles.forwardIcon}>↪</Text>
          <Text style={styles.forwardBtnText}>Forward</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  errorText: { color: colors.textMuted, fontSize: 16 },
  headerBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
  },
  backBtn: { padding: 8 },
  backIcon: { fontSize: 22, color: colors.primary, fontWeight: '600' },
  headerActions: { flexDirection: 'row' },
  actionBtn: { padding: 8, marginLeft: 4 },
  actionIcon: { fontSize: 20, color: colors.text },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  subject: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 14, lineHeight: 28 },
  metaCard: {
    backgroundColor: colors.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, marginBottom: 12,
    overflow: 'hidden',
  },
  metaRow: { flexDirection: 'row', padding: 12, alignItems: 'flex-start' },
  metaLabel: { color: colors.textDim, width: 44, fontSize: 13, paddingTop: 1, fontWeight: '500' },
  metaValue: { color: colors.textMuted, flex: 1, fontSize: 13, lineHeight: 18 },
  divider: { height: 1, backgroundColor: colors.borderLight, marginHorizontal: 12 },
  attachmentsCard: {
    backgroundColor: colors.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12,
  },
  attachmentsTitle: { color: colors.text, fontWeight: '600', marginBottom: 8, fontSize: 14 },
  attachmentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  attachmentName: { color: colors.textMuted, fontSize: 13, flex: 1 },
  attachmentSize: { color: colors.textDim, fontSize: 12 },
  bodyCard: {
    backgroundColor: colors.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12,
  },
  body: { color: colors.text, fontSize: 15, lineHeight: 24 },
  bottomBar: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: colors.border, gap: 10,
  },
  replyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, gap: 6,
  },
  replyIcon: { color: '#fff', fontSize: 18 },
  replyBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  forwardBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgCard, borderRadius: 10, paddingVertical: 12,
    borderWidth: 1, borderColor: colors.border, gap: 6,
  },
  forwardIcon: { color: colors.text, fontSize: 18 },
  forwardBtnText: { color: colors.text, fontWeight: '600', fontSize: 15 },
});

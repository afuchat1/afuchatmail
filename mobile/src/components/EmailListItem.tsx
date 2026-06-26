import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { format, isToday, isYesterday } from 'date-fns';
import { Email } from '../types';
import { colors } from '../lib/colors';

interface Props {
  email: Email;
  onPress: () => void;
  onStar: () => void;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d');
}

function getInitials(from: string): string {
  const name = from.split('<')[0].trim().replace(/"/g, '');
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (name[0] ?? '?').toUpperCase();
}

const avatarColors = ['#0ea5e9', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'];
function getAvatarColor(from: string): string {
  let sum = 0;
  for (let i = 0; i < from.length; i++) sum += from.charCodeAt(i);
  return avatarColors[sum % avatarColors.length];
}

export default function EmailListItem({ email, onPress, onStar }: Props) {
  const initials = getInitials(email.from_address);
  const avatarColor = getAvatarColor(email.from_address);
  const dateStr = formatDate(email.received_at ?? email.created_at);
  const fromName = email.from_address.split('<')[0].trim().replace(/"/g, '') || email.from_address;

  return (
    <TouchableOpacity
      style={[styles.container, !email.is_read && styles.unread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={[styles.from, !email.is_read && styles.fromBold]} numberOfLines={1}>
            {fromName}
          </Text>
          <Text style={styles.date}>{dateStr}</Text>
        </View>
        <Text style={[styles.subject, !email.is_read && styles.subjectBold]} numberOfLines={1}>
          {email.subject || '(no subject)'}
        </Text>
        <Text style={styles.preview} numberOfLines={1}>
          {(email.body_text ?? '').replace(/\s+/g, ' ').trim() || '(no preview)'}
        </Text>
      </View>
      <TouchableOpacity style={styles.star} onPress={onStar} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={[styles.starIcon, email.is_starred && styles.starActive]}>
          {email.is_starred ? '★' : '☆'}
        </Text>
      </TouchableOpacity>
      {!email.is_read && <View style={styles.dot} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
    backgroundColor: colors.bg,
  },
  unread: { backgroundColor: '#0f1e2e' },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  body: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  from: { color: colors.textMuted, fontSize: 14, flex: 1, marginRight: 8 },
  fromBold: { color: colors.text, fontWeight: '700' },
  date: { color: colors.textDim, fontSize: 12 },
  subject: { color: colors.textMuted, fontSize: 14, marginBottom: 2 },
  subjectBold: { color: colors.text, fontWeight: '600' },
  preview: { color: colors.textDim, fontSize: 13 },
  star: { paddingLeft: 12 },
  starIcon: { fontSize: 20, color: colors.textDim },
  starActive: { color: colors.starred },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.primary,
    position: 'absolute', left: 6, top: '50%',
  },
});

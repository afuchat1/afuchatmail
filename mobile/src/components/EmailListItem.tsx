import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

const avatarColors = ['#6366F1', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4'];
function getAvatarColor(from: string): string {
  let sum = 0;
  for (let i = 0; i < from.length; i++) sum += from.charCodeAt(i);
  return avatarColors[sum % avatarColors.length];
}

export default function EmailListItem({ email, onPress, onStar }: Props) {
  const initials = getInitials(email.from_address);
  const avatarColor = getAvatarColor(email.from_address);
  const dateStr = formatDate(email.received_at ?? email.created_at);
  const fromName =
    email.from_address.split('<')[0].trim().replace(/"/g, '') || email.from_address;
  const isUnread = !email.is_read;

  return (
    <TouchableOpacity
      style={[styles.container, isUnread && styles.unreadContainer]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Left unread accent */}
      <View style={[styles.accentBar, isUnread && styles.accentBarActive]} />

      {/* Avatar with optional star badge */}
      <View style={styles.avatarWrap}>
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        {email.is_starred && (
          <View style={styles.starBadge}>
            <Ionicons name="star" size={8} color={colors.starred} />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text
            style={[styles.from, isUnread && styles.fromUnread]}
            numberOfLines={1}
          >
            {fromName}
          </Text>
          <Text style={[styles.date, isUnread && styles.dateUnread]}>{dateStr}</Text>
        </View>
        <Text
          style={[styles.subject, isUnread && styles.subjectUnread]}
          numberOfLines={1}
        >
          {email.subject || '(no subject)'}
        </Text>
        <View style={styles.previewRow}>
          {email.attachments && email.attachments.length > 0 && (
            <Ionicons name="attach" size={13} color={colors.textFaint} style={{ marginRight: 4 }} />
          )}
          <Text style={styles.preview} numberOfLines={1}>
            {(email.body_text ?? '').replace(/\s+/g, ' ').trim() || '(no preview)'}
          </Text>
        </View>
      </View>

      {/* Star button */}
      <TouchableOpacity
        style={styles.starBtn}
        onPress={onStar}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name={email.is_starred ? 'star' : 'star-outline'}
          size={20}
          color={email.is_starred ? colors.starred : colors.textFaint}
        />
      </TouchableOpacity>

      {/* Unread dot */}
      {isUnread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.bg,
    gap: 12,
  },
  unreadContainer: {
    backgroundColor: '#FEFEFE',
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
    borderRadius: 2,
    flexShrink: 0,
  },
  accentBarActive: {
    backgroundColor: colors.primary,
  },
  avatarWrap: { position: 'relative', flexShrink: 0 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 17 },
  starBadge: {
    position: 'absolute',
    bottom: -1,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FEF9C3',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
  body: { flex: 1, minWidth: 0 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  from: {
    fontSize: 14,
    color: colors.textDim,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  fromUnread: { color: colors.text, fontWeight: '700' },
  date: { fontSize: 12, color: colors.textFaint, flexShrink: 0 },
  dateUnread: { color: colors.primary, fontWeight: '700' },
  subject: { fontSize: 14, color: colors.textDim, marginBottom: 3 },
  subjectUnread: { color: colors.textMuted, fontWeight: '600' },
  previewRow: { flexDirection: 'row', alignItems: 'center' },
  preview: { fontSize: 13, color: colors.textFaint, flex: 1 },
  starBtn: { paddingLeft: 8, flexShrink: 0 },
  unreadDot: {
    position: 'absolute',
    right: 52,
    top: '50%',
    marginTop: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});

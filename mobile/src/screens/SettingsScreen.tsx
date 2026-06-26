import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, StatusBar, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../lib/colors';
import { Profile, EmailAddress } from '../types';

interface RowItem {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  sub?: string;
  onPress?: () => void;
  danger?: boolean;
}

function SettingRow({ item, isLast }: { item: RowItem; isLast: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.row, !isLast && styles.rowBorder]}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.rowIcon, { backgroundColor: item.iconBg }]}>
        <Ionicons name={item.icon} size={19} color={item.iconColor} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, item.danger && styles.rowLabelDanger]}>
          {item.label}
        </Text>
        {item.sub && <Text style={styles.rowSub}>{item.sub}</Text>}
      </View>
      {!item.danger && (
        <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [emailAddresses, setEmailAddresses] = useState<EmailAddress[]>([]);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('*').eq('id', user.id).single()
      .then(({ data }) => setProfile(data));
    supabase.from('email_addresses').select('*').eq('user_id', user.id)
      .then(({ data }) => setEmailAddresses(data ?? []));
  }, [user]);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
    : (user?.email?.[0] ?? '?').toUpperCase();

  const primaryEmail = emailAddresses.find(a => a.is_primary)?.full_email ?? user?.email ?? '';

  const sections: { title: string; items: RowItem[] }[] = [
    {
      title: 'Account',
      items: [
        { icon: 'person-outline', iconColor: colors.primary, iconBg: colors.primaryLight, label: 'Profile & Identity', sub: primaryEmail },
        { icon: 'at-outline', iconColor: '#10B981', iconBg: '#F0FDF4', label: 'Email Addresses', sub: `${emailAddresses.length || 1} address active` },
        { icon: 'globe-outline', iconColor: '#06B6D4', iconBg: '#ECFEFF', label: 'Custom Domains', sub: 'Manage your domains' },
        { icon: 'card-outline', iconColor: '#F59E0B', iconBg: '#FFFBEB', label: 'Subscription & Billing', sub: 'Pro Plan · Active' },
      ],
    },
    {
      title: 'Privacy & Security',
      items: [
        { icon: 'lock-closed-outline', iconColor: '#EF4444', iconBg: '#FEF2F2', label: 'Password & 2FA', sub: 'Enabled' },
        { icon: 'shield-checkmark-outline', iconColor: '#8B5CF6', iconBg: '#F5F3FF', label: 'Encryption', sub: 'End-to-end for all mail' },
        { icon: 'eye-off-outline', iconColor: '#64748B', iconBg: '#F8FAFC', label: 'Privacy Controls', sub: 'Tracking blocked' },
      ],
    },
    {
      title: 'App',
      items: [
        { icon: 'notifications-outline', iconColor: '#F97316', iconBg: '#FFF7ED', label: 'Notifications', sub: 'Push, badges, sounds' },
        { icon: 'moon-outline', iconColor: colors.primary, iconBg: colors.primaryLight, label: 'Appearance', sub: 'System default' },
        { icon: 'logo-github', iconColor: '#10B981', iconBg: '#F0FDF4', label: 'Telegram Bot', sub: 'Connected' },
        { icon: 'help-circle-outline', iconColor: '#94A3B8', iconBg: '#F8FAFC', label: 'Help & Support', sub: 'FAQs, contact us' },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Settings</Text>

        {/* Profile card */}
        <TouchableOpacity style={styles.profileCard} activeOpacity={0.8}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.full_name ?? 'Your Name'}</Text>
            <Text style={styles.profileEmail}>{primaryEmail}</Text>
            <View style={styles.proBadge}>
              <Ionicons name="flash" size={11} color={colors.primary} />
              <Text style={styles.proBadgeText}>Pro Plan</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </TouchableOpacity>

        {sections.map(section => (
          <View key={section.title} style={{ marginBottom: 8 }}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, i) => (
                <SettingRow key={item.label} item={item} isLast={i === section.items.length - 1} />
              ))}
            </View>
          </View>
        ))}

        {/* Notifications toggle */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.card}>
          <View style={styles.toggleRow}>
            <View style={[styles.rowIcon, { backgroundColor: '#FFF7ED' }]}>
              <Ionicons name="notifications-outline" size={19} color="#F97316" />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Push Notifications</Text>
              <Text style={styles.rowSub}>Get notified for new emails</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: colors.border, true: colors.primary + '99' }}
              thumbColor={notifications ? colors.primary : '#fff'}
            />
          </View>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>AfuChat Mail v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 48 },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  profileAvatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 2 },
  profileEmail: { fontSize: 13, color: colors.textDim, marginBottom: 6 },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  proBadgeText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  sectionTitle: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, color: colors.text, fontWeight: '500' },
  rowLabelDanger: { color: colors.danger },
  rowSub: { fontSize: 12, color: colors.textFaint, marginTop: 1 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 14,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.dangerLight,
    borderRadius: 16,
    paddingVertical: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  signOutText: { color: colors.danger, fontWeight: '700', fontSize: 16 },
  version: { textAlign: 'center', color: colors.textFaint, fontSize: 12 },
});

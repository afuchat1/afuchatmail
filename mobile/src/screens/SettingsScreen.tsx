import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, StatusBar, Switch,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../lib/colors';
import { Profile, EmailAddress } from '../types';

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <Text style={styles.pageTitle}>Settings</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile?.full_name ?? 'User'}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Email Addresses</Text>
      <View style={styles.card}>
        {emailAddresses.length === 0 ? (
          <Text style={styles.emptyText}>No email addresses yet</Text>
        ) : (
          emailAddresses.map((addr, i) => (
            <View key={addr.id}>
              {i > 0 && <View style={styles.divider} />}
              <View style={styles.addressRow}>
                <View>
                  <Text style={styles.addressEmail}>{addr.full_email}</Text>
                  {addr.is_primary && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>Primary</Text>
                    </View>
                  )}
                </View>
                {addr.is_alias && (
                  <View style={styles.aliasBadge}>
                    <Text style={styles.aliasBadgeText}>Alias</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      <Text style={styles.sectionTitle}>Preferences</Text>
      <View style={styles.card}>
        <View style={styles.prefRow}>
          <View>
            <Text style={styles.prefLabel}>Push Notifications</Text>
            <Text style={styles.prefSub}>Get notified for new emails</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.menuRow}>
          <Text style={styles.menuRowText}>Privacy Policy</Text>
          <Text style={styles.menuRowIcon}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.menuRow}>
          <Text style={styles.menuRowText}>Terms of Service</Text>
          <Text style={styles.menuRowIcon}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.menuRow}>
          <Text style={styles.menuRowText}>Help & Support</Text>
          <Text style={styles.menuRowIcon}>›</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>AfuMail v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingBottom: 40 },
  pageTitle: { fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 20 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, borderRadius: 14,
    padding: 16, marginBottom: 24,
    borderWidth: 1, borderColor: colors.border,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  profileInfo: { flex: 1 },
  profileName: { color: colors.text, fontSize: 17, fontWeight: '600', marginBottom: 3 },
  profileEmail: { color: colors.textMuted, fontSize: 13 },
  sectionTitle: { color: colors.textDim, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 4 },
  card: {
    backgroundColor: colors.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, marginBottom: 20,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: colors.borderLight, marginHorizontal: 14 },
  addressRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14,
  },
  addressEmail: { color: colors.text, fontSize: 14, marginBottom: 4 },
  primaryBadge: { backgroundColor: colors.primary + '33', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
  primaryBadgeText: { color: colors.primary, fontSize: 11, fontWeight: '600' },
  aliasBadge: { backgroundColor: colors.border, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  aliasBadgeText: { color: colors.textMuted, fontSize: 11 },
  emptyText: { color: colors.textDim, padding: 14, fontSize: 14 },
  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  prefLabel: { color: colors.text, fontSize: 15, fontWeight: '500', marginBottom: 2 },
  prefSub: { color: colors.textDim, fontSize: 12 },
  menuRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  menuRowText: { color: colors.text, fontSize: 15 },
  menuRowIcon: { color: colors.textDim, fontSize: 20 },
  signOutBtn: {
    backgroundColor: colors.danger + '22', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: colors.danger + '44',
    marginBottom: 16,
  },
  signOutText: { color: colors.danger, fontWeight: '700', fontSize: 16 },
  version: { textAlign: 'center', color: colors.textDim, fontSize: 12 },
});

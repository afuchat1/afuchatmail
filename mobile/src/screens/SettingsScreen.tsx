import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Switch, TextInput, Modal, ActivityIndicator,
  StatusBar, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { usePlan, PLAN_LIMITS, formatBytes, useStorageUsage } from '../hooks/usePlan';
import { colors } from '../lib/colors';

type SectionId = 'profile' | 'email' | 'addresses' | 'billing' | 'integrations' | 'danger';

// Same sections as Settings.tsx
const SECTIONS: { id: SectionId; label: string; icon: keyof typeof Ionicons.glyphMap; group: string }[] = [
  { id: 'profile',      label: 'Profile',          icon: 'person-outline',        group: 'Account'   },
  { id: 'email',        label: 'Email',             icon: 'mail-outline',          group: 'Mail'      },
  { id: 'addresses',    label: 'Addresses',         icon: 'at-outline',            group: 'Mail'      },
  { id: 'billing',      label: 'Billing & Plan',    icon: 'card-outline',          group: 'Workspace' },
  { id: 'integrations', label: 'Integrations',      icon: 'link-outline',          group: 'Workspace' },
  { id: 'danger',       label: 'Danger zone',       icon: 'warning-outline',       group: 'Account'   },
];

interface EmailAddress {
  id: string;
  local_part: string;
  full_email: string;
  is_primary: boolean;
  is_alias: boolean;
  alias_for_id: string | null;
  created_at: string;
}

interface UserSettings {
  email_signature: string;
  default_reply_to: string;
  notifications_enabled: boolean;
  notification_new_email: boolean;
  notification_replies: boolean;
}

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();
  const { plan } = usePlan(user);
  const { usedBytes, quotaBytes, usedPercent } = useStorageUsage(user);
  const planLimits = PLAN_LIMITS[plan.tier];

  const [activeSection, setActiveSection] = useState<SectionId>('profile');
  const [profileName, setProfileName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [emails, setEmails] = useState<EmailAddress[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newAlias, setNewAlias] = useState('');
  const [creatingEmail, setCreatingEmail] = useState(false);
  const [creatingAlias, setCreatingAlias] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings>({
    email_signature: '',
    default_reply_to: '',
    notifications_enabled: true,
    notification_new_email: true,
    notification_replies: true,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [telegramCode, setTelegramCode] = useState('');
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null);
  const [linkingTelegram, setLinkingTelegram] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchProfile();
    fetchEmails();
    fetchTelegramStatus();
  }, [user]);

  useEffect(() => {
    if (selectedEmailId) fetchSettings(selectedEmailId);
  }, [selectedEmailId]);

  useEffect(() => {
    if (emails.length > 0 && !selectedEmailId) {
      const primary = emails.find(e => e.is_primary) ?? emails[0];
      setSelectedEmailId(primary.id);
    }
  }, [emails]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
    if (data) setProfileName((data as any).full_name ?? '');
  };

  const fetchEmails = async () => {
    if (!user) return;
    const { data } = await supabase.from('email_addresses').select('*').eq('user_id', user.id)
      .order('is_primary', { ascending: false }).order('created_at', { ascending: false });
    setEmails(data ?? []);
  };

  const fetchSettings = async (emailAddressId: string) => {
    const { data } = await supabase.from('user_settings' as any).select('*').eq('email_address_id', emailAddressId).maybeSingle();
    if (data) setUserSettings(data as any);
  };

  const fetchTelegramStatus = async () => {
    if (!user) return;
    const { data } = await (supabase as any).from('telegram_links').select('*').eq('user_id', user.id).maybeSingle();
    if (data) { setTelegramLinked(true); setTelegramUsername(data.telegram_username); }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase.from('profiles').update({ full_name: profileName.trim() }).eq('id', user.id);
      if (error) throw error;
      Alert.alert('Profile updated', 'Your name has been saved.');
    } catch (e: any) {
      Alert.alert('Error', e?.message);
    }
    setSavingProfile(false);
  };

  const handleCreateEmail = async () => {
    if (!user || !newEmail.trim()) return;
    setCreatingEmail(true);
    try {
      const { error } = await supabase.from('email_addresses').insert({
        user_id: user.id, local_part: newEmail.toLowerCase().trim(),
      });
      if (error) throw error;
      Alert.alert('Email created', `${newEmail}@afuchat.com is now active.`);
      setNewEmail('');
      fetchEmails();
    } catch (e: any) {
      Alert.alert('Error', e?.message);
    }
    setCreatingEmail(false);
  };

  const handleCreateAlias = async () => {
    if (!user || !newAlias.trim()) return;
    const primaryAddress = emails.find(e => e.is_primary);
    if (!primaryAddress) return;
    setCreatingAlias(true);
    try {
      const { error } = await supabase.from('email_addresses').insert({
        user_id: user.id, local_part: newAlias.toLowerCase().trim(),
        is_alias: true, alias_for_id: primaryAddress.id,
      });
      if (error) throw error;
      Alert.alert('Alias created', `${newAlias}@afuchat.com forwards to your main address.`);
      setNewAlias('');
      fetchEmails();
    } catch (e: any) {
      Alert.alert('Error', e?.message);
    }
    setCreatingAlias(false);
  };

  const handleDeleteEmail = (addr: EmailAddress) => {
    if (addr.is_primary) { Alert.alert('Cannot delete', 'Your primary email cannot be removed.'); return; }
    Alert.alert('Delete address?', `Remove ${addr.full_email}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('email_addresses').delete().eq('id', addr.id);
          fetchEmails();
        },
      },
    ]);
  };

  const handleSaveSettings = async () => {
    if (!user || !selectedEmailId) return;
    setSavingSettings(true);
    try {
      const { error } = await (supabase as any).from('user_settings').upsert({
        user_id: user.id, email_address_id: selectedEmailId, ...userSettings,
      });
      if (error) throw error;
      Alert.alert('Settings saved', 'Your email preferences have been updated.');
    } catch (e: any) {
      Alert.alert('Error', e?.message);
    }
    setSavingSettings(false);
  };

  const handleLinkTelegram = async () => {
    if (!user || !telegramCode.trim()) return;
    setLinkingTelegram(true);
    try {
      const { data, error } = await supabase.functions.invoke('telegram-bot', {
        body: { action: 'claim_link', code: telegramCode.trim(), user_id: user.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setTelegramLinked(true);
      setTelegramCode('');
      Alert.alert('Telegram linked', 'You\'ll now receive notifications via Telegram.');
      fetchTelegramStatus();
    } catch (e: any) {
      Alert.alert('Link failed', e?.message);
    }
    setLinkingTelegram(false);
  };

  const handleUnlinkTelegram = async () => {
    if (!user) return;
    await (supabase as any).from('telegram_links').delete().eq('user_id', user.id);
    setTelegramLinked(false);
    setTelegramUsername(null);
    Alert.alert('Unlinked', 'Telegram has been disconnected.');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') return;
    setDeletingAccount(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', { body: { confirm: 'DELETE' } });
      if (error) throw error;
      if (!(data as any)?.success) throw new Error((data as any)?.error || 'Deletion failed');
      await signOut();
    } catch (e: any) {
      Alert.alert('Error', e?.message);
    }
    setDeletingAccount(false);
  };

  const displayName = profileName || user?.email?.split('@')[0] || 'You';
  const primaryEmail = emails.find(e => e.is_primary);
  const initials = displayName.split(' ').map((p: string) => p[0]).slice(0, 2).join('').toUpperCase();
  const planLabel = plan.tier.charAt(0).toUpperCase() + plan.tier.slice(1);
  const primaryCount = emails.filter(e => !e.is_alias).length;
  const aliasCount = emails.filter(e => e.is_alias).length;

  const renderSection = () => {
    switch (activeSection) {
      // ── Profile ──────────────────────────────────────────────────────────
      case 'profile':
        return (
          <View style={styles.sectionContent}>
            <View style={styles.avatarCenter}>
              <View style={styles.bigAvatar}>
                <Text style={styles.bigAvatarText}>{initials}</Text>
              </View>
              <Text style={styles.avatarHint}>Tap to change photo on web</Text>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Display name</Text>
              <TextInput
                style={styles.input}
                value={profileName}
                onChangeText={setProfileName}
                placeholder="Your full name"
                placeholderTextColor={colors.textHint}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.staticField}>
                <Text style={styles.staticValue}>{user?.email ?? ''}</Text>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#34A853" />
                  <Text style={styles.verifiedText}>Verified</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, savingProfile && { opacity: 0.6 }]}
              onPress={handleSaveProfile}
              disabled={savingProfile}
            >
              {savingProfile ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Ionicons name="save-outline" size={16} color="#fff" />
                  <Text style={styles.primaryBtnText}>Save changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        );

      // ── Email settings ────────────────────────────────────────────────────
      case 'email':
        return (
          <View style={styles.sectionContent}>
            {emails.length > 1 && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Settings for</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {emails.map(addr => (
                    <TouchableOpacity
                      key={addr.id}
                      style={[styles.addressChip, selectedEmailId === addr.id && styles.addressChipActive]}
                      onPress={() => setSelectedEmailId(addr.id)}
                    >
                      <Text style={[styles.addressChipText, selectedEmailId === addr.id && styles.addressChipTextActive]}>
                        {addr.full_email}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email signature</Text>
              <TextInput
                style={[styles.input, { minHeight: 100, textAlignVertical: 'top', paddingTop: 12 }]}
                value={userSettings.email_signature}
                onChangeText={v => setUserSettings(s => ({ ...s, email_signature: v }))}
                placeholder="Your email signature"
                placeholderTextColor={colors.textHint}
                multiline
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Default reply-to</Text>
              <TextInput
                style={styles.input}
                value={userSettings.default_reply_to}
                onChangeText={v => setUserSettings(s => ({ ...s, default_reply_to: v }))}
                placeholder="e.g. you@example.com"
                placeholderTextColor={colors.textHint}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Notifications section */}
            <Text style={styles.subsectionTitle}>Notifications</Text>
            <View style={styles.toggleCard}>
              {([
                ['notifications_enabled', 'Push notifications', 'mail-outline'],
                ['notification_new_email', 'New emails', 'mail-unread-outline'],
                ['notification_replies', 'Replies', 'arrow-undo-outline'],
              ] as [keyof UserSettings, string, keyof typeof Ionicons.glyphMap][]).map(([key, label, icon]) => (
                <View key={key} style={styles.toggleRow}>
                  <View style={styles.toggleLeft}>
                    <View style={styles.toggleIcon}>
                      <Ionicons name={icon} size={16} color={colors.primary} />
                    </View>
                    <Text style={styles.toggleLabel}>{label}</Text>
                  </View>
                  <Switch
                    value={userSettings[key] as boolean}
                    onValueChange={v => setUserSettings(s => ({ ...s, [key]: v }))}
                    trackColor={{ false: colors.bgSection, true: colors.primary + 'AA' }}
                    thumbColor={(userSettings[key] as boolean) ? colors.primary : '#fff'}
                    ios_backgroundColor={colors.bgSection}
                  />
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, savingSettings && { opacity: 0.6 }]}
              onPress={handleSaveSettings}
              disabled={savingSettings}
            >
              {savingSettings ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Ionicons name="save-outline" size={16} color="#fff" />
                  <Text style={styles.primaryBtnText}>Save settings</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        );

      // ── Addresses ─────────────────────────────────────────────────────────
      case 'addresses':
        return (
          <View style={styles.sectionContent}>
            <View style={styles.planInfo}>
              <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
              <Text style={styles.planInfoText}>
                {primaryCount}/{Number.isFinite(planLimits.primaryAddresses) ? planLimits.primaryAddresses : '∞'} addresses · {aliasCount}/{Number.isFinite(planLimits.aliases) ? planLimits.aliases : '∞'} aliases
              </Text>
            </View>

            {/* Address list */}
            {emails.map(addr => (
              <View key={addr.id} style={styles.addressCard}>
                <View style={[styles.addressIconWrap, { backgroundColor: addr.is_primary ? colors.primaryLight : colors.bgSection }]}>
                  <Ionicons name="at-outline" size={18} color={addr.is_primary ? colors.primary : colors.textDim} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressEmail}>{addr.full_email}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                    {addr.is_primary && <View style={styles.primaryBadge}><Text style={styles.primaryBadgeText}>Primary</Text></View>}
                    {addr.is_alias && <View style={styles.aliasBadge}><Text style={styles.aliasBadgeText}>Alias</Text></View>}
                  </View>
                </View>
                {!addr.is_primary && (
                  <TouchableOpacity onPress={() => handleDeleteEmail(addr)} style={{ padding: 8 }}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* Create new address */}
            <Text style={styles.subsectionTitle}>Add new address</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="username"
                placeholderTextColor={colors.textHint}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.domainSuffix}>@afuchat.com</Text>
              <TouchableOpacity
                style={[styles.miniBtn, !newEmail.trim() && { opacity: 0.4 }]}
                onPress={handleCreateEmail}
                disabled={!newEmail.trim() || creatingEmail}
              >
                {creatingEmail ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="add" size={20} color="#fff" />}
              </TouchableOpacity>
            </View>

            {/* Create alias */}
            <Text style={styles.subsectionTitle}>Add alias</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={newAlias}
                onChangeText={setNewAlias}
                placeholder="alias"
                placeholderTextColor={colors.textHint}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.domainSuffix}>@afuchat.com</Text>
              <TouchableOpacity
                style={[styles.miniBtn, { backgroundColor: '#34A853' }, !newAlias.trim() && { opacity: 0.4 }]}
                onPress={handleCreateAlias}
                disabled={!newAlias.trim() || creatingAlias}
              >
                {creatingAlias ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="add" size={20} color="#fff" />}
              </TouchableOpacity>
            </View>
          </View>
        );

      // ── Billing ───────────────────────────────────────────────────────────
      case 'billing':
        return (
          <View style={styles.sectionContent}>
            {/* Plan card */}
            <View style={[styles.planCard, { borderColor: plan.isAdmin ? colors.yellow : colors.primary }]}>
              <View style={styles.planCardTop}>
                <View style={styles.planBadge}>
                  <Ionicons name={plan.isAdmin ? 'shield-checkmark' : 'flash'} size={16} color="#fff" />
                  <Text style={styles.planBadgeText}>{planLabel} Plan</Text>
                </View>
                {plan.currentPeriodEnd && (
                  <Text style={styles.planExpiry}>
                    Renews {new Date(plan.currentPeriodEnd).toLocaleDateString()}
                  </Text>
                )}
              </View>

              {/* Plan limits */}
              <View style={styles.limitsGrid}>
                {[
                  ['At signs', `${Number.isFinite(planLimits.primaryAddresses) ? planLimits.primaryAddresses : '∞'} addresses`],
                  ['Aliases', `${Number.isFinite(planLimits.aliases) ? planLimits.aliases : '∞'} aliases`],
                  ['Storage', planLimits.attachmentStorageLabel],
                  ['Custom domain', planLimits.customDomain ? '✓' : '✗'],
                ].map(([label, value]) => (
                  <View key={label} style={styles.limitItem}>
                    <Text style={styles.limitValue}>{value}</Text>
                    <Text style={styles.limitLabel}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Storage usage */}
            <View style={styles.storageCard}>
              <View style={styles.storageHeader}>
                <Ionicons name="server-outline" size={18} color={colors.primary} />
                <Text style={styles.storageTitle}>Storage usage</Text>
                <Text style={styles.storageValue}>
                  {formatBytes(usedBytes)} / {formatBytes(quotaBytes)}
                </Text>
              </View>
              <View style={styles.storageBar}>
                <View style={[
                  styles.storageBarFill,
                  { width: `${usedPercent}%` as any, backgroundColor: usedPercent > 80 ? colors.danger : colors.primary },
                ]} />
              </View>
              <Text style={styles.storagePercent}>{usedPercent}% used</Text>
            </View>

            {plan.tier === 'starter' && (
              <View style={styles.upgradeCard}>
                <Text style={styles.upgradeTitle}>Unlock more with Professional</Text>
                <Text style={styles.upgradeSub}>More addresses, aliases, 5 GB storage, and custom domains.</Text>
                <TouchableOpacity style={styles.primaryBtn}>
                  <Ionicons name="flash-outline" size={16} color="#fff" />
                  <Text style={styles.primaryBtnText}>Upgrade plan</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      // ── Integrations ──────────────────────────────────────────────────────
      case 'integrations':
        return (
          <View style={styles.sectionContent}>
            {/* Telegram */}
            <View style={styles.integrationCard}>
              <View style={[styles.intIconWrap, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={22} color='#2AABEE' />
              </View>
              <View style={styles.intInfo}>
                <Text style={styles.intName}>Telegram</Text>
                <Text style={styles.intSub}>
                  {telegramLinked
                    ? `Connected${telegramUsername ? ` as @${telegramUsername}` : ''}`
                    : 'Get email notifications via Telegram bot'}
                </Text>
              </View>
              {telegramLinked ? (
                <TouchableOpacity style={styles.unlinkBtn} onPress={handleUnlinkTelegram}>
                  <Text style={styles.unlinkBtnText}>Unlink</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.integrationBadge, { backgroundColor: '#E8F5E9' }]}>
                  <Text style={[styles.integrationBadgeText, { color: '#2E7D32' }]}>Available</Text>
                </View>
              )}
            </View>

            {!telegramLinked && (
              <View style={styles.telegramSetup}>
                <Text style={styles.telegramStep}>
                  1. Message <Text style={{ fontWeight: '700', color: '#2AABEE' }}>@AfuChatBot</Text> on Telegram
                </Text>
                <Text style={styles.telegramStep}>
                  2. Send /start to get your link code
                </Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={telegramCode}
                    onChangeText={setTelegramCode}
                    placeholder="Enter link code"
                    placeholderTextColor={colors.textHint}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={[styles.miniBtn, !telegramCode.trim() && { opacity: 0.4 }]}
                    onPress={handleLinkTelegram}
                    disabled={!telegramCode.trim() || linkingTelegram}
                  >
                    {linkingTelegram ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Link</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Templates */}
            <TouchableOpacity
              style={styles.integrationCard}
              onPress={() => navigation.navigate('EmailTemplates')}
              activeOpacity={0.7}
            >
              <View style={[styles.intIconWrap, { backgroundColor: '#F3E5F5' }]}>
                <Ionicons name="document-text-outline" size={22} color='#9C27B0' />
              </View>
              <View style={styles.intInfo}>
                <Text style={styles.intName}>Email Templates</Text>
                <Text style={styles.intSub}>Create and manage reusable email templates</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textHint} />
            </TouchableOpacity>
          </View>
        );

      // ── Danger zone ───────────────────────────────────────────────────────
      case 'danger':
        return (
          <View style={styles.sectionContent}>
            <View style={styles.dangerCard}>
              <View style={styles.dangerHeader}>
                <Ionicons name="warning-outline" size={20} color={colors.danger} />
                <Text style={styles.dangerTitle}>Delete account</Text>
              </View>
              <Text style={styles.dangerText}>
                Permanently delete your account and all associated data. This action cannot be undone.
              </Text>
              <TouchableOpacity
                style={styles.dangerBtn}
                onPress={() => setDeleteModalOpen(true)}
              >
                <Ionicons name="trash-outline" size={16} color={colors.danger} />
                <Text style={styles.dangerBtnText}>Delete my account</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.signOutCard} onPress={() => {
              Alert.alert('Sign out?', '', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign out', style: 'destructive', onPress: signOut },
              ]);
            }}>
              <Ionicons name="log-out-outline" size={20} color={colors.danger} />
              <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.bgCard} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileRow}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>{initials}</Text>
            </View>
            <View>
              <Text style={styles.headerName}>{displayName}</Text>
              <Text style={styles.headerEmail} numberOfLines={1}>{primaryEmail?.full_email ?? user?.email ?? ''}</Text>
            </View>
            <View style={{ flex: 1 }} />
            <View style={[styles.headerPlan, { backgroundColor: plan.isAdmin ? '#FEF7E0' : colors.primaryLight }]}>
              <Ionicons
                name={plan.isAdmin ? 'shield-checkmark' : 'flash'}
                size={12}
                color={plan.isAdmin ? colors.yellow : colors.primary}
              />
              <Text style={[styles.headerPlanText, { color: plan.isAdmin ? colors.yellow : colors.primary }]}>
                {planLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Section tabs (matches Settings.tsx mobile grid) */}
        <View style={styles.sectionTabs}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
            {SECTIONS.map(s => (
              <TouchableOpacity
                key={s.id}
                style={[styles.tab, activeSection === s.id && styles.tabActive]}
                onPress={() => setActiveSection(s.id)}
              >
                <Ionicons
                  name={s.icon}
                  size={15}
                  color={activeSection === s.id ? colors.primary : colors.textDim}
                />
                <Text style={[styles.tabLabel, activeSection === s.id && styles.tabLabelActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Section content */}
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {renderSection()}
          <View style={{ height: 60 }} />
        </ScrollView>

        {/* Delete account confirmation modal */}
        <Modal visible={deleteModalOpen} transparent animationType="fade" onRequestClose={() => setDeleteModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.confirmModal}>
              <Ionicons name="warning" size={40} color={colors.danger} style={{ alignSelf: 'center' }} />
              <Text style={styles.confirmTitle}>Delete account?</Text>
              <Text style={styles.confirmText}>
                This will permanently delete your account and all data. Type DELETE to confirm.
              </Text>
              <TextInput
                style={[styles.input, { borderColor: deleteConfirm === 'DELETE' ? colors.danger : colors.border }]}
                value={deleteConfirm}
                onChangeText={setDeleteConfirm}
                placeholder="Type DELETE"
                placeholderTextColor={colors.textHint}
                autoCapitalize="characters"
              />
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <TouchableOpacity
                  style={[styles.confirmCancelBtn]}
                  onPress={() => { setDeleteModalOpen(false); setDeleteConfirm(''); }}
                >
                  <Text style={styles.confirmCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmDeleteBtn, deleteConfirm !== 'DELETE' && { opacity: 0.4 }]}
                  onPress={handleDeleteAccount}
                  disabled={deleteConfirm !== 'DELETE' || deletingAccount}
                >
                  {deletingAccount ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmDeleteText}>Delete</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    backgroundColor: colors.bgCard,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatar: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerName: { fontSize: 16, fontWeight: '700', color: colors.text },
  headerEmail: { fontSize: 12, color: colors.textFaint, marginTop: 1 },
  headerPlan: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4,
  },
  headerPlanText: { fontSize: 11, fontWeight: '700' },

  sectionTabs: {
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tabsContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bgSection,
  },
  tabActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  tabLabel: { fontSize: 12, fontWeight: '600', color: colors.textDim },
  tabLabelActive: { color: colors.primary },

  scroll: { flex: 1 },
  sectionContent: { padding: 16, gap: 16 },

  avatarCenter: { alignItems: 'center', paddingVertical: 16, gap: 10 },
  bigAvatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  bigAvatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  avatarHint: { fontSize: 12, color: colors.textFaint },

  formGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textDim },
  input: {
    backgroundColor: colors.bgSection, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.text,
  },
  staticField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  staticValue: { fontSize: 15, color: colors.textDim },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verifiedText: { fontSize: 12, color: '#34A853', fontWeight: '600' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14,
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  subsectionTitle: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.8, color: colors.textFaint, marginTop: 8,
  },
  toggleCard: {
    backgroundColor: colors.bgCard, borderRadius: 16,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  toggleLabel: { fontSize: 15, color: colors.text },

  planInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primaryLight, borderRadius: 10, padding: 10,
  },
  planInfoText: { fontSize: 13, color: colors.primary, fontWeight: '500' },

  addressCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgCard, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, padding: 14,
  },
  addressIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  addressEmail: { fontSize: 14, fontWeight: '500', color: colors.text },
  primaryBadge: { backgroundColor: colors.primaryLight, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  primaryBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  aliasBadge: { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  aliasBadgeText: { fontSize: 10, fontWeight: '700', color: '#2E7D32' },

  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  domainSuffix: { fontSize: 13, color: colors.textFaint, flexShrink: 0 },
  miniBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },

  addressChip: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7, marginRight: 8,
  },
  addressChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  addressChipText: { fontSize: 12, color: colors.textDim },
  addressChipTextActive: { color: colors.primary, fontWeight: '600' },

  planCard: {
    backgroundColor: colors.bgCard, borderRadius: 16, borderWidth: 2, padding: 16, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  planCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  planBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  planExpiry: { fontSize: 12, color: colors.textFaint },
  limitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  limitItem: {
    flex: 1, minWidth: '45%',
    backgroundColor: colors.bgSection, borderRadius: 10, padding: 10, gap: 2,
  },
  limitValue: { fontSize: 16, fontWeight: '700', color: colors.text },
  limitLabel: { fontSize: 11, color: colors.textFaint },

  storageCard: {
    backgroundColor: colors.bgCard, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 10,
  },
  storageHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  storageTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  storageValue: { fontSize: 12, color: colors.textFaint },
  storageBar: { height: 6, backgroundColor: colors.bgSection, borderRadius: 3, overflow: 'hidden' },
  storageBarFill: { height: 6, borderRadius: 3 },
  storagePercent: { fontSize: 11, color: colors.textFaint },

  upgradeCard: {
    backgroundColor: colors.primaryLight, borderRadius: 16, borderWidth: 1, borderColor: colors.primary + '40', padding: 16, gap: 8,
  },
  upgradeTitle: { fontSize: 16, fontWeight: '700', color: colors.primaryDark },
  upgradeSub: { fontSize: 13, color: colors.primary },

  integrationCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14,
  },
  intIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  intInfo: { flex: 1 },
  intName: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 2 },
  intSub: { fontSize: 12, color: colors.textFaint },
  integrationBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  integrationBadgeText: { fontSize: 11, fontWeight: '700' },
  unlinkBtn: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  unlinkBtnText: { fontSize: 13, fontWeight: '600', color: colors.textDim },

  telegramSetup: { gap: 8 },
  telegramStep: { fontSize: 13, color: colors.textMuted },

  dangerCard: {
    backgroundColor: '#FFF5F5', borderRadius: 16, borderWidth: 1, borderColor: '#FECACA', padding: 16, gap: 12,
  },
  dangerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dangerTitle: { fontSize: 16, fontWeight: '700', color: colors.danger },
  dangerText: { fontSize: 13, color: colors.textMuted, lineHeight: 20 },
  dangerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#FECACA', borderRadius: 12, padding: 12, alignSelf: 'flex-start',
  },
  dangerBtnText: { color: colors.danger, fontWeight: '600', fontSize: 14 },
  signOutCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: colors.bgCard, borderRadius: 16, borderWidth: 1.5, borderColor: '#FECACA', paddingVertical: 16,
  },
  signOutText: { color: colors.danger, fontWeight: '600', fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  confirmModal: { width: '100%', backgroundColor: colors.bgCard, borderRadius: 20, padding: 24, gap: 12 },
  confirmTitle: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  confirmText: { fontSize: 13, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  confirmCancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  confirmCancelText: { fontWeight: '600', color: colors.textDim },
  confirmDeleteBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: colors.danger, alignItems: 'center',
  },
  confirmDeleteText: { color: '#fff', fontWeight: '700' },
});

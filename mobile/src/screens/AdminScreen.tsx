import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, Switch, ActivityIndicator, TextInput, Modal,
  StatusBar, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../lib/colors';

interface UserData {
  user_id: string;
  auth_email: string | null;
  email_count: number;
  is_admin: boolean;
  email_addresses: string[];
  created_at: string;
  is_banned?: boolean;
  ban_reason?: string | null;
}

interface UserEmail {
  id: string;
  subject: string;
  from_address: string;
  to_addresses: string[];
  body_text: string | null;
  is_read: boolean;
  created_at: string;
  folder_type: string | null;
}

// Same as Admin.tsx — fetches all users via admin_get_all_users RPC or direct
export default function AdminScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [viewingEmails, setViewingEmails] = useState<string | null>(null);
  const [userEmails, setUserEmails] = useState<UserEmail[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banTargetUser, setBanTargetUser] = useState<UserData | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banningUser, setBanningUser] = useState(false);
  const [togglingUser, setTogglingUser] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    checkAdminAndFetchUsers();
  }, []);

  const checkAdminAndFetchUsers = async () => {
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { navigation.goBack(); return; }

      const { data: roleRow } = await supabase
        .from('user_roles').select('role').eq('user_id', u.id).eq('role', 'admin').maybeSingle();
      if (!roleRow) { navigation.goBack(); return; }
      setIsAdmin(true);

      const { data, error } = await (supabase as any).rpc('admin_get_all_users');
      if (!error && data) setUsers(data);
    } catch {}
    setLoading(false);
  };

  const toggleAdmin = async (targetUser: UserData) => {
    setTogglingUser(targetUser.user_id);
    try {
      if (targetUser.is_admin) {
        await supabase.from('user_roles').delete()
          .eq('user_id', targetUser.user_id).eq('role', 'admin');
      } else {
        await supabase.from('user_roles').insert({ user_id: targetUser.user_id, role: 'admin' });
      }
      setUsers(prev => prev.map(u =>
        u.user_id === targetUser.user_id ? { ...u, is_admin: !u.is_admin } : u
      ));
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to toggle admin');
    }
    setTogglingUser(null);
  };

  const fetchUserEmails = async (userId: string) => {
    setLoadingEmails(true);
    try {
      const { data } = await (supabase as any).rpc('admin_get_user_emails', { target_user_id: userId });
      setUserEmails(data ?? []);
    } catch {}
    setLoadingEmails(false);
  };

  const handleBan = async () => {
    if (!banTargetUser) return;
    setBanningUser(true);
    try {
      await (supabase as any).rpc('admin_ban_user', {
        target_user_id: banTargetUser.user_id,
        reason: banReason.trim() || null,
      });
      setUsers(prev => prev.map(u =>
        u.user_id === banTargetUser.user_id ? { ...u, is_banned: !u.is_banned, ban_reason: banReason || null } : u
      ));
      setBanDialogOpen(false);
      setBanReason('');
      setBanTargetUser(null);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to ban user');
    }
    setBanningUser(false);
  };

  const filteredUsers = users.filter(u =>
    !searchQuery || (u.auth_email ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email_addresses.some(e => e.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalEmails = users.reduce((s, u) => s + u.email_count, 0);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgCard} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textDim} />
        </TouchableOpacity>
        <View style={styles.headerLeft}>
          <View style={styles.shieldBadge}>
            <Ionicons name="shield-checkmark" size={18} color={colors.yellow} />
          </View>
          <Text style={styles.headerTitle}>Admin Panel</Text>
        </View>
      </View>

      {/* Stats cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="people-outline" size={22} color={colors.primary} />
          <Text style={styles.statNum}>{users.length}</Text>
          <Text style={styles.statLabel}>Users</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="mail-outline" size={22} color='#34A853' />
          <Text style={styles.statNum}>{totalEmails.toLocaleString()}</Text>
          <Text style={styles.statLabel}>Emails</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="shield-outline" size={22} color={colors.yellow} />
          <Text style={styles.statNum}>{users.filter(u => u.is_admin).length}</Text>
          <Text style={styles.statLabel}>Admins</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="ban-outline" size={22} color={colors.danger} />
          <Text style={styles.statNum}>{users.filter(u => u.is_banned).length}</Text>
          <Text style={styles.statLabel}>Banned</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textHint} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor={colors.textHint}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {filteredUsers.map(u => (
          <View key={u.user_id} style={styles.userCard}>
            {/* User row */}
            <TouchableOpacity
              style={styles.userRow}
              onPress={() => setExpandedUsers(prev => {
                const next = new Set(prev);
                if (next.has(u.user_id)) next.delete(u.user_id); else next.add(u.user_id);
                return next;
              })}
              activeOpacity={0.7}
            >
              <View style={[styles.userAvatar, u.is_admin && styles.userAvatarAdmin]}>
                <Text style={styles.userAvatarText}>
                  {(u.auth_email?.[0] ?? '?').toUpperCase()}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.userEmail} numberOfLines={1}>{u.auth_email ?? 'Unknown'}</Text>
                  {u.is_admin && (
                    <View style={styles.adminBadge}>
                      <Ionicons name="shield-checkmark" size={10} color={colors.yellow} />
                      <Text style={styles.adminBadgeText}>Admin</Text>
                    </View>
                  )}
                  {u.is_banned && (
                    <View style={styles.bannedBadge}>
                      <Text style={styles.bannedBadgeText}>Banned</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.userMeta}>
                  {u.email_count} emails · {u.email_addresses.length} address{u.email_addresses.length !== 1 ? 'es' : ''}
                </Text>
              </View>
              <Ionicons
                name={expandedUsers.has(u.user_id) ? 'chevron-up' : 'chevron-down'}
                size={16} color={colors.textHint}
              />
            </TouchableOpacity>

            {/* Expanded actions */}
            {expandedUsers.has(u.user_id) && (
              <View style={styles.expandedSection}>
                <Text style={styles.expandedLabel}>
                  Joined: {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}
                </Text>

                {/* Email addresses */}
                {u.email_addresses.length > 0 && (
                  <View style={styles.addressList}>
                    {u.email_addresses.slice(0, 3).map(addr => (
                      <View key={addr} style={styles.addressChip}>
                        <Ionicons name="at" size={11} color={colors.primary} />
                        <Text style={styles.addressChipText}>{addr}</Text>
                      </View>
                    ))}
                    {u.email_addresses.length > 3 && (
                      <Text style={styles.moreBadge}>+{u.email_addresses.length - 3} more</Text>
                    )}
                  </View>
                )}

                <View style={styles.actionRow}>
                  {/* Toggle admin */}
                  <View style={styles.adminToggleRow}>
                    <Ionicons name="shield-outline" size={16} color={u.is_admin ? colors.yellow : colors.textDim} />
                    <Text style={styles.adminToggleLabel}>Admin</Text>
                    {togglingUser === u.user_id ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Switch
                        value={u.is_admin}
                        onValueChange={() => toggleAdmin(u)}
                        trackColor={{ false: colors.bgSection, true: colors.yellow + '80' }}
                        thumbColor={u.is_admin ? colors.yellow : '#fff'}
                        ios_backgroundColor={colors.bgSection}
                      />
                    )}
                  </View>

                  {/* View emails */}
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => {
                      setViewingEmails(viewingEmails === u.user_id ? null : u.user_id);
                      if (viewingEmails !== u.user_id) fetchUserEmails(u.user_id);
                    }}
                  >
                    <Ionicons name="eye-outline" size={16} color={colors.primary} />
                    <Text style={[styles.actionBtnText, { color: colors.primary }]}>Emails</Text>
                  </TouchableOpacity>

                  {/* Ban / Unban */}
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: u.is_banned ? '#34A853' : '#FECACA' }]}
                    onPress={() => {
                      if (u.is_banned) {
                        Alert.alert('Unban user?', `Remove ban from ${u.auth_email}?`, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Unban', onPress: () => handleBanAction(u, false) },
                        ]);
                      } else {
                        setBanTargetUser(u);
                        setBanDialogOpen(true);
                      }
                    }}
                  >
                    <Ionicons
                      name={u.is_banned ? 'checkmark-circle-outline' : 'ban-outline'}
                      size={16}
                      color={u.is_banned ? '#34A853' : colors.danger}
                    />
                    <Text style={[styles.actionBtnText, { color: u.is_banned ? '#34A853' : colors.danger }]}>
                      {u.is_banned ? 'Unban' : 'Ban'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* User emails list */}
                {viewingEmails === u.user_id && (
                  <View style={styles.emailsSection}>
                    <Text style={styles.emailsSectionTitle}>Recent emails</Text>
                    {loadingEmails ? (
                      <ActivityIndicator color={colors.primary} size="small" />
                    ) : userEmails.length === 0 ? (
                      <Text style={styles.noEmailsText}>No emails found</Text>
                    ) : (
                      userEmails.slice(0, 5).map(e => (
                        <View key={e.id} style={styles.emailRow}>
                          <View style={[styles.folderDot, {
                            backgroundColor: e.folder_type === 'inbox' ? colors.primary : '#34A853'
                          }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.emailSubject} numberOfLines={1}>
                              {e.subject || '(no subject)'}
                            </Text>
                            <Text style={styles.emailFrom} numberOfLines={1}>{e.from_address}</Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        ))}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Ban dialog */}
      <Modal visible={banDialogOpen} transparent animationType="fade" onRequestClose={() => setBanDialogOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.banModal}>
            <Text style={styles.banTitle}>Ban user</Text>
            <Text style={styles.banSub}>
              {banTargetUser?.auth_email}
            </Text>
            <Text style={styles.banLabel}>Reason (optional)</Text>
            <TextInput
              style={styles.banInput}
              value={banReason}
              onChangeText={setBanReason}
              placeholder="Reason for ban..."
              placeholderTextColor={colors.textHint}
              multiline
              numberOfLines={3}
            />
            <View style={styles.banActions}>
              <TouchableOpacity style={styles.banCancelBtn} onPress={() => { setBanDialogOpen(false); setBanReason(''); }}>
                <Text style={styles.banCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.banConfirmBtn} onPress={handleBan} disabled={banningUser}>
                {banningUser ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.banConfirmText}>Ban user</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  async function handleBanAction(targetUser: UserData, ban: boolean) {
    try {
      await (supabase as any).rpc('admin_ban_user', { target_user_id: targetUser.user_id, reason: null, unban: !ban });
      setUsers(prev => prev.map(u =>
        u.user_id === targetUser.user_id ? { ...u, is_banned: ban } : u
      ));
    } catch (e: any) {
      Alert.alert('Error', e?.message);
    }
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    paddingBottom: 12,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 4,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  shieldBadge: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#FEF7E0', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.text },

  statsRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statCard: {
    flex: 1, alignItems: 'center', gap: 4,
    backgroundColor: colors.bgSection,
    borderRadius: 12, padding: 10,
    borderWidth: 1, borderColor: colors.border,
  },
  statNum: { fontSize: 18, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textFaint, fontWeight: '500' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    margin: 12, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: colors.bgSection,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },

  scroll: { flex: 1 },

  userCard: {
    marginHorizontal: 12, marginBottom: 8,
    backgroundColor: colors.bgCard,
    borderRadius: 14, borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
  },
  userAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  userAvatarAdmin: { backgroundColor: colors.yellow },
  userAvatarText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  userInfo: { flex: 1 },
  userEmail: { fontSize: 14, fontWeight: '600', color: colors.text },
  userMeta: { fontSize: 12, color: colors.textFaint, marginTop: 2 },
  adminBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FEF7E0', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
  adminBadgeText: { fontSize: 10, fontWeight: '700', color: colors.yellow },
  bannedBadge: {
    backgroundColor: '#FCE8E6', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
  bannedBadgeText: { fontSize: 10, fontWeight: '700', color: colors.danger },

  expandedSection: {
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
  },
  expandedLabel: { fontSize: 12, color: colors.textFaint },
  addressList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  addressChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.primaryLight, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  addressChipText: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  moreBadge: { fontSize: 11, color: colors.textFaint, alignSelf: 'center' },

  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  adminToggleRow: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.bgSection, borderRadius: 10, padding: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  adminToggleLabel: { flex: 1, fontSize: 13, color: colors.textDim, fontWeight: '500' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: colors.bgCard,
  },
  actionBtnText: { fontSize: 12, fontWeight: '600' },

  emailsSection: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 6 },
  emailsSectionTitle: { fontSize: 12, fontWeight: '700', color: colors.textDim, marginBottom: 4 },
  noEmailsText: { fontSize: 13, color: colors.textFaint },
  emailRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.bgSection, borderRadius: 8, padding: 8,
  },
  folderDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  emailSubject: { fontSize: 13, fontWeight: '500', color: colors.text },
  emailFrom: { fontSize: 11, color: colors.textFaint },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  banModal: {
    width: '100%', backgroundColor: colors.bgCard,
    borderRadius: 16, padding: 20, gap: 12,
  },
  banTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  banSub: { fontSize: 13, color: colors.textFaint },
  banLabel: { fontSize: 13, fontWeight: '600', color: colors.textDim },
  banInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    padding: 12, fontSize: 14, color: colors.text,
    backgroundColor: colors.bgSection, textAlignVertical: 'top',
    minHeight: 80,
  },
  banActions: { flexDirection: 'row', gap: 10 },
  banCancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center',
  },
  banCancelText: { color: colors.textDim, fontWeight: '600' },
  banConfirmBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: colors.danger, alignItems: 'center',
  },
  banConfirmText: { color: '#fff', fontWeight: '700' },
});

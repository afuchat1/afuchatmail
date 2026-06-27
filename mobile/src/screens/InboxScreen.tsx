import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, TextInput, StatusBar,
  Modal, ScrollView, Pressable, Alert, Platform, Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import {
  useEmails, useFolders, useUnreadCounts,
  useEmailAddresses, folderLabel,
} from '../hooks/useEmails';
import EmailListItem from '../components/EmailListItem';
import { SwipeableRow } from '../components/SwipeableRow';
import { StatusDot } from '../components/StatusDot';
import { colors } from '../lib/colors';
import { RootStackParamList, Email, EmailThread, Folder } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ActiveTab = 'mail' | 'search';

// ─── Folder icon map (same as EmailSidebar) ──────────────────────────────

const FOLDER_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  inbox:    'mail-outline',
  sent:     'paper-plane-outline',
  drafts:   'create-outline',
  spam:     'warning-outline',
  trash:    'trash-outline',
  starred:  'star-outline',
  archive:  'archive-outline',
  snoozed:  'time-outline',
};

function getFolderIcon(folder: Folder): keyof typeof Ionicons.glyphMap {
  return FOLDER_ICON[folder.type] || FOLDER_ICON[folder.icon] || 'folder-outline';
}

// ─── Folder Drawer (mirrors EmailSidebar layout & sections) ──────────────

interface FolderDrawerProps {
  visible: boolean;
  onClose: () => void;
  folders: Folder[];
  selectedFolderId: string | null;
  onFolderSelect: (id: string) => void;
  unreadCounts: Record<string, number>;
  selectedAddressId: string | null;
  addresses: { id: string; full_email: string; is_primary: boolean }[];
  onAddressChange: (id: string) => void;
  onCompose: () => void;
  onSettings: () => void;
  onAdmin: () => void;
  userEmail: string;
  activePlan?: string | null;
  isAdmin: boolean;
  onSignOut: () => void;
}

function FolderDrawer({
  visible, onClose, folders, selectedFolderId, onFolderSelect,
  unreadCounts, selectedAddressId, addresses, onAddressChange,
  onCompose, onSettings, onAdmin, userEmail, activePlan, isAdmin, onSignOut,
}: FolderDrawerProps) {
  const slideAnim = useRef(new Animated.Value(-320)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : -320,
      useNativeDriver: true,
      tension: 100,
      friction: 12,
    }).start();
  }, [visible]);

  // Same sections as EmailSidebar
  const primaryTypes = ['inbox', 'starred', 'snoozed'];
  const sendTypes = ['sent', 'drafts'];
  const manageTypes = ['archive', 'spam', 'trash'];
  const primary = folders.filter(f => primaryTypes.includes(f.type));
  const send = folders.filter(f => sendTypes.includes(f.type));
  const manage = folders.filter(f => manageTypes.includes(f.type));
  const other = folders.filter(
    f => !primaryTypes.includes(f.type) && !sendTypes.includes(f.type) && !manageTypes.includes(f.type)
  );

  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : 'AC';
  const planLabel = activePlan ? activePlan.charAt(0).toUpperCase() + activePlan.slice(1) : null;

  const renderFolderRow = (folder: Folder) => {
    const isSelected = selectedFolderId === folder.id;
    const unread = unreadCounts[folder.id] || 0;
    return (
      <TouchableOpacity
        key={folder.id}
        style={[styles.drawerFolderRow, isSelected && styles.drawerFolderRowActive]}
        onPress={() => { onFolderSelect(folder.id); onClose(); }}
        activeOpacity={0.7}
      >
        <Ionicons
          name={getFolderIcon(folder)}
          size={18}
          color={isSelected ? colors.primary : colors.textDim}
          style={{ marginRight: 12 }}
        />
        <Text style={[styles.drawerFolderLabel, isSelected && styles.drawerFolderLabelActive]}>
          {folderLabel(folder)}
        </Text>
        {unread > 0 && (
          <View style={[styles.drawerBadge, isSelected && styles.drawerBadgeActive]}>
            <Text style={[styles.drawerBadgeText, isSelected && styles.drawerBadgeTextActive]}>
              {unread > 99 ? '99+' : unread}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.drawerOverlay}>
        <Pressable style={styles.drawerBackdrop} onPress={onClose} />
        <Animated.View style={[styles.drawerPanel, { transform: [{ translateX: slideAnim }] }]}>

          {/* Brand + Account (same as EmailSidebar header) */}
          <View style={styles.drawerHeader}>
            <View style={styles.drawerBrandRow}>
              <View style={styles.drawerLogo}>
                <Ionicons name="mail" size={16} color="#fff" />
              </View>
              <Text style={styles.drawerBrandName}>AfuChat Mail</Text>
              {planLabel && (
                <View style={styles.planBadge}>
                  <Text style={styles.planBadgeText}>{planLabel}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.drawerAvatarBtn} onPress={onSettings}>
              <View style={styles.drawerAvatar}>
                <Text style={styles.drawerAvatarText}>{initials}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Email address switcher */}
          <View style={styles.drawerAddressSwitcher}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
              {addresses.map(addr => (
                <TouchableOpacity
                  key={addr.id}
                  style={[
                    styles.addressChip,
                    (selectedAddressId === addr.id || (selectedAddressId === null && addr.is_primary)) &&
                      styles.addressChipActive,
                  ]}
                  onPress={() => onAddressChange(addr.id)}
                >
                  <Text style={[
                    styles.addressChipText,
                    (selectedAddressId === addr.id || (selectedAddressId === null && addr.is_primary)) &&
                      styles.addressChipTextActive,
                  ]} numberOfLines={1}>
                    {addr.full_email}
                  </Text>
                </TouchableOpacity>
              ))}
              {addresses.length > 1 && (
                <TouchableOpacity
                  style={[styles.addressChip, selectedAddressId === 'all' && styles.addressChipActive]}
                  onPress={() => onAddressChange('all')}
                >
                  <Text style={[styles.addressChipText, selectedAddressId === 'all' && styles.addressChipTextActive]}>
                    All inboxes
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* Compose button */}
          <TouchableOpacity style={styles.drawerComposeBtn} onPress={() => { onCompose(); onClose(); }}>
            <Ionicons name="create-outline" size={16} color="#fff" />
            <Text style={styles.drawerComposeBtnText}>Compose</Text>
          </TouchableOpacity>

          {/* Sectioned nav (same as EmailSidebar sections) */}
          <ScrollView style={styles.drawerNav} showsVerticalScrollIndicator={false}>
            {primary.length > 0 && (
              <View>
                <Text style={styles.drawerSectionLabel}>Mail</Text>
                {primary.map(renderFolderRow)}
              </View>
            )}
            {send.length > 0 && (
              <View>
                <Text style={styles.drawerSectionLabel}>Send</Text>
                {send.map(renderFolderRow)}
              </View>
            )}
            {manage.length > 0 && (
              <View>
                <Text style={styles.drawerSectionLabel}>Manage</Text>
                {manage.map(renderFolderRow)}
              </View>
            )}
            {other.length > 0 && (
              <View>
                <Text style={styles.drawerSectionLabel}>Folders</Text>
                {other.map(renderFolderRow)}
              </View>
            )}

            <Text style={styles.drawerSectionLabel}>Workspace</Text>
            <TouchableOpacity style={styles.drawerFolderRow} onPress={() => { onSettings(); onClose(); }}>
              <Ionicons name="settings-outline" size={18} color={colors.textDim} style={{ marginRight: 12 }} />
              <Text style={styles.drawerFolderLabel}>Settings</Text>
            </TouchableOpacity>
            {isAdmin && (
              <TouchableOpacity style={styles.drawerFolderRow} onPress={() => { onAdmin(); onClose(); }}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.yellow} style={{ marginRight: 12 }} />
                <Text style={[styles.drawerFolderLabel, { color: colors.yellow }]}>Admin Panel</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.drawerFolderRow} onPress={onSignOut}>
              <Ionicons name="log-out-outline" size={18} color={colors.danger} style={{ marginRight: 12 }} />
              <Text style={[styles.drawerFolderLabel, { color: colors.danger }]}>Sign out</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Thread list item wrapper ─────────────────────────────────────────────

interface ThreadRowProps {
  thread: EmailThread;
  onPress: () => void;
  onStar: () => void;
  onDelete: () => void;
  selected: boolean;
  selectMode: boolean;
  onLongPress: () => void;
  onToggleSelect: () => void;
}

function ThreadRow({ thread, onPress, onStar, onDelete, selected, selectMode, onLongPress, onToggleSelect }: ThreadRowProps) {
  const email = thread.latest_email;
  return (
    <View style={styles.threadRowWrap}>
      {selectMode && (
        <TouchableOpacity style={styles.threadCheckbox} onPress={onToggleSelect}>
          <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
            {selected && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
        </TouchableOpacity>
      )}
      <View style={{ flex: 1 }}>
        {/* SwipeableRow: swipe-right=star, swipe-left=delete — same as EmailList on website */}
        <SwipeableRow
          onSwipeLeft={selectMode ? undefined : onDelete}
          onSwipeRight={selectMode ? undefined : onStar}
          leftIcon="delete"
          rightIcon="star"
        >
          <EmailListItem
            email={{ ...email, subject: thread.emails.length > 1 ? `${email.subject} (${thread.emails.length})` : email.subject }}
            onPress={selectMode ? onToggleSelect : onPress}
            onStar={onStar}
            onLongPress={onLongPress}
          />
        </SwipeableRow>
      </View>
    </View>
  );
}

// ─── InboxScreen (mirrors Dashboard.tsx mobile layout) ───────────────────

export default function InboxScreen() {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<Nav>();

  const [activeTab, setActiveTab] = useState<ActiveTab>('mail');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const searchRef = useRef<TextInput>(null);

  // Bulk select state (same as EmailList)
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { folders } = useFolders(user?.id);
  const { addresses } = useEmailAddresses(user?.id);
  const { counts: unreadCounts } = useUnreadCounts(user?.id, selectedAddressId);

  const {
    threads, loading, refreshing, offline, isTrashFolder, refresh,
    toggleStar, markRead, deleteEmail, restoreEmail,
    bulkMarkAsRead, bulkDelete, markAllAsRead,
  } = useEmails({
    userId: user?.id,
    folderId: selectedFolderId ?? undefined,
    emailAddressId: selectedAddressId,
    searchQuery: activeTab === 'search' ? searchQuery : '',
    refreshTrigger,
  });

  // Set inbox as default folder (same as EmailSidebar's fetchFolders)
  useEffect(() => {
    if (folders.length > 0 && !selectedFolderId) {
      const inbox = folders.find(f => f.type === 'inbox');
      if (inbox) setSelectedFolderId(inbox.id);
    }
  }, [folders]);

  // Set primary email address as default
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const primary = addresses.find(a => a.is_primary) ?? addresses[0];
      if (primary) setSelectedAddressId(primary.id);
    }
  }, [addresses]);

  // Check if current user is admin (same as Dashboard's checkAdminStatus)
  useEffect(() => {
    if (!user) return;
    supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  // Fetch active subscription (same as Dashboard)
  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from('subscriptions')
      .select('plan_id,status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }: any) => { if (data) setActivePlan(data.plan_id); });
  }, [user]);

  const currentFolder = folders.find(f => f.id === selectedFolderId);
  const folderName = currentFolder ? folderLabel(currentFolder) : 'Inbox';
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  const handleFolderSelect = (id: string) => {
    setSelectedFolderId(id);
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleEmailOpen = (thread: EmailThread) => {
    const email = thread.latest_email;
    if (!email.is_read) markRead(email.id);
    navigation.navigate('EmailDetail', {
      emailId: email.id,
      threadId: email.thread_id ?? email.id,
    });
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Sign out of AfuChat Mail?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  // Bulk select helpers (same as EmailList)
  const toggleSelectMode = () => { setSelectMode(v => !v); setSelectedIds(new Set()); };
  const toggleSelectId = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelectedIds(new Set(threads.map(t => t.latest_email.id)));
  const clearSelection = () => { setSelectedIds(new Set()); setSelectMode(false); };
  const allSelected = threads.length > 0 && threads.every(t => selectedIds.has(t.latest_email.id));

  const handleBulkMarkRead = async () => {
    await bulkMarkAsRead(Array.from(selectedIds));
    clearSelection();
  };
  const handleBulkDelete = async () => {
    await bulkDelete(Array.from(selectedIds));
    clearSelection();
  };

  // Switch to search tab (same as Dashboard: onClick={() => setActiveTab("search")})
  const openSearch = () => {
    setActiveTab('search');
    setTimeout(() => searchRef.current?.focus(), 100);
  };
  const closeSearch = () => {
    setActiveTab('mail');
    setSearchQuery('');
    searchRef.current?.blur();
  };

  const hasUnread = threads.some(t => t.unread_count > 0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgCard} />

      {/* ── Header (matches Dashboard mobile header exactly) ── */}
      <View style={styles.header}>
        {activeTab === 'search' ? (
          // Search mode header (matches Dashboard's search tab header)
          <View style={styles.searchHeaderInner}>
            <TouchableOpacity style={styles.headerIconBtn} onPress={closeSearch}>
              <Ionicons name="arrow-back" size={22} color={colors.textDim} />
            </TouchableOpacity>
            <TextInput
              ref={searchRef}
              style={styles.searchInput}
              placeholder="Search emails…"
              placeholderTextColor={colors.textFaint}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => setSearchQuery('')}>
                <Ionicons name="close" size={20} color={colors.textDim} />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          // Mail mode header (matches Dashboard mobile header)
          <>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => setDrawerOpen(true)}>
              <Ionicons name="menu" size={22} color={colors.textDim} />
            </TouchableOpacity>

            {/* Search bar tap target (same as Dashboard: onClick={() => setActiveTab("search")}) */}
            <TouchableOpacity style={styles.searchPill} onPress={openSearch} activeOpacity={0.85}>
              <Ionicons name="search" size={16} color={colors.textFaint} />
              <Text style={styles.searchPillText}>Search mail…</Text>
            </TouchableOpacity>

            {/* StatusDot — service health indicator (same as Dashboard header) */}
            <StatusDot />

            <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('Compose', {})}>
              <Ionicons name="create-outline" size={22} color={colors.textDim} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Folder name bar */}
      {activeTab === 'mail' && (
        <View style={styles.folderBar}>
          <Text style={styles.folderName}>{folderName}</Text>
          {hasUnread && (
            <TouchableOpacity onPress={markAllAsRead} style={styles.markAllBtn}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Offline banner (same as EmailList) */}
      {offline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="wifi-outline" size={14} color="#92400E" />
          <Text style={styles.offlineBannerText}>You're offline — showing cached emails</Text>
        </View>
      )}

      {/* Bulk action bar (same as EmailList's selectMode bar) */}
      {selectMode && (
        <View style={styles.bulkBar}>
          <TouchableOpacity style={styles.bulkBtn} onPress={allSelected ? () => setSelectedIds(new Set()) : selectAll}>
            <Ionicons name={allSelected ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={colors.primary} />
            <Text style={styles.bulkBtnText}>
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
            </Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          {selectedIds.size > 0 && (
            <>
              <TouchableOpacity style={styles.bulkIconBtn} onPress={handleBulkMarkRead}>
                <Ionicons name="mail-open-outline" size={20} color={colors.textDim} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.bulkIconBtn} onPress={handleBulkDelete}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={styles.bulkIconBtn} onPress={clearSelection}>
            <Ionicons name="close" size={20} color={colors.textDim} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Email list (mail tab) — same behavior as EmailList: always mounted, toggle visibility ── */}
      <View style={[styles.listArea, activeTab === 'search' && { display: 'none' }]}>
        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : threads.length === 0 ? (
          <View style={styles.center}>
            <View style={styles.emptyIcon}>
              <Ionicons name="mail-outline" size={40} color={colors.textHint} />
            </View>
            <Text style={styles.emptyTitle}>No emails here</Text>
            <Text style={styles.emptySubtitle}>Messages will appear when you receive them</Text>
          </View>
        ) : (
          <FlatList
            data={threads}
            keyExtractor={t => t.thread_id}
            renderItem={({ item }) => (
              <ThreadRow
                thread={item}
                onPress={() => handleEmailOpen(item)}
                onStar={() => toggleStar(item.latest_email.id, item.latest_email.is_starred)}
                onDelete={() => deleteEmail(item.latest_email.id)}
                selected={selectedIds.has(item.latest_email.id)}
                selectMode={selectMode}
                onLongPress={() => {
                  if (!selectMode) {
                    setSelectMode(true);
                    setSelectedIds(new Set([item.latest_email.id]));
                  }
                }}
                onToggleSelect={() => toggleSelectId(item.latest_email.id)}
              />
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* ── Search tab content (same as Dashboard's search tab) ── */}
      {activeTab === 'search' && (
        <View style={styles.listArea}>
          {searchQuery.trim() ? (
            loading ? (
              <View style={styles.center}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : threads.length === 0 ? (
              <View style={styles.center}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="search-outline" size={40} color={colors.textHint} />
                </View>
                <Text style={styles.emptyTitle}>No results found</Text>
                <Text style={styles.emptySubtitle}>Try different search terms</Text>
              </View>
            ) : (
              <FlatList
                data={threads}
                keyExtractor={t => t.thread_id}
                renderItem={({ item }) => (
                  <EmailListItem
                    email={item.latest_email}
                    onPress={() => { handleEmailOpen(item); setActiveTab('mail'); }}
                    onStar={() => toggleStar(item.latest_email.id, item.latest_email.is_starred)}
                  />
                )}
                showsVerticalScrollIndicator={false}
              />
            )
          ) : (
            // Empty search state (same as Dashboard)
            <View style={styles.center}>
              <View style={styles.emptyIcon}>
                <Ionicons name="search-outline" size={40} color={colors.textHint} />
              </View>
              <Text style={styles.emptyTitle}>Search your emails</Text>
              <Text style={styles.emptySubtitle}>Find by sender, subject, or content</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Bottom tab bar (matches website's BottomTabBar exactly) ── */}
      <View style={styles.bottomBar}>
        {/* Mail tab */}
        <TouchableOpacity
          style={styles.bottomTab}
          onPress={() => { if (activeTab !== 'mail') setActiveTab('mail'); }}
          activeOpacity={0.7}
        >
          <View style={styles.bottomTabIconWrap}>
            {activeTab === 'mail' && <View style={styles.bottomTabIndicator} />}
            <View style={{ position: 'relative' }}>
              <Ionicons
                name={activeTab === 'mail' ? 'mail' : 'mail-outline'}
                size={22}
                color={activeTab === 'mail' ? colors.primary : colors.textFaint}
              />
              {totalUnread > 0 && activeTab !== 'mail' && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{totalUnread > 99 ? '99+' : totalUnread}</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={[styles.bottomTabLabel, activeTab === 'mail' && styles.bottomTabLabelActive]}>Mail</Text>
        </TouchableOpacity>

        {/* Search tab */}
        <TouchableOpacity
          style={styles.bottomTab}
          onPress={openSearch}
          activeOpacity={0.7}
        >
          <View style={styles.bottomTabIconWrap}>
            {activeTab === 'search' && <View style={styles.bottomTabIndicator} />}
            <Ionicons
              name={activeTab === 'search' ? 'search' : 'search-outline'}
              size={22}
              color={activeTab === 'search' ? colors.primary : colors.textFaint}
            />
          </View>
          <Text style={[styles.bottomTabLabel, activeTab === 'search' && styles.bottomTabLabelActive]}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* ── Folder Drawer (matches Dashboard's Sheet + EmailSidebar) ── */}
      <FolderDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        folders={folders}
        selectedFolderId={selectedFolderId}
        onFolderSelect={handleFolderSelect}
        unreadCounts={unreadCounts}
        selectedAddressId={selectedAddressId}
        addresses={addresses}
        onAddressChange={setSelectedAddressId}
        onCompose={() => navigation.navigate('Compose', {})}
        onSettings={() => navigation.navigate('Settings')}
        onAdmin={() => navigation.navigate('Admin')}
        isAdmin={isAdmin}
        userEmail={user?.email ?? ''}
        activePlan={activePlan}
        onSignOut={handleSignOut}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: Platform.OS === 'ios' ? 50 : 8,
    paddingBottom: 8,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 4,
    minHeight: Platform.OS === 'ios' ? 98 : 56,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    flexShrink: 0,
  },
  searchPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.bgSection,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchPillText: { fontSize: 14, color: colors.textFaint },
  searchHeaderInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.bgSection,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    height: 42,
  },

  // Folder bar
  folderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  folderName: { fontSize: 15, fontWeight: '700', color: colors.text },
  markAllBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  markAllText: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  // Offline banner
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  offlineBannerText: { fontSize: 12, color: '#92400E', fontWeight: '600' },

  // Bulk action bar
  bulkBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 4,
  },
  bulkBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  bulkBtnText: { fontSize: 14, fontWeight: '600', color: colors.text },
  bulkIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },

  // List area
  listArea: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.textMuted, marginBottom: 6, textAlign: 'center' },
  emptySubtitle: { fontSize: 13, color: colors.textFaint, textAlign: 'center', lineHeight: 20 },

  // Thread checkbox
  threadRowWrap: { flexDirection: 'row', alignItems: 'center' },
  threadCheckbox: { width: 48, alignItems: 'center', justifyContent: 'center' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.textHint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },

  // Bottom tab bar (matches BottomTabBar.tsx)
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: Platform.OS === 'ios' ? 24 : 0,
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingTop: 10,
    gap: 2,
  },
  bottomTabIconWrap: { position: 'relative', alignItems: 'center' },
  bottomTabIndicator: {
    position: 'absolute',
    top: -10,
    width: 36,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  bottomTabLabel: { fontSize: 11, fontWeight: '600', color: colors.textFaint },
  bottomTabLabelActive: { color: colors.primary, fontWeight: '700' },
  unreadBadge: {
    position: 'absolute',
    top: -6,
    right: -12,
    backgroundColor: colors.danger,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Drawer
  drawerOverlay: { flex: 1, flexDirection: 'row' },
  drawerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  drawerPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 300,
    backgroundColor: colors.bgCard,
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  drawerBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  drawerLogo: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerBrandName: { fontSize: 15, fontWeight: '700', color: colors.text },
  planBadge: {
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  planBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  drawerAvatarBtn: { padding: 2 },
  drawerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerAvatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  drawerAddressSwitcher: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  addressChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.bgSection,
    maxWidth: 200,
  },
  addressChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  addressChipText: { fontSize: 12, color: colors.textDim },
  addressChipTextActive: { color: colors.primary, fontWeight: '600' },

  drawerComposeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  drawerComposeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  drawerNav: { flex: 1 },
  drawerSectionLabel: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: colors.textHint,
  },
  drawerFolderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    marginHorizontal: 8,
    marginBottom: 2,
  },
  drawerFolderRowActive: { backgroundColor: colors.primaryLight },
  drawerFolderLabel: { flex: 1, fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  drawerFolderLabelActive: { color: colors.primary, fontWeight: '700' },
  drawerBadge: {
    backgroundColor: colors.bgSection,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  drawerBadgeActive: { backgroundColor: colors.primary },
  drawerBadgeText: { fontSize: 11, fontWeight: '700', color: colors.textDim },
  drawerBadgeTextActive: { color: '#fff' },
});

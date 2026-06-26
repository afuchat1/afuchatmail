import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator,
  RefreshControl, TouchableOpacity, TextInput, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useEmails, useFolders } from '../hooks/useEmails';
import EmailListItem from '../components/EmailListItem';
import { colors } from '../lib/colors';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function InboxScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const { folders } = useFolders(user?.id);
  const [activeFolderId, setActiveFolderId] = useState<string | undefined>();
  const [search, setSearch] = useState('');

  useEffect(() => {
    const inbox = folders.find(f => f.type === 'inbox');
    if (inbox && !activeFolderId) setActiveFolderId(inbox.id);
  }, [folders]);

  const { emails, loading, refreshing, refresh, toggleStar } = useEmails(user?.id, activeFolderId);

  const filtered = search
    ? emails.filter(e =>
        e.subject?.toLowerCase().includes(search.toLowerCase()) ||
        e.from_address?.toLowerCase().includes(search.toLowerCase())
      )
    : emails;

  const unreadCount = emails.filter(e => !e.is_read).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Inbox</Text>
          {unreadCount > 0 && (
            <Text style={styles.subtitle}>{unreadCount} unread</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.composeBtn}
          onPress={() => navigation.navigate('Compose', {})}
        >
          <Text style={styles.composeBtnText}>✏️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search emails…"
          placeholderTextColor={colors.textDim}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {folders.length > 1 && (
        <FlatList
          horizontal
          data={folders.slice(0, 8)}
          keyExtractor={f => f.id}
          style={styles.folderTabs}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.folderTab, activeFolderId === item.id && styles.folderTabActive]}
              onPress={() => setActiveFolderId(item.id)}
            >
              <Text style={[styles.folderTabText, activeFolderId === item.id && styles.folderTabTextActive]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>{search ? 'No results found' : 'Your inbox is empty'}</Text>
          <Text style={styles.emptySubtext}>{search ? 'Try a different search term' : 'Emails sent to your @afuchat.com address will appear here'}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={e => e.id}
          renderItem={({ item }) => (
            <EmailListItem
              email={item}
              onPress={() => navigation.navigate('EmailDetail', { emailId: item.id })}
              onStar={() => toggleStar(item.id, item.is_starred)}
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
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 13, color: colors.primary, marginTop: 2 },
  composeBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  composeBtnText: { fontSize: 18 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, marginHorizontal: 16, marginBottom: 8,
    borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border,
  },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 11, color: colors.text, fontSize: 15 },
  clearBtn: { color: colors.textDim, fontSize: 16, paddingLeft: 8 },
  folderTabs: { maxHeight: 44, marginBottom: 4 },
  folderTab: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, marginRight: 8,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
  },
  folderTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  folderTabText: { color: colors.textMuted, fontSize: 13, fontWeight: '500' },
  folderTabTextActive: { color: '#fff', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  emptySubtext: { color: colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
});

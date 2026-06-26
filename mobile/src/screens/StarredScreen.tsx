import React from 'react';
import {
  View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl, StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useState, useEffect, useCallback } from 'react';
import EmailListItem from '../components/EmailListItem';
import { colors } from '../lib/colors';
import { Email, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function StarredScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('emails')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_starred', true)
      .is('deleted_at', null)
      .order('received_at', { ascending: false });
    setEmails(data ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const toggleStar = useCallback(async (emailId: string, current: boolean) => {
    await supabase.from('emails').update({ is_starred: !current }).eq('id', emailId);
    setEmails(prev => prev.map(e => e.id === emailId ? { ...e, is_starred: !current } : e));
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <View style={styles.header}>
        <Text style={styles.title}>Starred</Text>
      </View>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : emails.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>⭐</Text>
          <Text style={styles.emptyText}>No starred emails</Text>
          <Text style={styles.emptySubtext}>Star emails to find them quickly here</Text>
        </View>
      ) : (
        <FlatList
          data={emails}
          keyExtractor={e => e.id}
          renderItem={({ item }) => (
            <EmailListItem
              email={item}
              onPress={() => navigation.navigate('EmailDetail', { emailId: item.id })}
              onStar={() => toggleStar(item.id, item.is_starred)}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }}
              tintColor={colors.primary} colors={[colors.primary]} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptySubtext: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
});

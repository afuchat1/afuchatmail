import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../lib/colors';

const FOLDERS = [
  { id: 'inbox',   label: 'Inbox',   icon: 'mail-outline' as const,          color: '#6366F1', bg: '#EEF2FF', count: 2  },
  { id: 'starred', label: 'Starred', icon: 'star-outline' as const,           color: '#F59E0B', bg: '#FFFBEB', count: 2  },
  { id: 'sent',    label: 'Sent',    icon: 'paper-plane-outline' as const,    color: '#10B981', bg: '#F0FDF4', count: 0  },
  { id: 'drafts',  label: 'Drafts',  icon: 'create-outline' as const,         color: '#8B5CF6', bg: '#F5F3FF', count: 1  },
  { id: 'archive', label: 'Archive', icon: 'archive-outline' as const,        color: '#64748B', bg: '#F8FAFC', count: 0  },
  { id: 'trash',   label: 'Trash',   icon: 'trash-outline' as const,          color: '#EF4444', bg: '#FEF2F2', count: 0  },
  { id: 'spam',    label: 'Spam',    icon: 'alert-circle-outline' as const,   color: '#F97316', bg: '#FFF7ED', count: 0  },
];

const LABELS = [
  { name: 'Work',     color: '#6366F1' },
  { name: 'Personal', color: '#10B981' },
  { name: 'Finance',  color: '#F59E0B' },
];

export default function FoldersScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />

      <View style={styles.header}>
        <Text style={styles.title}>Folders</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Storage banner */}
        <View style={styles.storageBanner}>
          <View style={styles.storageTop}>
            <Text style={styles.storageLabel}>Storage</Text>
            <Text style={styles.storageValue}>4.2 GB / 15 GB</Text>
          </View>
          <View style={styles.storageTrack}>
            <View style={styles.storageFill} />
          </View>
        </View>

        {/* Folders */}
        <Text style={styles.sectionTitle}>Mailboxes</Text>
        <View style={styles.card}>
          {FOLDERS.map((folder, i) => (
            <TouchableOpacity
              key={folder.id}
              style={[styles.folderRow, i < FOLDERS.length - 1 && styles.rowBorder]}
              activeOpacity={0.7}
            >
              <View style={[styles.folderIcon, { backgroundColor: folder.bg }]}>
                <Ionicons name={folder.icon} size={20} color={folder.color} />
              </View>
              <Text style={styles.folderLabel}>{folder.label}</Text>
              {folder.count > 0 && (
                <Text style={styles.folderCount}>{folder.count}</Text>
              )}
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Labels */}
        <Text style={styles.sectionTitle}>Labels</Text>
        <View style={styles.card}>
          {LABELS.map((lbl, i) => (
            <TouchableOpacity
              key={lbl.name}
              style={[styles.folderRow, i < LABELS.length - 1 && styles.rowBorder]}
              activeOpacity={0.7}
            >
              <View style={[styles.labelDot, { backgroundColor: lbl.color }]} />
              <Text style={styles.folderLabel}>{lbl.name}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.folderRow, styles.rowBorder]} activeOpacity={0.7}>
            <View style={styles.labelDotEmpty} />
            <Text style={[styles.folderLabel, { color: colors.primary, fontWeight: '600' }]}>Add label…</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  content: { padding: 16, paddingBottom: 40 },
  storageBanner: {
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  storageTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  storageLabel: { fontSize: 13, fontWeight: '700', color: '#4338CA' },
  storageValue: { fontSize: 12, fontWeight: '600', color: colors.primary },
  storageTrack: {
    height: 6,
    backgroundColor: '#C7D2FE',
    borderRadius: 3,
    overflow: 'hidden',
  },
  storageFill: { height: 6, width: '28%', backgroundColor: colors.primary, borderRadius: 3 },
  sectionTitle: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  folderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderLabel: { flex: 1, fontSize: 16, color: colors.text, fontWeight: '500' },
  folderCount: { fontSize: 13, fontWeight: '700', color: colors.primary, marginRight: 4 },
  labelDot: { width: 12, height: 12, borderRadius: 6, marginLeft: 14 },
  labelDotEmpty: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.textFaint,
    marginLeft: 14,
  },
});

import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, setHours, setMinutes } from 'date-fns';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/colors';

interface SnoozeModalProps {
  visible: boolean;
  onClose: () => void;
  emailId: string;
  onSnooze: () => void;
}

// Same quick presets as website's SnoozeDialog.tsx
function getPresets() {
  const now = new Date();
  return [
    {
      label: 'Later today',
      sub: format(setMinutes(setHours(new Date(), 18), 0), 'EEE, h:mm a'),
      date: setMinutes(setHours(new Date(), 18), 0),
      icon: 'sunny-outline' as const,
    },
    {
      label: 'Tomorrow',
      sub: format(setMinutes(setHours(addDays(new Date(), 1), 9), 0), 'EEE, h:mm a'),
      date: setMinutes(setHours(addDays(new Date(), 1), 9), 0),
      icon: 'moon-outline' as const,
    },
    {
      label: 'This weekend',
      sub: format(setMinutes(setHours(addDays(new Date(), (6 - now.getDay() + 7) % 7 || 7), 9), 0), 'EEE, h:mm a'),
      date: setMinutes(setHours(addDays(new Date(), (6 - now.getDay() + 7) % 7 || 7), 9), 0),
      icon: 'calendar-outline' as const,
    },
    {
      label: 'Next week',
      sub: format(setMinutes(setHours(addDays(new Date(), 7), 9), 0), 'EEE, MMM d'),
      date: setMinutes(setHours(addDays(new Date(), 7), 9), 0),
      icon: 'time-outline' as const,
    },
  ];
}

export function SnoozeModal({ visible, onClose, emailId, onSnooze }: SnoozeModalProps) {
  const [loading, setLoading] = useState(false);

  const handleSnooze = async (date: Date) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('emails')
        .update({ snoozed_until: date.toISOString() })
        .eq('id', emailId);
      if (error) throw error;
      onSnooze();
      onClose();
    } catch (e: any) {
      Alert.alert('Snooze failed', e?.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const presets = getPresets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="alarm-outline" size={20} color={colors.primary} />
              <Text style={styles.title}>Snooze email</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textDim} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Choose when this email should reappear in your inbox
          </Text>

          {/* Quick presets (matches SnoozeDialog grid) */}
          <View style={styles.presetGrid}>
            {presets.map((preset) => (
              <TouchableOpacity
                key={preset.label}
                style={styles.presetCard}
                onPress={() => handleSnooze(preset.date)}
                disabled={loading}
                activeOpacity={0.7}
              >
                <View style={styles.presetIconWrap}>
                  <Ionicons name={preset.icon} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.presetLabel}>{preset.label}</Text>
                  <Text style={styles.presetSub}>{preset.sub}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          )}

          <View style={{ height: Platform.OS === 'ios' ? 24 : 16 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.bgSurface,
    alignSelf: 'center',
    marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  subtitle: { fontSize: 13, color: colors.textFaint, marginBottom: 16 },

  presetGrid: { gap: 8 },
  presetCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: 12,
    backgroundColor: colors.bgSection,
    borderWidth: 1, borderColor: colors.border,
  },
  presetIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  presetLabel: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 2 },
  presetSub: { fontSize: 12, color: colors.textFaint },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 20,
  },
});

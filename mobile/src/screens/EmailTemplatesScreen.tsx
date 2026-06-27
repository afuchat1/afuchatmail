import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Alert, TextInput, Modal, ActivityIndicator, ScrollView,
  StatusBar, Platform, KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/colors';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  body_text: string;
  is_system: boolean;
  category: string | null;
  created_at: string;
}

// Same as EmailTemplates.tsx component
export default function EmailTemplatesScreen() {
  const navigation = useNavigation<any>();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: '', subject: '', body_text: '', category: '' });

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    try {
      const { data } = await supabase.from('email_templates').select('*').order('created_at', { ascending: false });
      setTemplates(data ?? []);
    } catch {}
    setLoading(false);
  };

  const openCreate = () => {
    setEditingTemplate(null);
    setFormData({ name: '', subject: '', body_text: '', category: '' });
    setShowModal(true);
  };

  const openEdit = (t: EmailTemplate) => {
    setEditingTemplate(t);
    setFormData({ name: t.name, subject: t.subject, body_text: t.body_text, category: t.category ?? '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.subject.trim()) {
      Alert.alert('Missing fields', 'Name and subject are required.');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const body_html = `<p>${formData.body_text.replace(/\n/g, '<br>')}</p>`;
      if (editingTemplate) {
        await supabase.from('email_templates').update({
          name: formData.name, subject: formData.subject,
          body_html, body_text: formData.body_text, category: formData.category || null,
        }).eq('id', editingTemplate.id);
      } else {
        await supabase.from('email_templates').insert({
          user_id: user.id, name: formData.name, subject: formData.subject,
          body_html, body_text: formData.body_text, category: formData.category || null, is_system: false,
        });
      }
      setShowModal(false);
      fetchTemplates();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message);
    }
    setSaving(false);
  };

  const handleDelete = (t: EmailTemplate) => {
    if (t.is_system) { Alert.alert('Cannot delete', 'System templates cannot be deleted.'); return; }
    Alert.alert('Delete template?', `"${t.name}" will be permanently removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('email_templates').delete().eq('id', t.id);
          setTemplates(prev => prev.filter(tt => tt.id !== t.id));
        },
      },
    ]);
  };

  const systemTemplates = templates.filter(t => t.is_system);
  const userTemplates = templates.filter(t => !t.is_system);

  const renderItem = (t: EmailTemplate) => (
    <View key={t.id} style={styles.templateCard}>
      <View style={styles.templateIconWrap}>
        <Ionicons name="document-text-outline" size={22} color={t.is_system ? '#9C27B0' : colors.primary} />
      </View>
      <View style={styles.templateInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.templateName}>{t.name}</Text>
          {t.is_system && (
            <View style={styles.systemBadge}>
              <Text style={styles.systemBadgeText}>System</Text>
            </View>
          )}
          {t.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{t.category}</Text>
            </View>
          )}
        </View>
        <Text style={styles.templateSubject} numberOfLines={1}>{t.subject}</Text>
        {t.body_text && (
          <Text style={styles.templatePreview} numberOfLines={2}>{t.body_text}</Text>
        )}
      </View>
      <View style={styles.templateActions}>
        {!t.is_system && (
          <TouchableOpacity style={styles.iconBtn} onPress={() => openEdit(t)}>
            <Ionicons name="create-outline" size={18} color={colors.textDim} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(t)}>
          <Ionicons name="trash-outline" size={18} color={t.is_system ? colors.textHint : colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgCard} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textDim} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Email Templates</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {systemTemplates.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>System Templates</Text>
              {systemTemplates.map(renderItem)}
            </>
          )}
          <Text style={styles.sectionTitle}>My Templates</Text>
          {userTemplates.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="document-text-outline" size={36} color={colors.textHint} />
              </View>
              <Text style={styles.emptyTitle}>No custom templates yet</Text>
              <Text style={styles.emptySub}>Create reusable templates for your most common emails</Text>
              <TouchableOpacity style={styles.createBtn} onPress={openCreate}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.createBtnText}>Create template</Text>
              </TouchableOpacity>
            </View>
          ) : userTemplates.map(renderItem)}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}

      {/* Create/Edit modal */}
      <Modal visible={showModal} animationType="slide" onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.backBtn}>
                <Ionicons name="close" size={24} color={colors.textDim} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{editingTemplate ? 'Edit Template' : 'New Template'}</Text>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.5 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.label}>Template name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={v => setFormData(f => ({ ...f, name: v }))}
                  placeholder="e.g. Follow-up email"
                  placeholderTextColor={colors.textHint}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Subject line *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.subject}
                  onChangeText={v => setFormData(f => ({ ...f, subject: v }))}
                  placeholder="e.g. Following up on our meeting"
                  placeholderTextColor={colors.textHint}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <TextInput
                  style={styles.input}
                  value={formData.category}
                  onChangeText={v => setFormData(f => ({ ...f, category: v }))}
                  placeholder="e.g. Sales, Support"
                  placeholderTextColor={colors.textHint}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Body</Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={formData.body_text}
                  onChangeText={v => setFormData(f => ({ ...f, body_text: v }))}
                  placeholder="Write your template content here..."
                  placeholderTextColor={colors.textHint}
                  multiline
                  textAlignVertical="top"
                />
              </View>
              <View style={{ height: 60 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: Platform.OS === 'ios' ? 50 : 12,
    paddingBottom: 12,
    backgroundColor: colors.bgCard,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: 4,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.text, marginLeft: 4 },
  addBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },

  content: { padding: 16 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.8, color: colors.textFaint,
    marginBottom: 8, marginTop: 16, paddingHorizontal: 4,
  },

  templateCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: colors.bgCard, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
    padding: 14, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  templateIconWrap: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: colors.bgSection, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  templateInfo: { flex: 1 },
  templateName: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 2 },
  templateSubject: { fontSize: 13, color: colors.textDim, marginBottom: 2 },
  templatePreview: { fontSize: 12, color: colors.textFaint, lineHeight: 18 },
  systemBadge: { backgroundColor: '#F3E5F5', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  systemBadgeText: { fontSize: 10, fontWeight: '700', color: '#9C27B0' },
  categoryBadge: { backgroundColor: colors.primaryLight, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  categoryBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  templateActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },

  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.bgSection, alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.textMuted },
  emptySub: { fontSize: 13, color: colors.textFaint, textAlign: 'center' },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12,
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  modalContainer: { flex: 1, backgroundColor: colors.bgCard },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingTop: Platform.OS === 'ios' ? 50 : 12, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: 4,
  },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.text, marginLeft: 4 },
  saveBtn: {
    backgroundColor: colors.primary, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 9,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  modalScroll: { flex: 1, padding: 16 },
  formGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textDim, marginBottom: 8 },
  input: {
    backgroundColor: colors.bgSection, borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.text,
  },
  textarea: { minHeight: 180, textAlignVertical: 'top', paddingTop: 12 },
});

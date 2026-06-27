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

type BodyMode = 'text' | 'html';

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

interface StarterTemplate {
  label: string;
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  html: string;
}

const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    label: 'Newsletter',
    icon: 'newspaper-outline',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;">
        <!-- Header -->
        <tr><td style="background:#0052ff;padding:24px 32px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Your Brand Newsletter</h1>
          <p style="margin:6px 0 0;color:#ccdeff;font-size:13px;">Monthly Update — {{month}} {{year}}</p>
        </td></tr>
        <!-- Hero -->
        <tr><td style="padding:32px 32px 24px;">
          <h2 style="color:#111;font-size:20px;margin:0 0 12px;">Hello {{first_name}},</h2>
          <p style="color:#444;line-height:1.7;margin:0 0 20px;">Here's what's new this month. We've been working hard to bring you the latest updates and exciting news.</p>
          <a href="{{cta_link}}" style="display:inline-block;background:#0052ff;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:700;font-size:14px;">Read more →</a>
        </td></tr>
        <!-- Divider -->
        <tr><td style="padding:0 32px;"><hr style="border:none;border-top:1px solid #e8e8e8;" /></td></tr>
        <!-- Feature block -->
        <tr><td style="padding:24px 32px;">
          <h3 style="color:#111;font-size:16px;margin:0 0 8px;">✨ Feature spotlight</h3>
          <p style="color:#555;line-height:1.6;margin:0;">Add your featured content here. Keep it concise and impactful — 2–3 sentences works best.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9f9f9;padding:20px 32px;text-align:center;border-top:1px solid #eee;">
          <p style="margin:0;font-size:12px;color:#999;">© {{year}} Your Company · <a href="{{unsubscribe_link}}" style="color:#0052ff;">Unsubscribe</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  },
  {
    label: 'Promotional',
    icon: 'pricetag-outline',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#fff;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:30px 20px;">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;">
        <!-- Logo row -->
        <tr><td align="center" style="padding-bottom:24px;">
          <span style="font-size:20px;font-weight:900;color:#0052ff;letter-spacing:-0.5px;">YOUR BRAND</span>
        </td></tr>
        <!-- Promo banner -->
        <tr><td style="background:linear-gradient(135deg,#0052ff,#004ad0);border-radius:12px;padding:40px 32px;text-align:center;">
          <p style="margin:0 0 6px;color:#ccdeff;font-size:13px;text-transform:uppercase;letter-spacing:2px;">Limited time offer</p>
          <h1 style="margin:0 0 12px;color:#fff;font-size:36px;font-weight:900;">{{discount}}% OFF</h1>
          <p style="margin:0 0 24px;color:#ddeeff;font-size:15px;">Use code <strong style="background:#fff2;padding:3px 8px;border-radius:4px;">{{code}}</strong> at checkout</p>
          <a href="{{shop_link}}" style="display:inline-block;background:#ffffff;color:#0052ff;text-decoration:none;padding:14px 36px;border-radius:30px;font-weight:700;font-size:15px;">Shop now</a>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:28px 8px;text-align:center;">
          <p style="margin:0 0 8px;color:#333;font-size:16px;">Don't miss out — offer ends <strong>{{expiry_date}}</strong></p>
          <p style="margin:0;color:#888;font-size:13px;">Questions? Reply to this email and we'll help you out.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="text-align:center;padding-top:16px;border-top:1px solid #eee;">
          <p style="margin:0;font-size:12px;color:#aaa;">© {{year}} Your Company · <a href="{{unsubscribe_link}}" style="color:#0052ff;text-decoration:none;">Unsubscribe</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  },
  {
    label: 'Transactional',
    icon: 'receipt-outline',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f6f8fa;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e1e4e8;border-radius:8px;max-width:520px;">
        <tr><td style="padding:32px 40px;">
          <h2 style="margin:0 0 6px;color:#111;font-size:20px;font-weight:700;">{{email_title}}</h2>
          <p style="margin:0 0 24px;color:#666;font-size:13px;">{{subtitle}}</p>
          <hr style="border:none;border-top:1px solid #eee;margin:0 0 24px;" />
          <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6;">Hi {{first_name}},</p>
          <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.7;">{{message_body}}</p>
          <!-- Action button -->
          <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr><td style="background:#0052ff;border-radius:6px;">
              <a href="{{action_link}}" style="display:inline-block;padding:12px 28px;color:#fff;text-decoration:none;font-size:14px;font-weight:700;">{{action_label}}</a>
            </td></tr>
          </table>
          <p style="margin:0;color:#888;font-size:12px;line-height:1.6;">If you didn't request this, you can safely ignore this email.<br/>This link expires in <strong>{{expiry}}</strong>.</p>
        </td></tr>
        <tr><td style="background:#f6f8fa;border-top:1px solid #eee;padding:16px 40px;border-radius:0 0 8px 8px;">
          <p style="margin:0;font-size:11px;color:#aaa;">© {{year}} Your Company · Sent from <a href="mailto:noreply@yourdomain.com" style="color:#0052ff;text-decoration:none;">noreply@yourdomain.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  },
  {
    label: 'Simple branded',
    icon: 'mail-outline',
    html: `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#fff;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <!-- Brand stripe -->
        <tr><td style="background:#0052ff;height:4px;border-radius:4px 4px 0 0;"></td></tr>
        <!-- Body -->
        <tr><td style="background:#fff;border:1px solid #e8e8e8;border-top:none;padding:36px 40px;">
          <p style="margin:0 0 20px;color:#111;font-size:15px;line-height:1.8;">Dear {{first_name}},</p>
          <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.8;">{{paragraph_1}}</p>
          <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.8;">{{paragraph_2}}</p>
          <p style="margin:0 0 28px;color:#333;font-size:15px;line-height:1.8;">{{paragraph_3}}</p>
          <p style="margin:0;color:#111;font-size:15px;">Best regards,<br/><strong>{{sender_name}}</strong><br/><span style="color:#888;font-size:13px;">{{sender_title}}</span></p>
        </td></tr>
        <!-- Footer stripe -->
        <tr><td style="background:#f9f9f9;border:1px solid #e8e8e8;border-top:none;padding:14px 40px;border-radius:0 0 4px 4px;">
          <p style="margin:0;font-size:11px;color:#bbb;">© {{year}} Your Company · <a href="{{unsubscribe_link}}" style="color:#0052ff;text-decoration:none;">Unsubscribe</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  },
];

export default function EmailTemplatesScreen() {
  const navigation = useNavigation<any>();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStarters, setShowStarters] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [bodyMode, setBodyMode] = useState<BodyMode>('text');
  const [formData, setFormData] = useState({
    name: '', subject: '', body_text: '', body_html: '', category: '',
  });

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    try {
      const { data } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });
      setTemplates(data ?? []);
    } catch {}
    setLoading(false);
  };

  const openCreate = () => {
    setEditingTemplate(null);
    setBodyMode('text');
    setFormData({ name: '', subject: '', body_text: '', body_html: '', category: '' });
    setShowModal(true);
  };

  const openEdit = (t: EmailTemplate) => {
    setEditingTemplate(t);
    const hasHtml = t.body_html && t.body_html.trim().startsWith('<');
    setBodyMode(hasHtml ? 'html' : 'text');
    setFormData({
      name: t.name,
      subject: t.subject,
      body_text: t.body_text ?? '',
      body_html: t.body_html ?? '',
      category: t.category ?? '',
    });
    setShowModal(true);
  };

  const applyStarter = (s: StarterTemplate) => {
    setBodyMode('html');
    setFormData(f => ({ ...f, body_html: s.html, body_text: '' }));
    setShowStarters(false);
  };

  const switchBodyMode = (mode: BodyMode) => {
    if (mode === bodyMode) return;
    if (mode === 'html') {
      const html = formData.body_text
        ? `<div style="font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.6;">${formData.body_text.replace(/\n/g, '<br />')}</div>`
        : formData.body_html;
      setFormData(f => ({ ...f, body_html: html }));
    } else {
      const stripped = formData.body_html
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
      setFormData(f => ({ ...f, body_text: stripped }));
    }
    setBodyMode(mode);
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

      let body_html = formData.body_html;
      let body_text = formData.body_text;

      if (bodyMode === 'html') {
        if (!body_html.trim()) { Alert.alert('Empty HTML', 'Please add some HTML content.'); setSaving(false); return; }
        body_text = body_html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      } else {
        body_html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#333;line-height:1.6;">${body_text.replace(/\n/g, '<br />')}</div>`;
      }

      if (editingTemplate) {
        await supabase.from('email_templates').update({
          name: formData.name,
          subject: formData.subject,
          body_html,
          body_text,
          category: formData.category || null,
        }).eq('id', editingTemplate.id);
      } else {
        await supabase.from('email_templates').insert({
          user_id: user.id,
          name: formData.name,
          subject: formData.subject,
          body_html,
          body_text,
          category: formData.category || null,
          is_system: false,
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

  const renderItem = (t: EmailTemplate) => {
    const hasHtml = t.body_html && t.body_html.trim().startsWith('<');
    return (
      <View key={t.id} style={styles.templateCard}>
        <View style={[styles.templateIconWrap, hasHtml && styles.templateIconWrapHtml]}>
          <Ionicons
            name={hasHtml ? 'code-slash-outline' : 'document-text-outline'}
            size={22}
            color={hasHtml ? '#e07b00' : (t.is_system ? '#9C27B0' : colors.primary)}
          />
        </View>
        <View style={styles.templateInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={styles.templateName}>{t.name}</Text>
            {t.is_system && (
              <View style={styles.systemBadge}><Text style={styles.systemBadgeText}>System</Text></View>
            )}
            {hasHtml && (
              <View style={styles.htmlBadge}><Text style={styles.htmlBadgeText}>HTML</Text></View>
            )}
            {t.category && (
              <View style={styles.categoryBadge}><Text style={styles.categoryBadgeText}>{t.category}</Text></View>
            )}
          </View>
          <Text style={styles.templateSubject} numberOfLines={1}>{t.subject}</Text>
          {!hasHtml && t.body_text && (
            <Text style={styles.templatePreview} numberOfLines={2}>{t.body_text}</Text>
          )}
          {hasHtml && (
            <Text style={styles.htmlPreviewNote}>Custom branded HTML template</Text>
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
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.bgCard} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textDim} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Email Templates</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={24} color={colors.primary} />
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
              <Text style={styles.emptySub}>Create reusable branded email templates</Text>
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
                  placeholder="e.g. Monthly newsletter"
                  placeholderTextColor={colors.textHint}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Subject line *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.subject}
                  onChangeText={v => setFormData(f => ({ ...f, subject: v }))}
                  placeholder="e.g. Here's your {{month}} update"
                  placeholderTextColor={colors.textHint}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <TextInput
                  style={styles.input}
                  value={formData.category}
                  onChangeText={v => setFormData(f => ({ ...f, category: v }))}
                  placeholder="e.g. Newsletter, Promo, Support"
                  placeholderTextColor={colors.textHint}
                />
              </View>

              {/* Body section */}
              <View style={styles.formGroup}>
                <View style={styles.bodyHeader}>
                  <Text style={styles.label}>Body</Text>
                  {/* Mode toggle */}
                  <View style={styles.modeSwitcher}>
                    <TouchableOpacity
                      style={[styles.modeTab, bodyMode === 'text' && styles.modeTabActive]}
                      onPress={() => switchBodyMode('text')}
                    >
                      <Ionicons name="text-outline" size={13} color={bodyMode === 'text' ? colors.primary : colors.textFaint} />
                      <Text style={[styles.modeTabText, bodyMode === 'text' && styles.modeTabTextActive]}>Text</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modeTab, bodyMode === 'html' && styles.modeTabActiveHtml]}
                      onPress={() => switchBodyMode('html')}
                    >
                      <Ionicons name="code-slash-outline" size={13} color={bodyMode === 'html' ? '#e07b00' : colors.textFaint} />
                      <Text style={[styles.modeTabText, bodyMode === 'html' && styles.modeTabTextHtml]}>HTML</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {bodyMode === 'html' && (
                  <TouchableOpacity style={styles.starterBtn} onPress={() => setShowStarters(true)}>
                    <Ionicons name="color-palette-outline" size={16} color="#e07b00" />
                    <Text style={styles.starterBtnText}>Use a branded starter template</Text>
                    <Ionicons name="chevron-forward" size={14} color="#e07b00" />
                  </TouchableOpacity>
                )}

                {bodyMode === 'html' && (
                  <View style={styles.htmlInfoRow}>
                    <Ionicons name="information-circle-outline" size={14} color="#888" />
                    <Text style={styles.htmlInfoText}>Use {'{{variable}}'} placeholders for dynamic content</Text>
                  </View>
                )}

                {bodyMode === 'text' ? (
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    value={formData.body_text}
                    onChangeText={v => setFormData(f => ({ ...f, body_text: v }))}
                    placeholder="Write your template content here..."
                    placeholderTextColor={colors.textHint}
                    multiline
                    textAlignVertical="top"
                  />
                ) : (
                  <TextInput
                    style={[styles.input, styles.textarea, styles.codeEditor]}
                    value={formData.body_html}
                    onChangeText={v => setFormData(f => ({ ...f, body_html: v }))}
                    placeholder={'<!DOCTYPE html>\n<html>\n  <body>\n    <!-- Paste your branded HTML -->\n  </body>\n</html>'}
                    placeholderTextColor={colors.textHint}
                    multiline
                    textAlignVertical="top"
                    autoCorrect={false}
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                )}
              </View>

              {bodyMode === 'html' && (
                <View style={styles.variablesCard}>
                  <Text style={styles.variablesTitle}>Common variables</Text>
                  {[
                    ['{{first_name}}', 'Recipient first name'],
                    ['{{year}}', 'Current year'],
                    ['{{month}}', 'Current month'],
                    ['{{unsubscribe_link}}', 'Opt-out URL'],
                    ['{{cta_link}}', 'Call-to-action URL'],
                  ].map(([v, desc]) => (
                    <View key={v} style={styles.variableRow}>
                      <Text style={styles.variableCode}>{v}</Text>
                      <Text style={styles.variableDesc}>{desc}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={{ height: 60 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Starter templates picker */}
      <Modal visible={showStarters} animationType="slide" transparent onRequestClose={() => setShowStarters(false)}>
        <View style={styles.bottomSheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowStarters(false)} />
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHandle} />
            <Text style={styles.bottomSheetTitle}>Branded starter templates</Text>
            <Text style={styles.bottomSheetSub}>Pick a layout to start from. You can customise it fully.</Text>
            {STARTER_TEMPLATES.map(s => (
              <TouchableOpacity key={s.label} style={styles.starterRow} onPress={() => applyStarter(s)}>
                <View style={styles.starterIconWrap}>
                  <Ionicons name={s.icon} size={22} color="#e07b00" />
                </View>
                <Text style={styles.starterRowLabel}>{s.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textHint} />
              </TouchableOpacity>
            ))}
            <View style={{ height: Platform.OS === 'ios' ? 28 : 16 }} />
          </View>
        </View>
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
  templateIconWrapHtml: { backgroundColor: '#FFF3E0' },
  templateInfo: { flex: 1 },
  templateName: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 2 },
  templateSubject: { fontSize: 13, color: colors.textDim, marginBottom: 2 },
  templatePreview: { fontSize: 12, color: colors.textFaint, lineHeight: 18 },
  htmlPreviewNote: { fontSize: 12, color: '#e07b00', fontStyle: 'italic' },
  systemBadge: { backgroundColor: '#F3E5F5', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  systemBadgeText: { fontSize: 10, fontWeight: '700', color: '#9C27B0' },
  htmlBadge: { backgroundColor: '#FFF3E0', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  htmlBadgeText: { fontSize: 10, fontWeight: '700', color: '#e07b00' },
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
  codeEditor: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 20,
    color: '#1a1a2e',
    backgroundColor: '#F8F9FF',
    borderColor: '#C5CAE9',
    minHeight: 300,
  },

  bodyHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
  },
  modeSwitcher: {
    flexDirection: 'row',
    borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bgSection, overflow: 'hidden',
  },
  modeTab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  modeTabActive: { backgroundColor: colors.bgCard },
  modeTabActiveHtml: { backgroundColor: '#FFF3E0' },
  modeTabText: { fontSize: 12, fontWeight: '600', color: colors.textFaint },
  modeTabTextActive: { color: colors.primary },
  modeTabTextHtml: { color: '#e07b00' },

  starterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF3E0', borderRadius: 10,
    borderWidth: 1, borderColor: '#FFB74D50',
    paddingHorizontal: 14, paddingVertical: 11,
    marginBottom: 10,
  },
  starterBtnText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#e07b00' },

  htmlInfoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 10,
  },
  htmlInfoText: { fontSize: 12, color: '#888' },

  variablesCard: {
    backgroundColor: colors.bgSection, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
    padding: 14, marginBottom: 8,
  },
  variablesTitle: { fontSize: 12, fontWeight: '700', color: colors.textDim, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  variableRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  variableCode: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11, color: '#e07b00',
    backgroundColor: '#FFF3E0', borderRadius: 5,
    paddingHorizontal: 6, paddingVertical: 2,
    minWidth: 130,
  },
  variableDesc: { fontSize: 12, color: colors.textFaint, flex: 1 },

  bottomSheetOverlay: { flex: 1, backgroundColor: '#00000040', justifyContent: 'flex-end' },
  bottomSheet: {
    backgroundColor: colors.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 8, paddingBottom: 0,
  },
  bottomSheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border,
    alignSelf: 'center', marginBottom: 12,
  },
  bottomSheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text, paddingHorizontal: 20, marginBottom: 4 },
  bottomSheetSub: { fontSize: 12, color: colors.textFaint, paddingHorizontal: 20, marginBottom: 14 },

  starterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 15,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  starterIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center',
  },
  starterRowLabel: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
});

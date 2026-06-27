export interface EmailAddress {
  id: string;
  user_id: string;
  local_part: string;
  full_email: string;
  domain: string;
  is_primary: boolean;
  is_alias: boolean;
  created_at: string;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  type: string;
  icon: string;
  color?: string;
}

export interface Attachment {
  name: string;
  size: number;
  path?: string;
  contentType?: string;
}

export interface Email {
  id: string;
  user_id: string;
  email_address_id: string;
  folder_id: string;
  original_folder_id?: string | null;
  from_address: string;
  to_addresses: string[];
  cc_addresses?: string[];
  bcc_addresses?: string[];
  reply_to?: string | null;
  subject: string;
  body_text?: string;
  body_html?: string;
  is_read: boolean;
  is_starred: boolean;
  is_important: boolean;
  is_draft?: boolean;
  thread_id?: string | null;
  attachments?: Attachment[] | string | null;
  received_at?: string;
  sent_at?: string;
  deleted_at?: string | null;
  snoozed_until?: string | null;
  created_at: string;
}

export interface EmailThread {
  thread_id: string;
  emails: Email[];
  latest_email: Email;
  unread_count: number;
}

export interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
  avatar_color?: string;
}

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  EmailDetail: { emailId: string; threadId?: string };
  Compose: { replyTo?: Email; draftId?: string };
  Settings: undefined;
  Admin: undefined;
  EmailTemplates: undefined;
};

export type MainTabParamList = {
  Inbox: undefined;
  Folders: undefined;
  SettingsTab: undefined;
};

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
  type: 'inbox' | 'sent' | 'drafts' | 'spam' | 'trash' | 'custom';
  icon: string;
  color?: string;
}

export interface Attachment {
  name: string;
  size: number;
  contentType: string;
}

export interface Email {
  id: string;
  user_id: string;
  email_address_id: string;
  folder_id: string;
  from_address: string;
  to_addresses: string[];
  cc_addresses?: string[];
  bcc_addresses?: string[];
  subject: string;
  body_text?: string;
  body_html?: string;
  is_read: boolean;
  is_starred: boolean;
  is_important: boolean;
  is_draft: boolean;
  thread_id?: string;
  reply_to?: string;
  attachments?: Attachment[];
  received_at?: string;
  sent_at?: string;
  created_at: string;
  deleted_at?: string;
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
  EmailDetail: { emailId: string };
  Compose: { replyTo?: Email; draftId?: string };
};

export type MainTabParamList = {
  Inbox: undefined;
  Starred: undefined;
  Compose: undefined;
  Folders: undefined;
  Settings: undefined;
};

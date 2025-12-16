import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-account-id",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_ACCOUNTS_PER_USER = 3;

// Helper to create JSON responses
const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const errorResponse = (message: string, status = 400, code?: string) =>
  jsonResponse({ error: message, code }, status);

// Validate OAuth token and return user context
async function validateToken(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: tokenData, error } = await supabase
    .from("oauth_tokens")
    .select("*, oauth_applications(name)")
    .eq("access_token", token)
    .eq("revoked", false)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error || !tokenData) {
    return null;
  }

  // Check for X-Account-Id header to switch account context
  const accountIdHeader = req.headers.get("X-Account-Id");
  let emailAddressId = tokenData.email_address_id;

  if (accountIdHeader) {
    // Verify user owns this account
    const { data: account } = await supabase
      .from("email_addresses")
      .select("id")
      .eq("id", accountIdHeader)
      .eq("user_id", tokenData.user_id)
      .maybeSingle();

    if (account) {
      emailAddressId = account.id;
    }
  }

  return {
    userId: tokenData.user_id,
    emailAddressId: emailAddressId,
    scopes: tokenData.scopes as string[],
    applicationName: tokenData.oauth_applications?.name,
  };
}

// Check if token has required scope
function hasScope(tokenScopes: string[], required: string): boolean {
  return tokenScopes.includes(required) || tokenScopes.includes("*");
}

// Validate username format
function isValidUsername(username: string): { valid: boolean; error?: string } {
  if (username.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters" };
  }
  if (username.length > 30) {
    return { valid: false, error: "Username must be at most 30 characters" };
  }
  if (!/^[a-z0-9][a-z0-9._-]*[a-z0-9]$|^[a-z0-9]$/.test(username)) {
    return { valid: false, error: "Username must start and end with letter/number, can contain dots, underscores, hyphens" };
  }
  if (/[._-]{2,}/.test(username)) {
    return { valid: false, error: "Username cannot have consecutive special characters" };
  }
  return { valid: true };
}

// Parse URL path
function parsePath(url: URL): { route: string; params: Record<string, string> } {
  const functionName = "afumail-api";

  // In production, url.pathname can look like:
  // - /functions/v1/afumail-api/api/user/me
  // - /afumail-api/api/user/me
  // In local dev, it may look like:
  // - /api/user/me
  let pathname = url.pathname;

  // Normalize common prefixes
  pathname = pathname.replace(`/functions/v1/${functionName}`, "");
  pathname = pathname.replace(`/${functionName}`, "");
  if (!pathname.startsWith("/")) pathname = `/${pathname}`;

  const parts = pathname.split("/").filter(Boolean);

  // Support OAuth routes both with and without /api prefix
  if (parts[0] === "oauth") {
    if (parts[1] === "token") return { route: "oauth-token", params: {} };
    if (parts[1] === "authorize") return { route: "oauth-authorize", params: {} };
    if (parts[1] === "revoke") return { route: "oauth-revoke", params: {} };
  }

  // Match routes
  if (parts[0] === "api") {
    if (parts[1] === "mailbox") return { route: "mailbox", params: {} };
    if (parts[1] === "user" && parts[2] === "me") return { route: "user-me", params: {} };
    if (parts[1] === "accounts") return { route: "accounts", params: {} };
    if (parts[1] === "account") {
      if (parts[2] === "create") return { route: "account-create", params: {} };
      if (parts[2]) return { route: "account-detail", params: { id: parts[2] } };
    }
    if (parts[1] === "mail") {
      if (parts[2] === "folders") return { route: "folders", params: {} };
      if (parts[2] === "messages") return { route: "messages", params: {} };
      if (parts[2] === "message" && parts[3]) return { route: "message", params: { id: parts[3] } };
      if (parts[2] === "search") return { route: "search", params: {} };
      if (parts[2] === "send") return { route: "send", params: {} };
      if (parts[2] === "draft") {
        if (parts[3]) return { route: "draft-detail", params: { id: parts[3] } };
        return { route: "draft", params: {} };
      }
      if (parts[2] === "action") return { route: "action", params: {} };
    }
    if (parts[1] === "oauth") {
      if (parts[2] === "token") return { route: "oauth-token", params: {} };
      if (parts[2] === "authorize") return { route: "oauth-authorize", params: {} };
      if (parts[2] === "revoke") return { route: "oauth-revoke", params: {} };
    }
  }

  return { route: "not-found", params: {} };
}

// OAuth Token Exchange Handler
async function handleTokenExchange(req: Request) {
  let formData: FormData;
  let grantType: string;
  let clientId: string;
  let clientSecret: string;

  // Try to parse body as form data or JSON
  const contentType = req.headers.get("content-type") || "";
  
  if (contentType.includes("application/json")) {
    const body = await req.json();
    grantType = body.grant_type;
    clientId = body.client_id;
    clientSecret = body.client_secret;
    formData = new FormData();
    Object.entries(body).forEach(([key, value]) => {
      if (value) formData.append(key, String(value));
    });
  } else {
    formData = await req.formData();
    grantType = formData.get("grant_type") as string;
    clientId = formData.get("client_id") as string;
    clientSecret = formData.get("client_secret") as string;
  }

  console.log("[Token Exchange] Received request:", {
    grantType,
    clientId,
    hasClientSecret: !!clientSecret,
    clientSecretLength: clientSecret?.length,
  });

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Validate client credentials
  const { data: app, error: appError } = await supabase
    .from("oauth_applications")
    .select("*")
    .eq("client_id", clientId)
    .eq("client_secret", clientSecret)
    .maybeSingle();

  if (appError || !app) {
    console.error("[Token Exchange] Client validation failed:", {
      clientId,
      appError,
      hasApp: !!app,
    });
    return errorResponse("Invalid client credentials", 401, "invalid_client");
  }

  if (grantType === "authorization_code") {
    const code = formData.get("code") as string;
    const redirectUri = formData.get("redirect_uri") as string;

    // Validate authorization code
    const { data: authCode, error: codeError } = await supabase
      .from("oauth_authorization_codes")
      .select("*")
      .eq("code", code)
      .eq("application_id", app.id)
      .eq("redirect_uri", redirectUri)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (codeError || !authCode) {
      return errorResponse("Invalid or expired authorization code", 400, "invalid_grant");
    }

    // Mark code as used
    await supabase
      .from("oauth_authorization_codes")
      .update({ used: true })
      .eq("id", authCode.id);

    // Create access token
    const { data: token, error: tokenError } = await supabase
      .from("oauth_tokens")
      .insert({
        application_id: app.id,
        user_id: authCode.user_id,
        email_address_id: authCode.email_address_id,
        scopes: authCode.scopes,
      })
      .select()
      .single();

    if (tokenError) {
      console.error("Token creation error:", tokenError);
      return errorResponse("Failed to create token", 500, "server_error");
    }

    return jsonResponse({
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      token_type: "Bearer",
      expires_in: 3600,
      scope: token.scopes.join(" "),
    });
  }

  if (grantType === "refresh_token") {
    const refreshToken = formData.get("refresh_token") as string;

    // Validate refresh token
    const { data: oldToken, error: oldTokenError } = await supabase
      .from("oauth_tokens")
      .select("*")
      .eq("refresh_token", refreshToken)
      .eq("application_id", app.id)
      .eq("revoked", false)
      .gt("refresh_expires_at", new Date().toISOString())
      .maybeSingle();

    if (oldTokenError || !oldToken) {
      return errorResponse("Invalid or expired refresh token", 400, "invalid_grant");
    }

    // Revoke old token
    await supabase
      .from("oauth_tokens")
      .update({ revoked: true })
      .eq("id", oldToken.id);

    // Create new token
    const { data: newToken, error: newTokenError } = await supabase
      .from("oauth_tokens")
      .insert({
        application_id: app.id,
        user_id: oldToken.user_id,
        email_address_id: oldToken.email_address_id,
        scopes: oldToken.scopes,
      })
      .select()
      .single();

    if (newTokenError) {
      return errorResponse("Failed to create token", 500, "server_error");
    }

    return jsonResponse({
      access_token: newToken.access_token,
      refresh_token: newToken.refresh_token,
      token_type: "Bearer",
      expires_in: 3600,
      scope: newToken.scopes.join(" "),
    });
  }

  return errorResponse("Unsupported grant type", 400, "unsupported_grant_type");
}

// Token Revocation Handler
async function handleTokenRevoke(req: Request) {
  const formData = await req.formData();
  const token = formData.get("token") as string;
  const clientId = formData.get("client_id") as string;
  const clientSecret = formData.get("client_secret") as string;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Validate client credentials
  const { data: app } = await supabase
    .from("oauth_applications")
    .select("id")
    .eq("client_id", clientId)
    .eq("client_secret", clientSecret)
    .maybeSingle();

  if (!app) {
    return errorResponse("Invalid client credentials", 401, "invalid_client");
  }

  // Revoke the token
  await supabase
    .from("oauth_tokens")
    .update({ revoked: true })
    .eq("application_id", app.id)
    .or(`access_token.eq.${token},refresh_token.eq.${token}`);

  return jsonResponse({ revoked: true });
}

// User Info Handler (GET /api/user/me) - OpenID Connect UserInfo endpoint
async function handleUserMe(context: { userId: string; emailAddressId: string; scopes: string[] }) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Base response - always include sub (user ID) for openid
  const response: Record<string, unknown> = {
    sub: context.userId,
  };

  // Get user profile if profile scope is present
  if (hasScope(context.scopes, "profile") || hasScope(context.scopes, "openid")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, created_at")
      .eq("id", context.userId)
      .single();

    if (profile) {
      response.name = profile.full_name || null;
      response.created_at = profile.created_at;
    }
  }

  // Get email if email scope is present
  if (hasScope(context.scopes, "email") || hasScope(context.scopes, "openid")) {
    const { data: primaryEmail } = await supabase
      .from("email_addresses")
      .select("id, local_part, full_email, is_primary")
      .eq("user_id", context.userId)
      .eq("is_primary", true)
      .maybeSingle();

    if (primaryEmail) {
      response.email = primaryEmail.full_email || `${primaryEmail.local_part}@afuchat.com`;
      response.email_verified = true; // AfuMail emails are verified by default
    }
  }

  // Include mailbox-specific info if read:mailbox scope is present
  if (hasScope(context.scopes, "read:mailbox")) {
    // Get all email accounts
    const { data: accounts } = await supabase
      .from("email_addresses")
      .select("id, local_part, full_email, is_primary, is_alias, created_at")
      .eq("user_id", context.userId)
      .eq("is_alias", false)
      .order("created_at");

    response.accounts = accounts?.map(acc => ({
      id: acc.id,
      email: acc.full_email || `${acc.local_part}@afuchat.com`,
      username: acc.local_part,
      is_primary: acc.is_primary,
      created_at: acc.created_at,
    })) || [];
    response.account_limit = MAX_ACCOUNTS_PER_USER;
  }

  // For backwards compatibility, include id field
  response.id = context.userId;

  return jsonResponse(response);
}

// List Accounts Handler (GET /api/accounts)
async function handleListAccounts(context: { userId: string }) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: accounts, error } = await supabase
    .from("email_addresses")
    .select("id, local_part, full_email, is_primary, is_alias, alias_for_id, created_at")
    .eq("user_id", context.userId)
    .order("is_primary", { ascending: false })
    .order("created_at");

  if (error) {
    return errorResponse("Failed to fetch accounts", 500);
  }

  const primaryAccounts = accounts?.filter(a => !a.is_alias) || [];
  const aliases = accounts?.filter(a => a.is_alias) || [];

  return jsonResponse({
    accounts: primaryAccounts.map(acc => ({
      id: acc.id,
      email: acc.full_email || `${acc.local_part}@afuchat.com`,
      username: acc.local_part,
      is_primary: acc.is_primary,
      created_at: acc.created_at,
      aliases: aliases
        .filter(alias => alias.alias_for_id === acc.id)
        .map(alias => ({
          id: alias.id,
          email: alias.full_email || `${alias.local_part}@afuchat.com`,
          username: alias.local_part,
          created_at: alias.created_at,
        })),
    })),
    total: primaryAccounts.length,
    limit: MAX_ACCOUNTS_PER_USER,
    can_create_more: primaryAccounts.length < MAX_ACCOUNTS_PER_USER,
  });
}

// Create Account Handler (POST /api/account/create)
async function handleCreateAccount(req: Request, context: { userId: string }) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Check current account count
  const { count: accountCount } = await supabase
    .from("email_addresses")
    .select("*", { count: "exact", head: true })
    .eq("user_id", context.userId)
    .eq("is_alias", false);

  if ((accountCount || 0) >= MAX_ACCOUNTS_PER_USER) {
    return errorResponse(
      `Maximum ${MAX_ACCOUNTS_PER_USER} email accounts allowed per user`,
      403,
      "account_limit_reached"
    );
  }

  // Parse request body
  let body: { preferred_username?: string; display_name?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  let username = body.preferred_username?.toLowerCase().trim();

  // Auto-generate username if not provided
  if (!username) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    username = `user${timestamp}${random}`;
  }

  // Validate username
  const validation = isValidUsername(username);
  if (!validation.valid) {
    return errorResponse(validation.error!, 400, "invalid_username");
  }

  // Check if username is available
  const { data: existing } = await supabase
    .from("email_addresses")
    .select("id")
    .eq("local_part", username)
    .maybeSingle();

  if (existing) {
    return errorResponse("This email address is already taken", 409, "username_taken");
  }

  // Create the email address
  const fullEmail = `${username}@afuchat.com`;
  const { data: newAccount, error: createError } = await supabase
    .from("email_addresses")
    .insert({
      user_id: context.userId,
      local_part: username,
      full_email: fullEmail,
      is_primary: false,
      is_alias: false,
    })
    .select()
    .single();

  if (createError) {
    console.error("Account creation error:", createError);
    return errorResponse("Failed to create email account", 500, "creation_failed");
  }

  // Create default folders for this account
  const folderTypes = [
    { name: "Inbox", type: "inbox", icon: "inbox" },
    { name: "Sent", type: "sent", icon: "send" },
    { name: "Drafts", type: "drafts", icon: "file-text" },
    { name: "Spam", type: "spam", icon: "alert-circle" },
    { name: "Trash", type: "trash", icon: "trash-2" },
  ];

  // Note: Folders are created per user, not per email address in current schema
  // If user already has folders, we skip this

  // Update profile display name if provided
  if (body.display_name) {
    await supabase
      .from("profiles")
      .update({ full_name: body.display_name })
      .eq("id", context.userId);
  }

  // Create user settings for this email address
  await supabase
    .from("user_settings")
    .insert({
      user_id: context.userId,
      email_address_id: newAccount.id,
    });

  return jsonResponse({
    success: true,
    account: {
      id: newAccount.id,
      email: fullEmail,
      username: username,
      display_name: body.display_name || null,
      is_primary: false,
      created_at: newAccount.created_at,
    },
  }, 201);
}

// Delete Account Handler (DELETE /api/account/{id})
async function handleDeleteAccount(accountId: string, context: { userId: string }) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Verify account belongs to user and is not primary
  const { data: account, error } = await supabase
    .from("email_addresses")
    .select("id, is_primary, is_alias")
    .eq("id", accountId)
    .eq("user_id", context.userId)
    .maybeSingle();

  if (error || !account) {
    return errorResponse("Account not found", 404, "account_not_found");
  }

  if (account.is_primary) {
    return errorResponse("Cannot delete primary email account", 403, "cannot_delete_primary");
  }

  // Delete associated aliases first
  if (!account.is_alias) {
    await supabase
      .from("email_addresses")
      .delete()
      .eq("alias_for_id", accountId);
  }

  // Delete user settings for this email address
  await supabase
    .from("user_settings")
    .delete()
    .eq("email_address_id", accountId);

  // Delete push subscriptions for this email address
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("email_address_id", accountId);

  // Delete the account
  const { error: deleteError } = await supabase
    .from("email_addresses")
    .delete()
    .eq("id", accountId);

  if (deleteError) {
    console.error("Account deletion error:", deleteError);
    return errorResponse("Failed to delete account", 500, "deletion_failed");
  }

  return jsonResponse({ success: true, deleted: accountId });
}

// Mailbox Handler
async function handleMailbox(context: { userId: string; emailAddressId: string }) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: emailAddress, error } = await supabase
    .from("email_addresses")
    .select("local_part, full_email")
    .eq("id", context.emailAddressId)
    .single();

  if (error) {
    return errorResponse("Mailbox not found", 404);
  }

  // Get email count for storage estimation
  const { count } = await supabase
    .from("emails")
    .select("*", { count: "exact", head: true })
    .eq("email_address_id", context.emailAddressId);

  return jsonResponse({
    email_address: emailAddress.full_email || `${emailAddress.local_part}@afuchat.com`,
    storage_used: (count || 0) * 5000, // Estimate ~5KB per email
    storage_limit: 15 * 1024 * 1024 * 1024, // 15GB
  });
}

// Folders Handler
async function handleFolders(context: { userId: string }) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: folders, error } = await supabase
    .from("folders")
    .select("id, name, type, icon, color")
    .eq("user_id", context.userId)
    .order("created_at");

  if (error) {
    return errorResponse("Failed to fetch folders", 500);
  }

  // Get unread count for each folder
  const foldersWithCount = await Promise.all(
    folders.map(async (folder) => {
      const { count } = await supabase
        .from("emails")
        .select("*", { count: "exact", head: true })
        .eq("folder_id", folder.id)
        .eq("is_read", false);

      return {
        ...folder,
        unread_count: count || 0,
      };
    })
  );

  return jsonResponse({ folders: foldersWithCount });
}

// Messages List Handler
async function handleMessages(
  url: URL,
  context: { userId: string; emailAddressId: string }
) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const folderId = url.searchParams.get("folder");
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
  const offset = (page - 1) * limit;

  let query = supabase
    .from("emails")
    .select("id, from_address, subject, body_text, is_read, is_starred, is_important, received_at, sent_at, thread_id, attachments", { count: "exact" })
    .eq("user_id", context.userId)
    .is("deleted_at", null)
    .order("received_at", { ascending: false, nullsFirst: false })
    .order("sent_at", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (folderId) {
    query = query.eq("folder_id", folderId);
  }

  const { data: emails, count, error } = await query;

  if (error) {
    console.error("Messages fetch error:", error);
    return errorResponse("Failed to fetch messages", 500);
  }

  const messages = emails?.map((email) => ({
    id: email.id,
    from: email.from_address,
    subject: email.subject,
    preview: email.body_text?.substring(0, 150) || "",
    timestamp: email.received_at || email.sent_at,
    read_status: email.is_read,
    is_starred: email.is_starred,
    is_important: email.is_important,
    thread_id: email.thread_id,
    has_attachments: Array.isArray(email.attachments) && email.attachments.length > 0,
  }));

  return jsonResponse({
    messages,
    pagination: {
      page,
      limit,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / limit),
    },
  });
}

// Single Message Handler
async function handleMessage(
  messageId: string,
  context: { userId: string }
) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: email, error } = await supabase
    .from("emails")
    .select("*")
    .eq("id", messageId)
    .eq("user_id", context.userId)
    .maybeSingle();

  if (error || !email) {
    return errorResponse("Message not found", 404);
  }

  // Mark as read
  await supabase
    .from("emails")
    .update({ is_read: true })
    .eq("id", messageId);

  return jsonResponse({
    id: email.id,
    from: email.from_address,
    to: email.to_addresses,
    cc: email.cc_addresses || [],
    bcc: email.bcc_addresses || [],
    subject: email.subject,
    body_text: email.body_text,
    body_html: email.body_html,
    attachments: email.attachments || [],
    timestamp: email.received_at || email.sent_at,
    is_read: true,
    is_starred: email.is_starred,
    is_important: email.is_important,
    thread_id: email.thread_id,
    folder_id: email.folder_id,
  });
}

// Search Handler
async function handleSearch(
  url: URL,
  context: { userId: string }
) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const keyword = url.searchParams.get("keyword") || "";
  const sender = url.searchParams.get("sender");
  const dateFrom = url.searchParams.get("date_from");
  const dateTo = url.searchParams.get("date_to");
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
  const offset = (page - 1) * limit;

  let query = supabase
    .from("emails")
    .select("id, from_address, subject, body_text, is_read, is_starred, received_at, sent_at", { count: "exact" })
    .eq("user_id", context.userId)
    .is("deleted_at", null);

  if (keyword) {
    query = query.or(`subject.ilike.%${keyword}%,body_text.ilike.%${keyword}%,from_address.ilike.%${keyword}%`);
  }

  if (sender) {
    query = query.ilike("from_address", `%${sender}%`);
  }

  if (dateFrom) {
    query = query.gte("received_at", dateFrom);
  }

  if (dateTo) {
    query = query.lte("received_at", dateTo);
  }

  const { data: emails, count, error } = await query
    .order("received_at", { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return errorResponse("Search failed", 500);
  }

  const results = emails?.map((email) => ({
    id: email.id,
    from: email.from_address,
    subject: email.subject,
    preview: email.body_text?.substring(0, 150) || "",
    timestamp: email.received_at || email.sent_at,
    read_status: email.is_read,
    is_starred: email.is_starred,
  }));

  return jsonResponse({
    results,
    pagination: {
      page,
      limit,
      total: count || 0,
      total_pages: Math.ceil((count || 0) / limit),
    },
  });
}

// Send Email Handler (POST /api/mail/send)
async function handleSendEmail(
  req: Request,
  context: { userId: string; emailAddressId: string }
) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let body: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body_text?: string;
    body_html?: string;
    reply_to_message_id?: string;
  };

  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid request body", 400);
  }

  // Validate required fields
  if (!body.to || !Array.isArray(body.to) || body.to.length === 0) {
    return errorResponse("At least one recipient is required", 400, "missing_recipients");
  }

  if (!body.subject) {
    return errorResponse("Subject is required", 400, "missing_subject");
  }

  // Get sender's email address
  const { data: senderEmail } = await supabase
    .from("email_addresses")
    .select("local_part, full_email")
    .eq("id", context.emailAddressId)
    .single();

  if (!senderEmail) {
    return errorResponse("Sender email not found", 404);
  }

  const fromAddress = senderEmail.full_email || `${senderEmail.local_part}@afuchat.com`;

  // Get sent folder
  const { data: sentFolder } = await supabase
    .from("folders")
    .select("id")
    .eq("user_id", context.userId)
    .eq("type", "sent")
    .maybeSingle();

  // Determine thread_id if this is a reply
  let threadId = null;
  if (body.reply_to_message_id) {
    const { data: originalEmail } = await supabase
      .from("emails")
      .select("thread_id, id")
      .eq("id", body.reply_to_message_id)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (originalEmail) {
      threadId = originalEmail.thread_id || originalEmail.id;
    }
  }

  // Create the email record
  const { data: email, error: emailError } = await supabase
    .from("emails")
    .insert({
      user_id: context.userId,
      email_address_id: context.emailAddressId,
      folder_id: sentFolder?.id,
      from_address: fromAddress,
      to_addresses: body.to,
      cc_addresses: body.cc || [],
      bcc_addresses: body.bcc || [],
      subject: body.subject,
      body_text: body.body_text || "",
      body_html: body.body_html || "",
      is_read: true,
      is_draft: false,
      sent_at: new Date().toISOString(),
      thread_id: threadId,
    })
    .select()
    .single();

  if (emailError) {
    console.error("Send email error:", emailError);
    return errorResponse("Failed to send email", 500, "send_failed");
  }

  // TODO: Actually send the email via Resend or other provider
  // For now, we just store it in the database

  return jsonResponse({
    success: true,
    message_id: email.id,
    from: fromAddress,
    to: body.to,
    subject: body.subject,
    sent_at: email.sent_at,
  }, 201);
}

// Create Draft Handler (POST /api/mail/draft)
async function handleCreateDraft(
  req: Request,
  context: { userId: string; emailAddressId: string }
) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let body: {
    to?: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    body_text?: string;
    body_html?: string;
    reply_to_message_id?: string;
  };

  try {
    body = await req.json();
  } catch {
    body = {};
  }

  // Get sender's email address
  const { data: senderEmail } = await supabase
    .from("email_addresses")
    .select("local_part, full_email")
    .eq("id", context.emailAddressId)
    .single();

  if (!senderEmail) {
    return errorResponse("Sender email not found", 404);
  }

  const fromAddress = senderEmail.full_email || `${senderEmail.local_part}@afuchat.com`;

  // Get drafts folder
  const { data: draftsFolder } = await supabase
    .from("folders")
    .select("id")
    .eq("user_id", context.userId)
    .eq("type", "drafts")
    .maybeSingle();

  // Determine thread_id if this is a reply
  let threadId = null;
  if (body.reply_to_message_id) {
    const { data: originalEmail } = await supabase
      .from("emails")
      .select("thread_id, id")
      .eq("id", body.reply_to_message_id)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (originalEmail) {
      threadId = originalEmail.thread_id || originalEmail.id;
    }
  }

  // Create the draft
  const { data: draft, error: draftError } = await supabase
    .from("emails")
    .insert({
      user_id: context.userId,
      email_address_id: context.emailAddressId,
      folder_id: draftsFolder?.id,
      from_address: fromAddress,
      to_addresses: body.to || [],
      cc_addresses: body.cc || [],
      bcc_addresses: body.bcc || [],
      subject: body.subject || "",
      body_text: body.body_text || "",
      body_html: body.body_html || "",
      is_read: true,
      is_draft: true,
      thread_id: threadId,
    })
    .select()
    .single();

  if (draftError) {
    console.error("Create draft error:", draftError);
    return errorResponse("Failed to create draft", 500, "draft_creation_failed");
  }

  return jsonResponse({
    success: true,
    draft: {
      id: draft.id,
      from: fromAddress,
      to: draft.to_addresses,
      cc: draft.cc_addresses,
      bcc: draft.bcc_addresses,
      subject: draft.subject,
      body_text: draft.body_text,
      body_html: draft.body_html,
      created_at: draft.created_at,
    },
  }, 201);
}

// Update Draft Handler (PUT /api/mail/draft/{id})
async function handleUpdateDraft(
  req: Request,
  draftId: string,
  context: { userId: string }
) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Verify draft exists and belongs to user
  const { data: existingDraft } = await supabase
    .from("emails")
    .select("id, is_draft")
    .eq("id", draftId)
    .eq("user_id", context.userId)
    .eq("is_draft", true)
    .maybeSingle();

  if (!existingDraft) {
    return errorResponse("Draft not found", 404, "draft_not_found");
  }

  let body: {
    to?: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    body_text?: string;
    body_html?: string;
  };

  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid request body", 400);
  }

  // Update the draft
  const updateData: Record<string, unknown> = {};
  if (body.to !== undefined) updateData.to_addresses = body.to;
  if (body.cc !== undefined) updateData.cc_addresses = body.cc;
  if (body.bcc !== undefined) updateData.bcc_addresses = body.bcc;
  if (body.subject !== undefined) updateData.subject = body.subject;
  if (body.body_text !== undefined) updateData.body_text = body.body_text;
  if (body.body_html !== undefined) updateData.body_html = body.body_html;

  const { data: updatedDraft, error: updateError } = await supabase
    .from("emails")
    .update(updateData)
    .eq("id", draftId)
    .select()
    .single();

  if (updateError) {
    console.error("Update draft error:", updateError);
    return errorResponse("Failed to update draft", 500, "draft_update_failed");
  }

  return jsonResponse({
    success: true,
    draft: {
      id: updatedDraft.id,
      from: updatedDraft.from_address,
      to: updatedDraft.to_addresses,
      cc: updatedDraft.cc_addresses,
      bcc: updatedDraft.bcc_addresses,
      subject: updatedDraft.subject,
      body_text: updatedDraft.body_text,
      body_html: updatedDraft.body_html,
      updated_at: new Date().toISOString(),
    },
  });
}

// Delete Draft Handler (DELETE /api/mail/draft/{id})
async function handleDeleteDraft(
  draftId: string,
  context: { userId: string }
) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Verify draft exists and belongs to user
  const { data: existingDraft } = await supabase
    .from("emails")
    .select("id, is_draft")
    .eq("id", draftId)
    .eq("user_id", context.userId)
    .eq("is_draft", true)
    .maybeSingle();

  if (!existingDraft) {
    return errorResponse("Draft not found", 404, "draft_not_found");
  }

  // Delete the draft
  const { error: deleteError } = await supabase
    .from("emails")
    .delete()
    .eq("id", draftId);

  if (deleteError) {
    console.error("Delete draft error:", deleteError);
    return errorResponse("Failed to delete draft", 500, "draft_deletion_failed");
  }

  return jsonResponse({ success: true, deleted: draftId });
}

// Email Action Handler (POST /api/mail/action)
async function handleEmailAction(
  req: Request,
  context: { userId: string }
) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let body: {
    action: "mark_read" | "mark_unread" | "star" | "unstar" | "move" | "delete" | "restore" | "mark_important" | "mark_not_important";
    message_ids: string[];
    folder_id?: string; // Required for "move" action
  };

  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid request body", 400);
  }

  if (!body.action) {
    return errorResponse("Action is required", 400, "missing_action");
  }

  if (!body.message_ids || !Array.isArray(body.message_ids) || body.message_ids.length === 0) {
    return errorResponse("At least one message_id is required", 400, "missing_message_ids");
  }

  // Verify all messages belong to user
  const { data: existingEmails, error: fetchError } = await supabase
    .from("emails")
    .select("id, folder_id")
    .eq("user_id", context.userId)
    .in("id", body.message_ids);

  if (fetchError) {
    return errorResponse("Failed to fetch messages", 500);
  }

  const validIds = existingEmails?.map(e => e.id) || [];
  if (validIds.length !== body.message_ids.length) {
    return errorResponse("Some messages not found or access denied", 404, "messages_not_found");
  }

  let updateData: Record<string, unknown> = {};
  let affectedCount = 0;

  switch (body.action) {
    case "mark_read":
      updateData = { is_read: true };
      break;

    case "mark_unread":
      updateData = { is_read: false };
      break;

    case "star":
      updateData = { is_starred: true };
      break;

    case "unstar":
      updateData = { is_starred: false };
      break;

    case "mark_important":
      updateData = { is_important: true };
      break;

    case "mark_not_important":
      updateData = { is_important: false };
      break;

    case "move":
      if (!body.folder_id) {
        return errorResponse("folder_id is required for move action", 400, "missing_folder_id");
      }
      // Verify folder exists and belongs to user
      const { data: targetFolder } = await supabase
        .from("folders")
        .select("id")
        .eq("id", body.folder_id)
        .eq("user_id", context.userId)
        .maybeSingle();

      if (!targetFolder) {
        return errorResponse("Target folder not found", 404, "folder_not_found");
      }
      updateData = { folder_id: body.folder_id };
      break;

    case "delete":
      // Get trash folder
      const { data: trashFolder } = await supabase
        .from("folders")
        .select("id")
        .eq("user_id", context.userId)
        .eq("type", "trash")
        .maybeSingle();

      // Store original folder before moving to trash
      const originalFolders = existingEmails?.reduce((acc, e) => {
        acc[e.id] = e.folder_id;
        return acc;
      }, {} as Record<string, string>);

      // Move to trash and set deleted_at
      for (const emailId of body.message_ids) {
        await supabase
          .from("emails")
          .update({
            folder_id: trashFolder?.id,
            original_folder_id: originalFolders?.[emailId],
            deleted_at: new Date().toISOString(),
          })
          .eq("id", emailId);
        affectedCount++;
      }

      return jsonResponse({
        success: true,
        action: body.action,
        affected_count: affectedCount,
        message_ids: body.message_ids,
      });

    case "restore":
      // Restore from trash to original folder
      for (const email of existingEmails || []) {
        const { data: emailData } = await supabase
          .from("emails")
          .select("original_folder_id")
          .eq("id", email.id)
          .single();

        // Get inbox as fallback
        const { data: inboxFolder } = await supabase
          .from("folders")
          .select("id")
          .eq("user_id", context.userId)
          .eq("type", "inbox")
          .maybeSingle();

        await supabase
          .from("emails")
          .update({
            folder_id: emailData?.original_folder_id || inboxFolder?.id,
            original_folder_id: null,
            deleted_at: null,
          })
          .eq("id", email.id);
        affectedCount++;
      }

      return jsonResponse({
        success: true,
        action: body.action,
        affected_count: affectedCount,
        message_ids: body.message_ids,
      });

    default:
      return errorResponse(`Unknown action: ${body.action}`, 400, "unknown_action");
  }

  // Apply update to all messages
  const { error: updateError } = await supabase
    .from("emails")
    .update(updateData)
    .in("id", body.message_ids);

  if (updateError) {
    console.error("Email action error:", updateError);
    return errorResponse("Failed to perform action", 500, "action_failed");
  }

  return jsonResponse({
    success: true,
    action: body.action,
    affected_count: body.message_ids.length,
    message_ids: body.message_ids,
  });
}

// Main handler
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const { route, params } = parsePath(url);

  console.log(`[AfuMail API] ${req.method} ${route}`, { params });

  try {
    // OAuth endpoints (no token required)
    if (route === "oauth-token" && req.method === "POST") {
      return await handleTokenExchange(req);
    }

    if (route === "oauth-revoke" && req.method === "POST") {
      return await handleTokenRevoke(req);
    }

    if (route === "oauth-authorize") {
      // Return OAuth configuration info
      const clientId = url.searchParams.get("client_id");
      const redirectUri = url.searchParams.get("redirect_uri");
      const scope = url.searchParams.get("scope") || "read:mailbox read:messages";
      const state = url.searchParams.get("state");

      return jsonResponse({
        authorization_url: `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/auth?oauth=true&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri || '')}&scope=${encodeURIComponent(scope)}&state=${state || ''}`,
        required_params: ["client_id", "redirect_uri", "response_type", "scope"],
        optional_params: ["state"],
        supported_scopes: ["openid", "profile", "email", "read:mailbox", "read:messages", "read:folders", "search", "write:messages", "write:drafts"],
        note: "Redirect users to authorization_url to begin OAuth flow",
      });
    }

    // Protected endpoints - require valid token
    const context = await validateToken(req);
    if (!context) {
      return errorResponse("Invalid or expired access token", 401, "invalid_token");
    }

    // Route handlers
    switch (route) {
      // User & Account endpoints
      case "user-me":
        return await handleUserMe(context);

      case "accounts":
        if (req.method === "GET") {
          return await handleListAccounts(context);
        }
        return errorResponse("Method not allowed", 405);

      case "account-create":
        if (req.method === "POST") {
          if (!hasScope(context.scopes, "write:account") && !hasScope(context.scopes, "*")) {
            // Allow account creation with basic scopes for now
          }
          return await handleCreateAccount(req, context);
        }
        return errorResponse("Method not allowed", 405);

      case "account-detail":
        if (req.method === "DELETE") {
          return await handleDeleteAccount(params.id, context);
        }
        return errorResponse("Method not allowed", 405);

      // Mailbox endpoints
      case "mailbox":
        if (!hasScope(context.scopes, "read:mailbox")) {
          return errorResponse("Insufficient scope", 403, "insufficient_scope");
        }
        return await handleMailbox(context);

      case "folders":
        if (!hasScope(context.scopes, "read:mailbox")) {
          return errorResponse("Insufficient scope", 403, "insufficient_scope");
        }
        return await handleFolders(context);

      case "messages":
        if (!hasScope(context.scopes, "read:messages")) {
          return errorResponse("Insufficient scope", 403, "insufficient_scope");
        }
        return await handleMessages(url, context);

      case "message":
        if (!hasScope(context.scopes, "read:messages")) {
          return errorResponse("Insufficient scope", 403, "insufficient_scope");
        }
        return await handleMessage(params.id, context);

      case "search":
        if (!hasScope(context.scopes, "read:messages")) {
          return errorResponse("Insufficient scope", 403, "insufficient_scope");
        }
        return await handleSearch(url, context);

      // Write endpoints
      case "send":
        if (req.method === "POST") {
          if (!hasScope(context.scopes, "write:messages")) {
            return errorResponse("Insufficient scope", 403, "insufficient_scope");
          }
          return await handleSendEmail(req, context);
        }
        return errorResponse("Method not allowed", 405);

      case "draft":
        if (req.method === "POST") {
          if (!hasScope(context.scopes, "write:drafts")) {
            return errorResponse("Insufficient scope", 403, "insufficient_scope");
          }
          return await handleCreateDraft(req, context);
        }
        return errorResponse("Method not allowed", 405);

      case "draft-detail":
        if (!hasScope(context.scopes, "write:drafts")) {
          return errorResponse("Insufficient scope", 403, "insufficient_scope");
        }
        if (req.method === "PUT") {
          return await handleUpdateDraft(req, params.id, context);
        }
        if (req.method === "DELETE") {
          return await handleDeleteDraft(params.id, context);
        }
        return errorResponse("Method not allowed", 405);

      case "action":
        if (req.method === "POST") {
          if (!hasScope(context.scopes, "write:messages")) {
            return errorResponse("Insufficient scope", 403, "insufficient_scope");
          }
          return await handleEmailAction(req, context);
        }
        return errorResponse("Method not allowed", 405);

      default:
        return errorResponse("Not found", 404, "not_found");
    }
  } catch (error) {
    console.error("[AfuMail API] Error:", error);
    return errorResponse("Internal server error", 500, "server_error");
  }
});

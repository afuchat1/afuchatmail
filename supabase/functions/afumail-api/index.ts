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
  const pathname = url.pathname.replace("/afumail-api", "");
  const parts = pathname.split("/").filter(Boolean);

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
  const formData = await req.formData();
  const grantType = formData.get("grant_type") as string;
  const clientId = formData.get("client_id") as string;
  const clientSecret = formData.get("client_secret") as string;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Validate client credentials
  const { data: app, error: appError } = await supabase
    .from("oauth_applications")
    .select("*")
    .eq("client_id", clientId)
    .eq("client_secret", clientSecret)
    .maybeSingle();

  if (appError || !app) {
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

// User Info Handler (GET /api/user/me)
async function handleUserMe(context: { userId: string; emailAddressId: string }) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, created_at")
    .eq("id", context.userId)
    .single();

  // Get primary email address
  const { data: primaryEmail } = await supabase
    .from("email_addresses")
    .select("id, local_part, full_email, is_primary")
    .eq("user_id", context.userId)
    .eq("is_primary", true)
    .maybeSingle();

  // Get all email accounts
  const { data: accounts } = await supabase
    .from("email_addresses")
    .select("id, local_part, full_email, is_primary, is_alias, created_at")
    .eq("user_id", context.userId)
    .eq("is_alias", false)
    .order("created_at");

  return jsonResponse({
    id: context.userId,
    email: primaryEmail?.full_email || `${primaryEmail?.local_part}@afuchat.com`,
    name: profile?.full_name || null,
    avatar: null, // Could be extended to include avatar_url
    created_at: profile?.created_at,
    accounts: accounts?.map(acc => ({
      id: acc.id,
      email: acc.full_email || `${acc.local_part}@afuchat.com`,
      username: acc.local_part,
      is_primary: acc.is_primary,
      created_at: acc.created_at,
    })) || [],
    account_limit: MAX_ACCOUNTS_PER_USER,
  });
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
        supported_scopes: ["read:mailbox", "read:messages", "write:messages", "write:drafts"],
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

      default:
        return errorResponse("Not found", 404, "not_found");
    }
  } catch (error) {
    console.error("[AfuMail API] Error:", error);
    return errorResponse("Internal server error", 500, "server_error");
  }
});

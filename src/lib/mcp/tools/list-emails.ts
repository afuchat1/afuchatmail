import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_emails",
  title: "List emails",
  description:
    "List the signed-in user's emails, newest first. Optionally filter by unread, starred, or a search term matching subject or sender.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(20).describe("How many emails to return (max 50)."),
    unread_only: z.boolean().default(false).describe("Only return unread emails."),
    starred_only: z.boolean().default(false).describe("Only return starred emails."),
    search: z.string().trim().min(1).optional().describe("Match against subject or sender address."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, unread_only, starred_only, search }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("emails")
      .select(
        "id, subject, from_address, to_addresses, is_read, is_starred, is_draft, received_at, sent_at, created_at",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (unread_only) query = query.eq("is_read", false);
    if (starred_only) query = query.eq("is_starred", true);
    if (search) query = query.or(`subject.ilike.%${search}%,from_address.ilike.%${search}%`);

    const { data, error } = await query;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { emails: data ?? [], count: data?.length ?? 0 },
    };
  },
});

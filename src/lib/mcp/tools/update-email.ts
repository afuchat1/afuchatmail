import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_email",
  title: "Update email flags",
  description:
    "Mark one of the signed-in user's emails as read/unread, starred/unstarred, or important/not important.",
  inputSchema: {
    email_id: z.string().uuid().describe("The id of the email to update."),
    is_read: z.boolean().optional().describe("Set the read state."),
    is_starred: z.boolean().optional().describe("Set the starred state."),
    is_important: z.boolean().optional().describe("Set the important state."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ email_id, is_read, is_starred, is_important }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const patch: Record<string, boolean> = {};
    if (is_read !== undefined) patch.is_read = is_read;
    if (is_starred !== undefined) patch.is_starred = is_starred;
    if (is_important !== undefined) patch.is_important = is_important;
    if (Object.keys(patch).length === 0) {
      return {
        content: [{ type: "text", text: "Provide at least one of is_read, is_starred, is_important." }],
        isError: true,
      };
    }

    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("emails")
      .update(patch)
      .eq("id", email_id)
      .select("id, subject, is_read, is_starred, is_important");

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data || data.length === 0) {
      return { content: [{ type: "text", text: "No email found with that id." }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data[0]) }],
      structuredContent: { email: data[0] },
    };
  },
});

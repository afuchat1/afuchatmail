import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_email",
  title: "Get email",
  description: "Read one of the signed-in user's emails in full, including its body text.",
  inputSchema: {
    email_id: z.string().uuid().describe("The id of the email to read."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ email_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("emails")
      .select(
        "id, subject, from_address, to_addresses, cc_addresses, reply_to, body_text, body_html, is_read, is_starred, is_draft, received_at, sent_at, created_at, thread_id",
      )
      .eq("id", email_id)
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return { content: [{ type: "text", text: "No email found with that id." }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { email: data },
    };
  },
});

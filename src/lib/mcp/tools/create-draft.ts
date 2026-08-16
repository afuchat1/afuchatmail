import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_draft",
  title: "Create draft email",
  description:
    "Create a draft email for the signed-in user. Drafts are not sent — the user reviews and sends them in the app.",
  inputSchema: {
    to: z.array(z.string().email()).min(1).describe("Recipient email addresses."),
    subject: z.string().trim().min(1).describe("Subject line."),
    body_text: z.string().trim().min(1).describe("Plain text body of the draft."),
    cc: z.array(z.string().email()).optional().describe("Optional CC recipients."),
    from_address_id: z
      .string()
      .uuid()
      .optional()
      .describe("Which of the user's addresses to send from. Defaults to the primary address."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ to, subject, body_text, cc, from_address_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);

    let addressQuery = supabase
      .from("email_addresses")
      .select("id, full_email, is_primary")
      .limit(1);
    addressQuery = from_address_id
      ? addressQuery.eq("id", from_address_id)
      : addressQuery.order("is_primary", { ascending: false });

    const { data: address, error: addressError } = await addressQuery.maybeSingle();
    if (addressError) {
      return { content: [{ type: "text", text: addressError.message }], isError: true };
    }
    if (!address?.full_email) {
      return {
        content: [{ type: "text", text: "No sending address found for this account." }],
        isError: true,
      };
    }

    const { data, error } = await supabase
      .from("emails")
      .insert({
        user_id: ctx.getUserId(),
        email_address_id: address.id,
        from_address: address.full_email,
        to_addresses: to,
        cc_addresses: cc ?? null,
        subject,
        body_text,
        is_draft: true,
        is_read: true,
      })
      .select("id, subject, from_address, to_addresses, is_draft");

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data?.[0] ?? {}) }],
      structuredContent: { draft: data?.[0] },
    };
  },
});

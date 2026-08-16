import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listEmailsTool from "./tools/list-emails";
import getEmailTool from "./tools/get-email";
import listAddressesTool from "./tools/list-addresses";
import updateEmailTool from "./tools/update-email";
import createDraftTool from "./tools/create-draft";
import { SUPABASE_PROJECT_ID } from "@/integrations/supabase/config";

export default defineMcp({
  name: "fucha-mail",
  title: "Fucha Mail",
  version: "0.1.0",
  instructions:
    "Tools for the Fucha Mail email account of the signed-in user. Use `list_addresses` to see their addresses, `list_emails` to browse or search mail, `get_email` to read one message in full, `update_email` to change read/starred/important flags, and `create_draft` to prepare a message the user sends from the app. Nothing here sends email on the user's behalf.",
  auth: auth.oauth.issuer({
    issuer: `https://${SUPABASE_PROJECT_ID}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listAddressesTool, listEmailsTool, getEmailTool, updateEmailTool, createDraftTool],
});

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check, ChevronDown, Mail } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmailAddress {
  id: string;
  local_part: string;
  full_email: string;
  is_primary: boolean;
}

interface EmailAddressSwitcherProps {
  selectedEmailAddressId: string | null;
  onEmailAddressChange: (emailAddressId: string) => void;
}

export const EmailAddressSwitcher = ({
  selectedEmailAddressId,
  onEmailAddressChange,
}: EmailAddressSwitcherProps) => {
  const [emailAddresses, setEmailAddresses] = useState<EmailAddress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmailAddresses();
  }, []);

  const fetchEmailAddresses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("email_addresses")
        .select("id, local_part, full_email, is_primary")
        .eq("user_id", user.id)
        .eq("is_alias", false)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      setEmailAddresses(data || []);
      if (data && data.length > 0 && !selectedEmailAddressId) {
        const savedEmailAddressId = localStorage.getItem('selectedEmailAddressId');
        if (savedEmailAddressId && data.find(e => e.id === savedEmailAddressId)) {
          onEmailAddressChange(savedEmailAddressId);
        } else {
          const primaryEmail = data.find((e) => e.is_primary) || data[0];
          onEmailAddressChange(primaryEmail.id);
        }
      }
    } catch (error) {
      console.error("Error fetching email addresses:", error);
    } finally { setLoading(false); }
  };

  const selectedEmail = emailAddresses.find((email) => email.id === selectedEmailAddressId);

  if (loading || emailAddresses.length === 0) return null;

  if (emailAddresses.length === 1) {
    return (
      <div className="px-3 py-2.5 mb-3 border border-border rounded-xl bg-card shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
            <Mail className="h-3.5 w-3.5 text-accent-foreground" />
          </div>
          <span className="text-sm font-medium truncate">{selectedEmail?.full_email}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between h-auto py-2.5 px-3 rounded-xl border-border shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="h-7 w-7 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                <Mail className="h-3.5 w-3.5 text-accent-foreground" />
              </div>
              <span className="text-sm font-medium truncate">{selectedEmail?.full_email || "Select account"}</span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[260px] max-h-[60vh] overflow-y-auto rounded-xl shadow-lg border-border">
          {emailAddresses.map((email) => (
            <DropdownMenuItem key={email.id} onClick={() => onEmailAddressChange(email.id)} className="cursor-pointer rounded-lg py-2.5">
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="h-7 w-7 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                    <Mail className="h-3.5 w-3.5 text-accent-foreground" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">{email.full_email}</span>
                    {email.is_primary && <span className="text-xs text-muted-foreground">Primary</span>}
                  </div>
                </div>
                {selectedEmailAddressId === email.id && (
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Contact {
  email: string;
  name?: string;
  avatar_url?: string;
  initial: string;
  color: string;
}

interface RecipientAutocompleteProps {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

const AVATAR_COLORS = [
  "bg-red-500", "bg-orange-500", "bg-amber-500", "bg-yellow-500",
  "bg-lime-500", "bg-green-500", "bg-emerald-500", "bg-teal-500",
  "bg-cyan-500", "bg-sky-500", "bg-blue-500", "bg-indigo-500",
  "bg-violet-500", "bg-purple-500", "bg-fuchsia-500", "bg-pink-500",
];

const colorFor = (email: string) => {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

const parseAddr = (s: string): { name?: string; email: string } => {
  const m = s.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim() || undefined, email: m[2].trim().toLowerCase() };
  return { email: s.trim().toLowerCase() };
};

export const RecipientAutocomplete = ({ id, value, onChange, placeholder }: RecipientAutocompleteProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  // Load known contacts: people we've emailed / who've emailed us, plus AfuChat users with avatars
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("emails")
          .select("from_address, from_name, to_addresses, cc_addresses")
          .eq("user_id", user.id)
          .order("received_at", { ascending: false })
          .limit(500);

        const map = new Map<string, Contact>();
        for (const row of data || []) {
          const add = (raw: string, name?: string) => {
            if (!raw) return;
            const { email, name: parsedName } = parseAddr(raw);
            if (!email || map.has(email)) return;
            const display = name || parsedName;
            map.set(email, {
              email,
              name: display,
              initial: (display || email)[0]?.toUpperCase() || "?",
              color: colorFor(email),
            });
          };
          add(row.from_address as string, (row as any).from_name as string);
          (row.to_addresses as string[] | null)?.forEach((a) => add(a));
          ((row as any).cc_addresses as string[] | null)?.forEach((a) => add(a));
        }

        // Augment with AfuChat avatars
        const emails = Array.from(map.keys());
        if (emails.length > 0) {
          const { data: addrs } = await supabase
            .from("email_addresses")
            .select("full_email, user_id")
            .in("full_email", emails);
          const userIds = Array.from(new Set((addrs || []).map((a) => a.user_id).filter(Boolean)));
          if (userIds.length > 0) {
            const { data: profs } = await supabase
              .from("profiles")
              .select("id, full_name, avatar_url")
              .in("id", userIds);
            const profById = new Map((profs || []).map((p) => [p.id, p] as const));
            for (const a of addrs || []) {
              const p = a.user_id ? profById.get(a.user_id) : undefined;
              const c = map.get((a.full_email || "").toLowerCase());
              if (c && p) {
                if (p.avatar_url) c.avatar_url = p.avatar_url;
                if (!c.name && p.full_name) c.name = p.full_name;
              }
            }
          }
        }

        if (!cancelled) setContacts(Array.from(map.values()));
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Determine the current token being typed (after the last comma)
  const { tokens, currentToken, prefix } = useMemo(() => {
    const lastComma = value.lastIndexOf(",");
    const before = lastComma >= 0 ? value.slice(0, lastComma + 1) : "";
    const cur = lastComma >= 0 ? value.slice(lastComma + 1) : value;
    return { tokens: before, currentToken: cur, prefix: cur.trim().toLowerCase() };
  }, [value]);

  const suggestions = useMemo(() => {
    if (!prefix) return [] as Contact[];
    const existing = new Set(
      tokens.split(",").map((s) => parseAddr(s).email).filter(Boolean)
    );
    return contacts
      .filter((c) => !existing.has(c.email))
      .filter((c) =>
        c.email.includes(prefix) || (c.name?.toLowerCase().includes(prefix) ?? false)
      )
      .slice(0, 6);
  }, [contacts, prefix, tokens]);

  useEffect(() => { setActiveIdx(0); }, [prefix]);

  // Close dropdown on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const choose = (c: Contact) => {
    const formatted = c.name ? `${c.name} <${c.email}>` : c.email;
    const newVal = `${tokens}${tokens && !tokens.endsWith(" ") ? " " : ""}${formatted}, `;
    onChange(newVal);
    setOpen(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => (i + 1) % suggestions.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length); }
    else if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); choose(suggestions[activeIdx]); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
          {suggestions.map((c, i) => (
            <button
              type="button"
              key={c.email}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseDown={(e) => { e.preventDefault(); choose(c); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent transition-colors",
                i === activeIdx && "bg-accent"
              )}
            >
              {c.avatar_url ? (
                <img src={c.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0", c.color)}>
                  {c.initial}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.name || c.email}</p>
                {c.name && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

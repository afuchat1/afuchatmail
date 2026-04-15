import { Link, useNavigate } from "react-router-dom";
import { Building2, ChevronDown, Code2, FileText, LifeBuoy, Lock, Mail, Menu, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const navGroups = [
  {
    label: "Product",
    items: [
      { label: "Features", description: "Professional mail tools", path: "/features", icon: Sparkles },
      { label: "Security", description: "Privacy and protection", path: "/security", icon: Shield },
      { label: "Developers", description: "OAuth apps and APIs", path: "/developers", icon: Code2 },
    ],
  },
  {
    label: "Company",
    items: [
      { label: "About", description: "Mission and values", path: "/about", icon: Building2 },
      { label: "Contact", description: "Support and inquiries", path: "/contact", icon: LifeBuoy },
    ],
  },
  {
    label: "Resources",
    items: [
      { label: "Privacy", description: "How data is handled", path: "/privacy", icon: Lock },
      { label: "Terms", description: "Service policies", path: "/terms", icon: FileText },
    ],
  },
];

export function SiteHeader() {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-3" data-testid="link-home">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Mail className="h-4 w-4" />
          </span>
          <span className="text-base font-black tracking-tight sm:text-lg">AfuChat Mail</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
          {navGroups.map((group) => (
            <DropdownMenu key={group.label}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-10 rounded-xl px-3 text-sm font-bold text-muted-foreground hover:text-foreground"
                  data-testid={`button-nav-${group.label.toLowerCase()}`}
                >
                  {group.label}
                  <ChevronDown className="ml-1 h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-72 rounded-2xl border-border bg-popover p-2 shadow-lg">
                <DropdownMenuLabel className="px-3 text-xs uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {group.items.map((item) => (
                  <DropdownMenuItem
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="flex cursor-pointer items-start gap-3 rounded-xl p-3"
                    data-testid={`link-nav-${item.label.toLowerCase()}`}
                  >
                    <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-foreground">{item.label}</span>
                      <span className="block text-xs font-medium text-muted-foreground">{item.description}</span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <Button
            variant="ghost"
            className="rounded-xl font-bold"
            onClick={() => navigate("/auth")}
            data-testid="button-sign-in"
          >
            Sign in
          </Button>
          <Button
            className="rounded-xl font-bold shadow-none"
            onClick={() => navigate("/auth")}
            data-testid="button-get-started"
          >
            Get started
          </Button>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl" data-testid="button-mobile-menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[88vw] max-w-sm p-0">
              <div className="border-b border-border p-5">
                <SheetTitle className="flex items-center gap-3 text-base font-black">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Mail className="h-4 w-4" />
                  </span>
                  AfuChat Mail
                </SheetTitle>
                <SheetDescription className="mt-2 text-sm">
                  Professional email for modern work.
                </SheetDescription>
              </div>
              <div className="space-y-5 p-5">
                {navGroups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-2 text-xs font-black uppercase tracking-wider text-muted-foreground">{group.label}</p>
                    <div className="space-y-1">
                      {group.items.map((item) => (
                        <SheetClose asChild key={item.path}>
                          <Link
                            to={item.path}
                            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold hover:bg-muted"
                            data-testid={`link-mobile-${item.label.toLowerCase()}`}
                          >
                            <item.icon className="h-4 w-4 text-primary" />
                            {item.label}
                          </Link>
                        </SheetClose>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="grid gap-2 border-t border-border pt-5">
                  <SheetClose asChild>
                    <Button variant="outline" className="h-11 rounded-xl font-bold" onClick={() => navigate("/auth")}>
                      Sign in
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button className="h-11 rounded-xl font-bold shadow-none" onClick={() => navigate("/auth")}>
                      Create account
                    </Button>
                  </SheetClose>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}